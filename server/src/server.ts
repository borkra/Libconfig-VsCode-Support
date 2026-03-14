/* --------------------------------------------------------------------------------------------
 * Copyright (c) LibConfig VS Code Support contributors.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import {
	createConnection,
	TextDocuments,
	CompletionItem,
	CompletionItemKind,
	CompletionParams,
	Diagnostic,
	InsertTextFormat,
	ProposedFeatures,
	TextEdit,
	Range,
	TextDocumentSyncKind
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';

import { 
	formatError, 
	runSafe 
} from './utils/runner';

import {
	getFoldingRanges
} from './folding/libConfigFolding';

import { LibConfigValidation } from './validation/libConfigValidation';

import {
	FormatLibConfigDocument
} from './format/libConfigFormat';


// Create a connection for the server. The connection uses Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

connection.console.log('SERVER STARTED');

// Create a simple text document manager. The text document manager
// supports full document sync only
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

connection.onInitialize(() => {
	return {
		capabilities: {
			textDocumentSync: TextDocumentSyncKind.Incremental,
			completionProvider: {
				triggerCharacters: ['@']
			},
			foldingRangeProvider: true,
			documentFormattingProvider: true
		}
	};
});

connection.onCompletion((params: CompletionParams) => {
	const document = documents.get(params.textDocument.uri);
	if (!document) {
		return completionItems;
	}

	const offset = document.offsetAt(params.position);
	const text = document.getText();
	const lineStart = text.lastIndexOf('\n', Math.max(0, offset - 1)) + 1;
	const linePrefix = text.slice(lineStart, offset);
	const trimmedPrefix = linePrefix.trim();

	if (trimmedPrefix.startsWith('@')) {
		return [includeCompletion];
	}

	if (linePrefix.includes('=')) {
		return valueCompletions;
	}

	if (trimmedPrefix.length === 0 || /[;{}]\s*$/.test(linePrefix)) {
		return statementCompletions;
	}

	return completionItems;
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent((change) => {
	triggerValidation(change.document);
});

// a document has closed: clear all diagnostics
documents.onDidClose(event => {
	cleanPendingValidation(event.document);
	connection.sendDiagnostics({ uri: event.document.uri, diagnostics: [] });
});

const pendingValidationRequests: { [uri: string]: NodeJS.Timeout; } = {};
const validationDelayMs = 500;
const booleanCompletions: CompletionItem[] = [
	{
		label: 'true',
		kind: CompletionItemKind.Keyword,
		insertText: 'true'
	},
	{
		label: 'false',
		kind: CompletionItemKind.Keyword,
		insertText: 'false'
	}
];

const includeCompletion: CompletionItem = {
	label: '@include',
	kind: CompletionItemKind.Snippet,
	insertText: '@include "${1:path}"',
	insertTextFormat: InsertTextFormat.Snippet,
	detail: 'Insert include directive'
};

const valueCompletions: CompletionItem[] = [
	...booleanCompletions,
	{
		label: '"string"',
		kind: CompletionItemKind.Snippet,
		insertText: '"${1:value}"',
		insertTextFormat: InsertTextFormat.Snippet,
		detail: 'String value'
	},
	{
		label: '{ ... }',
		kind: CompletionItemKind.Snippet,
		insertText: '{\n\t$1\n}',
		insertTextFormat: InsertTextFormat.Snippet,
		detail: 'Group value'
	},
	{
		label: '[ ... ]',
		kind: CompletionItemKind.Snippet,
		insertText: '[ $1 ]',
		insertTextFormat: InsertTextFormat.Snippet,
		detail: 'Array value'
	}
];

const statementCompletions: CompletionItem[] = [
	...booleanCompletions,
	includeCompletion,
	{
		label: 'setting',
		kind: CompletionItemKind.Snippet,
		insertText: '${1:name} = ${2:value};',
		insertTextFormat: InsertTextFormat.Snippet,
		detail: 'Setting declaration'
	},
	{
		label: 'group',
		kind: CompletionItemKind.Snippet,
		insertText: '${1:name} = {\n\t$2\n};',
		insertTextFormat: InsertTextFormat.Snippet,
		detail: 'Group declaration'
	}
];

const completionItems: CompletionItem[] = [
	...booleanCompletions,
	includeCompletion,
	...statementCompletions
];

function cleanPendingValidation(textDocument: TextDocument): void {
	const request = pendingValidationRequests[textDocument.uri];
	if (request) {
		clearTimeout(request);
		delete pendingValidationRequests[textDocument.uri];
	}
}

function triggerValidation(textDocument: TextDocument): void {
	cleanPendingValidation(textDocument);
	pendingValidationRequests[textDocument.uri] = setTimeout(() => {
		delete pendingValidationRequests[textDocument.uri];
		validateTextDocument(textDocument);
	}, validationDelayMs);
}

function validateTextDocument(textDocument: TextDocument): void {
	const respond = (diagnostics: Diagnostic[]) => {
		connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
	};
	if (textDocument.getText().length === 0) {
		respond([]); // ignore empty documents
		return;
	}
	const version = textDocument.version;

	const validator = new LibConfigValidation();

	validator.doValidation(textDocument).then(diagnostics => {
		setTimeout(() => {
			const currDocument = documents.get(textDocument.uri);
			if (currDocument && currDocument.version === version) {
				respond(diagnostics); // Send the computed diagnostics to VSCode.
			}
		}, 100);
	}, error => {
		connection.console.error(formatError(`Error while validating ${textDocument.uri}`, error));
	});
}

connection.onFoldingRanges((params, token) => {
	return runSafe(() => {
		const document = documents.get(params.textDocument.uri);
		if (document) {
			return getFoldingRanges(document);
		}
		return null;
	}, null, `Error while computing folding ranges for ${params.textDocument.uri}`, token);
});

connection.onDocumentFormatting((formatParams, token) =>{
	return runSafe(() => {
		const document = documents.get(formatParams.textDocument.uri);
		if (document) {
			return FormatLibConfigDocument(document.getText(),formatParams.options).map(e => {
				return TextEdit.replace(Range.create(document.positionAt(e.offset), document.positionAt(e.offset + e.length)), e.content);
			});
		}
		return [];
	}, [], `Error while formatting for ${formatParams.textDocument.uri}`, token);
});


// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
