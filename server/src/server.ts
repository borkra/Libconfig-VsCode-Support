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
	getFoldingRanges
} from './folding/libConfigFolding';

import { LibConfigValidation } from './validation/libConfigValidation';

import {
	FormatLibConfigDocument
} from './format/libConfigFormat';
import { ParseLibConfigDocument, clearParseCacheForUri } from './parser/libConfigParser';

const LIBCONFIG_PARSE_DOCUMENT_REQUEST = 'libconfig/parseDocument';
const LIBCONFIG_COMPLETION_ITEMS_REQUEST = 'libconfig/getCompletionItems';
const TRAILING_STATEMENT_SEPARATOR_REGEX = /[;{}]\s*$/;

interface ParseDocumentParams {
	uri: string;
	text: string;
}

interface CompletionItemsParams {
	uri: string;
	text: string;
	offset: number;
}

interface ParsedBaseNode {
	type: 'object' | 'array' | 'list' | 'property' | 'string' | 'number' | 'boolean';
	offset: number;
	length: number;
	value: string | boolean | number | null;
	children?: ParsedBaseNode[];
	name?: string;
}

interface ParseDocumentResult {
	syntaxErrors: Diagnostic[];
	rootSettings: ParsedBaseNode[];
}

type RawNode = { type: ParsedBaseNode['type']; offset: number; length: number; value: unknown; children?: unknown[]; name?: string };

// Create a connection for the server. The connection uses Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

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

connection.onRequest(LIBCONFIG_PARSE_DOCUMENT_REQUEST, (params: ParseDocumentParams): ParseDocumentResult => {
	const textDocument = TextDocument.create(params.uri, 'libconfig', 0, params.text);
	const parsed = ParseLibConfigDocument(textDocument);

	return {
		syntaxErrors: parsed.syntaxErrors,
		rootSettings: parsed.rootSettings.map(serializeNode)
	};
});

connection.onRequest(LIBCONFIG_COMPLETION_ITEMS_REQUEST, (params: CompletionItemsParams): CompletionItem[] => {
	const maxOffset = params.text.length;
	const offset = Math.max(0, Math.min(params.offset, maxOffset));
	return computeCompletionItemsForText(params.text, offset);
});

function serializeNode(node: RawNode): ParsedBaseNode {
	// For property nodes, the value field contains the actual value node (object/array/list/scalar)
	// For container nodes (object/array/list), children contains child nodes
	// We need to handle both cases
	
	let serializedChildren: ParsedBaseNode[] | undefined;
	let scalarValue: string | number | boolean | null = null;
	
	if (node.type === 'property') {
		// For property nodes, serialize the value field as a child if it exists
		if (node.value && typeof node.value === 'object' && 'type' in node.value) {
			serializedChildren = [serializeNode(node.value as RawNode)];
		} else if (typeof node.value === 'string' || typeof node.value === 'number' || typeof node.value === 'boolean') {
			// Property value is a scalar (shouldn't happen with current parser structure, but handle it)
			scalarValue = node.value;
		}
	} else {
		// For non-property nodes, serialize children array
		serializedChildren = Array.isArray(node.children)
			? node.children.map(child => serializeNode(child as RawNode))
			: undefined;
		
		// Extract scalar value for scalar nodes
		if (typeof node.value === 'string' || typeof node.value === 'number' || typeof node.value === 'boolean') {
			scalarValue = node.value;
		}
	}

	return {
		type: node.type,
		offset: node.offset,
		length: node.length,
		value: scalarValue,
		children: serializedChildren,
		name: typeof node.name === 'string' ? node.name : undefined
	};
}

connection.onCompletion((params: CompletionParams) => {
	const document = documents.get(params.textDocument.uri);
	if (!document) {
		return statementCompletions;
	}

	const offset = document.offsetAt(params.position);
	return computeCompletionItemsForText(document.getText(), offset);
});

function computeCompletionItemsForText(text: string, offset: number): CompletionItem[] {
	const lineStart = text.lastIndexOf('\n', Math.max(0, offset - 1)) + 1;
	const linePrefix = text.slice(lineStart, offset);
	const trimmedPrefix = linePrefix.trim();

	if (trimmedPrefix.startsWith('@')) {
		return [includeCompletion];
	}

	if (linePrefix.includes('=')) {
		return valueCompletions;
	}

	if (trimmedPrefix.length === 0 || TRAILING_STATEMENT_SEPARATOR_REGEX.test(linePrefix)) {
		return statementCompletions;
	}

	return statementCompletions;
}

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent((change) => {
	triggerValidation(change.document);
});

// a document has closed: clear all diagnostics
documents.onDidClose(event => {
	cleanPendingValidation(event.document);
	clearParseCacheForUri(event.document.uri);
	connection.sendDiagnostics({ uri: event.document.uri, diagnostics: [] });
});

const pendingValidationRequests = new Map<string, NodeJS.Timeout>();
const validationDelayMs = 500;
const validator = new LibConfigValidation(); // Singleton instance
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

function formatError(message: string, err: unknown): string {
	const detail = err instanceof Error ? err.stack ?? err.message : String(err);
	return err != null ? `${message}: ${detail}` : message;
}

function cleanPendingValidation(textDocument: TextDocument): void {
	const request = pendingValidationRequests.get(textDocument.uri);
	if (request) {
		clearTimeout(request);
		pendingValidationRequests.delete(textDocument.uri);
	}
}

function triggerValidation(textDocument: TextDocument): void {
	cleanPendingValidation(textDocument);
	pendingValidationRequests.set(textDocument.uri, setTimeout(() => {
		pendingValidationRequests.delete(textDocument.uri);
		validateTextDocument(textDocument);
	}, validationDelayMs));
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

	const currDocument = documents.get(textDocument.uri);
	if (currDocument && currDocument.version === version) {
		try {
			respond(validator.doValidation(textDocument));
		} catch (error) {
			connection.console.error(formatError(`Error while validating ${textDocument.uri}`, error));
		}
	}
}

connection.onFoldingRanges((params) => {
	try {
		const document = documents.get(params.textDocument.uri);
		if (document) {
			return getFoldingRanges(document);
		}
		return null;
	} catch (e) {
		connection.console.error(formatError(`Error while computing folding ranges for ${params.textDocument.uri}`, e));
		return null;
	}
});

connection.onDocumentFormatting((formatParams) => {
	try {
		const document = documents.get(formatParams.textDocument.uri);
		if (document) {
			return FormatLibConfigDocument(document.getText(), formatParams.options).map(e => {
				return TextEdit.replace(Range.create(document.positionAt(e.offset), document.positionAt(e.offset + e.length)), e.content);
			});
		}
		return [];
	} catch (e) {
		connection.console.error(formatError(`Error while formatting for ${formatParams.textDocument.uri}`, e));
		return [];
	}
});


// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
