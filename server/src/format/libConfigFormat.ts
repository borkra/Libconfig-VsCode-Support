/*---------------------------------------------------------------------------------------------
 *  Copyright (c) LibConfig VS Code Support contributors.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import { FormattingOptions} from 'vscode-languageserver';
import { CreateDefaultScanner } from '../scanner/impl/generateScanner';
import { SyntaxKind } from '../dataClasses/syntaxKind';
import { ScanError } from '../dataClasses/scanError';

/** Represents a text modification */
interface Edit { offset: number; length: number; content: string; }




export function FormatLibConfigDocument(documentText: string, options: FormattingOptions): Edit[] {
	const initialIndentLevel = 0;
	const formatTextStart = 0;
	const rangeStart = 0;
	const rangeEnd = documentText.length;
	const eol = getEOL(options, documentText);

	let lineBreak = false;
	let indentLevel = 0;
	let indentValue: string;
	if (options.insertSpaces) {
		indentValue = repeat(' ', options.tabSize || 4);
	} else {
		indentValue = '\t';
	}

	const scanner = CreateDefaultScanner(documentText, false);
	let hasError = false;

	function newLineAndIndent(): string {
		return eol + repeat(indentValue, initialIndentLevel + indentLevel);
	}
	function scanNext(): SyntaxKind {
		let token = scanner.scan();
		lineBreak = false;
		while (
			token === SyntaxKind.Trivia || 
			token === SyntaxKind.LineBreakTrivia
		) {
			lineBreak = lineBreak || (token === SyntaxKind.LineBreakTrivia);
			token = scanner.scan();
		}
		hasError = token === SyntaxKind.Unknown || scanner.getTokenError() !== ScanError.None;
		return token;
	}
	const closingTokens = [
		{ close: SyntaxKind.CloseBraceToken, open: SyntaxKind.OpenBraceToken },
		{ close: SyntaxKind.CloseBracketToken, open: SyntaxKind.OpenBracketToken },
		{ close: SyntaxKind.CloseParenToken, open: SyntaxKind.OpenParenToken }
	];

	let editOperations: Edit[] = [];
	function addEdit(text: string, startOffset: number, endOffset: number) {
		if (!hasError && startOffset < rangeEnd && endOffset > rangeStart && documentText.substring(startOffset, endOffset) !== text) {
			editOperations.push({ offset: startOffset, length: endOffset - startOffset, content: text });
		}
	}

	let firstToken = scanNext();

	if (firstToken !== SyntaxKind.EOF) {
		let firstTokenStart = scanner.getTokenOffset() + formatTextStart;
		let initialIndent = repeat(indentValue, initialIndentLevel);
		addEdit(initialIndent, formatTextStart, firstTokenStart);
	}

	while (firstToken !== SyntaxKind.EOF) {
		let firstTokenEnd = scanner.getTokenOffset() + scanner.getTokenLength() + formatTextStart;
		let secondToken = scanNext();

		let replaceContent = '';
		while (!lineBreak && (secondToken === SyntaxKind.LineCommentTrivia || secondToken === SyntaxKind.BlockCommentTrivia)) {
			// comments on the same line: keep them on the same line, but ignore them otherwise
			let commentTokenStart = scanner.getTokenOffset() + formatTextStart;
			addEdit(' ', firstTokenEnd, commentTokenStart);
			firstTokenEnd = scanner.getTokenOffset() + scanner.getTokenLength() + formatTextStart;
			replaceContent = secondToken === SyntaxKind.LineCommentTrivia ? newLineAndIndent() : '';
			secondToken = scanNext();
		}

		const closingToken = closingTokens.find(t => t.close === secondToken);
		if (closingToken && firstToken !== closingToken.open) {
			indentLevel--;
			replaceContent = newLineAndIndent();
		} else if (!closingToken) {
			switch (firstToken) {
				case SyntaxKind.OpenBracketToken:
				case SyntaxKind.OpenBraceToken:
				case SyntaxKind.OpenParenToken:
					indentLevel++;
					replaceContent = newLineAndIndent();
					break;
				case SyntaxKind.CommaToken:
				case SyntaxKind.LineCommentTrivia:
				case SyntaxKind.SemicolonToken:
				case SyntaxKind.ColonToken:
					replaceContent = newLineAndIndent();
					break;
				case SyntaxKind.BlockCommentTrivia:
					if (lineBreak) {
						replaceContent = newLineAndIndent();
					} else {
						// symbol following comment on the same line: keep on same line, separate with ' '
						replaceContent = ' ';
					}
					break;
				case SyntaxKind.PropertyName:
				case SyntaxKind.EqualToken:
					replaceContent = ' ';
					break;
				case SyntaxKind.StringLiteral:
					if (secondToken === SyntaxKind.ColonToken) {
						replaceContent = '';
						break;
					}
				// fall through
				case SyntaxKind.TrueKeyword:
				case SyntaxKind.FalseKeyword:
				case SyntaxKind.NumericLiteral:
				case SyntaxKind.CloseBraceToken:
				case SyntaxKind.CloseBracketToken:
				case SyntaxKind.CloseParenToken:
					if (secondToken === SyntaxKind.LineCommentTrivia || secondToken === SyntaxKind.BlockCommentTrivia) {
						replaceContent = ' ';
					} else if (secondToken !== SyntaxKind.CommaToken && secondToken !== SyntaxKind.EOF) {
						hasError = true;
					}
					break;
				case SyntaxKind.Unknown:
					hasError = true;
					break;
			}
			if (lineBreak && (secondToken === SyntaxKind.LineCommentTrivia || secondToken === SyntaxKind.BlockCommentTrivia)) {
				replaceContent = newLineAndIndent();
			}

		}
		
		let secondTokenStart = scanner.getTokenOffset() + formatTextStart;
		addEdit(replaceContent, firstTokenEnd, secondTokenStart);
		firstToken = secondToken;
	}
	return editOperations;
}

function repeat(s: string, count: number): string {
	return s.repeat(count);
}

function getEOL(options: FormattingOptions, text: string): string {
	for (let i = 0; i < text.length; i++) {
		let ch = text.charAt(i);
		if (ch === '\r') {
			if (i + 1 < text.length && text.charAt(i + 1) === '\n') {
				return '\r\n';
			}
			return '\r';
		} else if (ch === '\n') {
			return '\n';
		}
	}
	if(options && options.eol && typeof options.eol === 'string')
		return options.eol;
	return '\n';
}