/* --------------------------------------------------------------------------------------------
 * Copyright (c) LibConfig VS Code Support contributors.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as vscode from 'vscode';

export const LIBCONFIG_PARSE_DOCUMENT_REQUEST = 'libconfig/parseDocument';
export const LIBCONFIG_COMPLETION_ITEMS_REQUEST = 'libconfig/getCompletionItems';

export interface ParsedLibconfigNode {
	type: 'object' | 'array' | 'list' | 'property' | 'string' | 'number' | 'boolean';
	offset: number;
	length: number;
	value: string | boolean | number | null;
	children?: ParsedLibconfigNode[];
	name?: string;
}

export interface SerializedPosition {
	line?: number;
	character?: number;
}

export interface SerializedRange {
	start?: SerializedPosition;
	end?: SerializedPosition;
}

export interface SerializedDiagnostic {
	range?: SerializedRange;
	message?: string;
	severity?: number;
	source?: string;
}

export interface LibconfigCompletionEntry {
	label: string;
	kind?: number;
	insertText?: string;
	detail?: string;
	documentation?: string;
}

export interface ParsedLibconfigDocument {
	syntaxErrors: SerializedDiagnostic[];
	rootSettings: ParsedLibconfigNode[];
}

export interface LibconfigExtensionApi {
	apiVersion: 2;
	getParsedDocument(uri: string, text: string): Promise<ParsedLibconfigDocument>;
	getCompletionItems(uri: string, text: string, offset: number): Promise<LibconfigCompletionEntry[]>;
	acquireHandle(): vscode.Disposable;
}
