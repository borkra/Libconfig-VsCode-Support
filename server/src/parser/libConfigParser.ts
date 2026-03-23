'use strict';

import {
	Diagnostic,
	DiagnosticSeverity,
	Range
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import {
	CreateDefaultScanner
} from '../scanner/impl/generateScanner';
import {
	ScanError,
	LibConfigDocument,
	SyntaxKind,
	ErrorCode,
	LibConfigPropertyNode,
	BaseLibConfigNode,
	NumberLibConfigNodeImpl,
	LibConfigPropertyNodeImpl,
	BooleanLibConfigNodeImpl,
	StringLibConfigNodeImpl,
	ObjectLibConfigNode,
	ObjectLibConfigNodeImpl,
	ListLibConfigNode,
	ArrayLibConfigNode,
	ListLibConfigNodeImpl,
	BaseLibConfigNodeImpl,
	ScalarLibConfigNode,
	ArrayLibConfigNodeImpl
} from '../dataClasses';
import * as nls from 'vscode-nls';
import {
	LibConfigScanner
} from '../scanner/libConfigScanner';

const localize = nls.loadMessageBundle();

type ParseCacheEntry = { version: number; text: string; result: LibConfigDocument };
const parseCache = new Map<string, ParseCacheEntry>();

const scanErrorMap: Partial<Record<ScanError, { key: string; message: string; code: ErrorCode }>> = {
	[ScanError.InvalidUnicode]: {
		key: 'InvalidUnicode',
		message: 'Invalid unicode sequence in string.',
		code: ErrorCode.InvalidUnicode
	},
	[ScanError.InvalidEscapeCharacter]: {
		key: 'InvalidEscapeCharacter',
		message: 'Invalid escape character in string.',
		code: ErrorCode.InvalidEscapeCharacter
	},
	[ScanError.UnexpectedEndOfNumber]: {
		key: 'UnexpectedEndOfNumber',
		message: 'Unexpected end of number.',
		code: ErrorCode.UnexpectedEndOfNumber
	},
	[ScanError.UnexpectedEndOfComment]: {
		key: 'UnexpectedEndOfComment',
		message: 'Unexpected end of comment.',
		code: ErrorCode.UnexpectedEndOfComment
	},
	[ScanError.UnexpectedEndOfString]: {
		key: 'UnexpectedEndOfString',
		message: 'Unexpected end of string.',
		code: ErrorCode.UnexpectedEndOfString
	},
	[ScanError.InvalidCharacter]: {
		key: 'InvalidCharacter',
		message: 'Invalid characters in string. Control characters must be escaped.',
		code: ErrorCode.InvalidCharacter
	}
};

export function clearParseCacheForUri(uri: string): void {
	parseCache.delete(uri);
}

export function ParseLibConfigDocument(textDocument: TextDocument): LibConfigDocument {
	const text = textDocument.getText();
	const cached = parseCache.get(textDocument.uri);
	if (cached && cached.version === textDocument.version && cached.text === text) {
		return cached.result;
	}

	let problems: Diagnostic[] = [];
	let lastProblemOffset: number = -1;
	let scanner: LibConfigScanner = CreateDefaultScanner(text, false);
	let rootSettings: LibConfigPropertyNode[] = [];
	let hasBufferedToken: boolean = false;

	function _scanNext(): SyntaxKind {
		while (true) {
			let token = scanner.scan();
			_checkScanError();
			switch (token) {
				case SyntaxKind.LineCommentTrivia:
				case SyntaxKind.BlockCommentTrivia:
					break;
				case SyntaxKind.Trivia:
				case SyntaxKind.LineBreakTrivia:
					break;
				default:
					return token;
			}
		}
	}

	function _takeBufferedOrScanNext(): SyntaxKind {
		if (hasBufferedToken) {
			hasBufferedToken = false;
			return scanner.getToken();
		}
		return _scanNext();
	}

	function _parseConcatenatedString(parent: LibConfigPropertyNode | ArrayLibConfigNode | ListLibConfigNode): StringLibConfigNodeImpl {
		const startOffset = scanner.getTokenOffset();
		let value = scanner.getTokenValue();
		let endOffset = scanner.getTokenOffset() + scanner.getTokenLength();

		while (true) {
			const tok = _scanNext();
			if (tok !== SyntaxKind.StringLiteral) {
				hasBufferedToken = true;
				break;
			}
			value += scanner.getTokenValue();
			endOffset = scanner.getTokenOffset() + scanner.getTokenLength();
		}

		return new StringLibConfigNodeImpl(
			parent,
			startOffset,
			endOffset - startOffset,
			value
		);
	}

	function _parseIncludeDirective(): void {
		const includeToken = _scanNext();
		if (includeToken !== SyntaxKind.StringLiteral) {
			_error(
				localize('ExpectedIncludePath', 'Expected a quoted include path after @include'),
				ErrorCode.ValueExpected,
				[SyntaxKind.SemicolonToken]
			);
			return;
		}

		_scanNext();
	}

	function _parseSetting(
		parent: ObjectLibConfigNode | LibConfigPropertyNode | null) : LibConfigPropertyNode | undefined {
		if (scanner.getToken() !== SyntaxKind.PropertyName) {
			_error(
				localize('ExpectedProperty', "Expected a property value name"),
				ErrorCode.PropertyExpected,
				[SyntaxKind.SemicolonToken]);
			return;
		}

		let setting = new LibConfigPropertyNodeImpl(
			parent,
			scanner.getTokenOffset(),
			0,
			scanner.getTokenValue(),
			null
		);
		let token = _scanNext();
		if (token !== SyntaxKind.EqualToken && token !== SyntaxKind.ColonToken) {
			_error(
				localize('ExpectedSetter', 'Expected a colon or equal'),
				ErrorCode.ColonExpected,
				[SyntaxKind.SemicolonToken]
			);
			setting.length = scanner.getPosition() - setting.offset;
			return setting;
		}
		setting.value = _parseValue(setting);
		setting.length = scanner.getPosition() - setting.offset;
		_parseTerminator();

		return setting;
	}

	function _parseValue(
		parent: LibConfigPropertyNode | ListLibConfigNode,
		scan: boolean = true
	):
		BaseLibConfigNode | null {
		let token = scan ? _scanNext() : scanner.getToken();
		switch (token) {
			case SyntaxKind.OpenBraceToken:
				// Parse Group
				return _parseGroup(parent);
			case SyntaxKind.OpenParenToken:
				// Parse List
				return _parseList(parent);
			case SyntaxKind.OpenBracketToken:
				// Parse Array
				return _parseArray(parent);
			case SyntaxKind.NumericLiteral:
				return new NumberLibConfigNodeImpl(
					parent,
					scanner.getTokenOffset(),
					scanner.getTokenLength(),
					_parseNumericLiteral(scanner.getTokenValue())
				);
			case SyntaxKind.TrueKeyword:
			case SyntaxKind.FalseKeyword:
				return new BooleanLibConfigNodeImpl(
					parent,
					scanner.getTokenOffset(),
					scanner.getTokenLength(),
					scanner.getTokenValue().toLowerCase() === 'true'
				);
			case SyntaxKind.StringLiteral:
				return _parseConcatenatedString(parent);
			default:
				_error(
					localize('UnrecognizedType', 'Expected setting type kind value'),
					ErrorCode.ValueExpected,
					[],
					[SyntaxKind.SemicolonToken]
				);
				return null;
		}
	}

	function _parseScalarValue(
		parent: LibConfigPropertyNode | ArrayLibConfigNode,
		scan: boolean = true
	):
		ScalarLibConfigNode | undefined {
		let token = scan ? _scanNext() : scanner.getToken();
		switch (token) {
			case SyntaxKind.NumericLiteral:
				return new NumberLibConfigNodeImpl(
					parent,
					scanner.getTokenOffset(),
					scanner.getTokenLength(),
					_parseNumericLiteral(scanner.getTokenValue())
				);
			case SyntaxKind.TrueKeyword:
			case SyntaxKind.FalseKeyword:
				return new BooleanLibConfigNodeImpl(
					parent,
					scanner.getTokenOffset(),
					scanner.getTokenLength(),
					scanner.getTokenValue().toLowerCase() === 'true'
				);
			case SyntaxKind.StringLiteral:
				return _parseConcatenatedString(parent);
			default:
				_error(
					localize('UnrecognizedType', 'Expected setting type kind value'),
					ErrorCode.ValueExpected,
					[],
					[SyntaxKind.SemicolonToken]
				);
				return;
		}
	}
	function _parseNumericLiteral(raw: string): number {
		let literal = raw.trim();
		let sign = 1;

		if (literal.startsWith('+')) {
			literal = literal.substring(1);
		} else if (literal.startsWith('-')) {
			sign = -1;
			literal = literal.substring(1);
		}

		literal = literal.replace(/L{1,2}$/i, '');

		if (/^0[xX][0-9a-fA-F]+$/.test(literal)) {
			return sign * parseInt(literal.substring(2), 16);
		}

		if (/^0[bB][01]+$/.test(literal)) {
			return sign * parseInt(literal.substring(2), 2);
		}

		if (/^0[oOqQ][0-7]+$/.test(literal)) {
			return sign * parseInt(literal.substring(2), 8);
		}

		const parsed = Number(literal);
		return sign * (isNaN(parsed) ? 0 : parsed);
	}

	function _parseGroup(parent: LibConfigPropertyNode | ListLibConfigNode) : ObjectLibConfigNode {
		let back = new ObjectLibConfigNodeImpl(
			parent,
			scanner.getTokenOffset(),
			0,
			[]
		);
		// Move to next token
		_scanNext();

		while (
			scanner.getToken() !== SyntaxKind.CloseBraceToken &&
			scanner.getToken() !== SyntaxKind.EOF
		) {
			const startPos = scanner.getPosition();
			if (scanner.getToken() === SyntaxKind.IncludeDirective) {
				_parseIncludeDirective();
				continue;
			}
			let setting = _parseSetting(back);
			if(setting)
				back.addChild(setting);

			if (scanner.getPosition() === startPos) {
				_scanNext();
			}
		}
		back.length = scanner.getPosition() - back.offset;
		return back;
	}

	function _parseList(parent: LibConfigPropertyNode | ListLibConfigNode) : ListLibConfigNode {
		let back = new ListLibConfigNodeImpl(
			parent,
			scanner.getTokenOffset(),
			0,
			[]
		);

		// Move to next token
		_scanNext();
		if (scanner.getToken() === SyntaxKind.CloseParenToken) {
			back.length = scanner.getPosition() - back.offset
			return back;
		}

		var value = _parseValue(back, false);
		if(value){
			back.addChild(value);
		}
		let nextToken = _takeBufferedOrScanNext();

		while (
			scanner.getToken() !== SyntaxKind.CloseParenToken &&
			scanner.getToken() !== SyntaxKind.EOF
		) {
			const startPos = scanner.getPosition();
			if (nextToken !== SyntaxKind.CommaToken) {
				_error(
					localize('CommaExpected', 'Expected a comma'),
					ErrorCode.CommaExpected,
					[SyntaxKind.CloseParenToken],
					[SyntaxKind.CommaToken]
				);
				nextToken = scanner.getToken();
				if (nextToken !== SyntaxKind.CommaToken) {
					if (scanner.getPosition() === startPos) {
						_scanNext();
					}
					continue;
				}
			}
			// Advance past the comma; if next token is ')' it's a trailing comma
			const commaStart = scanner.getTokenOffset();
			const commaEnd = commaStart + scanner.getTokenLength();
			nextToken = _scanNext();
			if (nextToken === SyntaxKind.CloseParenToken) {
				_errorAtRange(
					localize('TrailingCommaCompatibilityList', "Trailing comma in list may not be supported by older libconfig parsers."),
					ErrorCode.TrailingCommaCompatibility,
					commaStart,
					commaEnd,
					DiagnosticSeverity.Warning
				);
				break;
			}
			value = _parseValue(back, false);
			if(value) {
				back.addChild(value);
			}
			nextToken = _takeBufferedOrScanNext();
		}

		back.length = scanner.getPosition() - back.offset;
		return back;
	}

	function _parseArray(parent: LibConfigPropertyNode | ListLibConfigNode) : ArrayLibConfigNode {
		// Move to next token
		let back: ArrayLibConfigNodeImpl = new ArrayLibConfigNodeImpl(
			parent,
			scanner.getTokenOffset(),
			0,
			[]
		);
		_scanNext();
		if (scanner.getToken() === SyntaxKind.CloseBracketToken) {
			back.length = scanner.getPosition() - back.offset;
			return back;
		}

		let value = _parseScalarValue(back, false);

		if(value) {
			back.addChild(value);
		}

		let nextToken = _takeBufferedOrScanNext();

		while (
			scanner.getToken() !== SyntaxKind.CloseBracketToken &&
			scanner.getToken() !== SyntaxKind.EOF &&
			scanner.getToken() !== SyntaxKind.SemicolonToken
		) {
			const startPos = scanner.getPosition();
			if (nextToken !== SyntaxKind.CommaToken) {
				_error(
					localize('CommaExpected', 'Expected a comma'),
					ErrorCode.CommaExpected,
					[SyntaxKind.CloseBracketToken],
					[SyntaxKind.CommaToken]
				);
				nextToken = scanner.getToken();
				if (nextToken !== SyntaxKind.CommaToken) {
					if (scanner.getPosition() === startPos) {
						_scanNext();
					}
					continue;
				}
			}
			// Advance past the comma; if next token is ']' it's a trailing comma
			const commaStart = scanner.getTokenOffset();
			const commaEnd = commaStart + scanner.getTokenLength();
			nextToken = _scanNext();
			if (nextToken === SyntaxKind.CloseBracketToken) {
				_errorAtRange(
					localize('TrailingCommaCompatibilityArray', "Trailing comma in array may not be supported by older libconfig parsers."),
					ErrorCode.TrailingCommaCompatibility,
					commaStart,
					commaEnd,
					DiagnosticSeverity.Warning
				);
				break;
			}
			value = _parseScalarValue(back, false);

			if(value) {
				back.addChild(value);
			}

			nextToken = _takeBufferedOrScanNext();
		}

		back.length = scanner.getTokenOffset() - back.offset;

		return back;
	}

	function _parseTerminator() {
		const valueEndOffset = scanner.getTokenOffset() + scanner.getTokenLength();
		const tok = _takeBufferedOrScanNext();

		if (tok === SyntaxKind.SemicolonToken) {
			_scanNext();
			return;
		}

		if (tok === SyntaxKind.CommaToken) {
			_errorAtRange(
				localize('CommaTerminatorCompatibility', "Use ';' instead of ',' as a setting terminator for parser compatibility."),
				ErrorCode.SemicolonExpected,
				scanner.getTokenOffset(),
				scanner.getTokenOffset() + scanner.getTokenLength(),
				DiagnosticSeverity.Warning
			);
			_scanNext();
			return;
		}

		_errorAtRange(
			localize('MissingSemicolonCompatibility', "Missing ';' terminator may not be supported by all parsers."),
			ErrorCode.SemicolonExpected,
			valueEndOffset,
			valueEndOffset,
			DiagnosticSeverity.Warning
		);
	}

	function _errorAtRange(message: string, code: ErrorCode, startOffset: number, endOffset: number, severity: DiagnosticSeverity = DiagnosticSeverity.Error): void {

		if (problems.length === 0 || startOffset !== lastProblemOffset) {
			let range = Range.create(textDocument.positionAt(startOffset), textDocument.positionAt(endOffset));
			problems.push(Diagnostic.create(range, message, severity, code, textDocument.languageId));
			lastProblemOffset = startOffset;
		}
	}

	function _error(message: string, code: ErrorCode, skipUntilAfter: SyntaxKind[] = [], skipUntil: SyntaxKind[] = []) {
		let start = scanner.getTokenOffset();
		let end = scanner.getTokenOffset() + scanner.getTokenLength();
		if (start === end && start > 0) {
			start--;
			while (start > 0 && /\s/.test(text.charAt(start))) {
				start--;
			}
			end = start + 1;
		}
		_errorAtRange(message, code, start, end);

		if (skipUntilAfter.length + skipUntil.length > 0) {
			let token = scanner.getToken();
			while (token !== SyntaxKind.EOF) {
				if (skipUntilAfter.indexOf(token) !== -1) {
					_scanNext();
					break;
				} else if (skipUntil.indexOf(token) !== -1) {
					break;
				}
				token = _scanNext();
			}
		}
	}

	function _checkScanError(): boolean {
		const tokenError = scanner.getTokenError();
		const errorInfo = scanErrorMap[tokenError];
		
		if (errorInfo) {
			_error(localize(errorInfo.key, errorInfo.message), errorInfo.code);
			return true;
		}
		
		return false;
	}

	BaseLibConfigNodeImpl.clearErrorCallbacks();
	BaseLibConfigNodeImpl.addErrorCallback((errorInfo, start, length)=>{
		_errorAtRange(errorInfo, ErrorCode.Undefined, start, start + length)
	});

	try {
		_scanNext();
		while (scanner.getToken() !== SyntaxKind.EOF) {
			const startPos = scanner.getPosition();
			if (scanner.getToken() === SyntaxKind.IncludeDirective) {
				_parseIncludeDirective();
				continue;
			}
			const setting = _parseSetting(null);
			if (setting) {
				rootSettings.push(setting);
			}

			if (scanner.getPosition() === startPos) {
				_scanNext();
			}
		}
	} finally {
		BaseLibConfigNodeImpl.clearErrorCallbacks();
	}
	const result = new LibConfigDocument(problems, [], rootSettings);
	parseCache.set(textDocument.uri, { version: textDocument.version, text, result });
	return result;
}
