/* --------------------------------------------------------------------------------------------
 * Copyright (c) LibConfig VS Code Support contributors.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as path from 'path';
import * as vscode from 'vscode';
import { ExtensionContext } from 'vscode';

import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind
} from 'vscode-languageclient/node';

const LIBCONFIG_PARSE_DOCUMENT_REQUEST = 'libconfig/parseDocument';
const LIBCONFIG_COMPLETION_ITEMS_REQUEST = 'libconfig/getCompletionItems';
const CONFLICTING_EXTENSION_IDS = [
	'tmulligan.libconfig-lang',
	'wegman12.cfg-language-features'
] as const;

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
	apiVersion: 1;
	getParsedDocument(uri: string, text: string): Promise<ParsedLibconfigDocument>;
	getCompletionItems(uri: string, text: string, offset: number): Promise<LibconfigCompletionEntry[]>;
}

let client: LanguageClient | undefined;

export async function activate(context: ExtensionContext): Promise<LibconfigExtensionApi | undefined> {
	if (client) {
		return createExtensionApi(client);
	}

	const conflictingExtensionIds = CONFLICTING_EXTENSION_IDS.filter((id) => !!vscode.extensions.getExtension(id));
	if (conflictingExtensionIds.length > 0) {
		vscode.window.showErrorMessage(
			`borkra.libconfig-lang conflicts with installed LibConfig variants: ${conflictingExtensionIds.join(', ')}. Uninstall the conflicting variant before using this extension.`
		);
		return undefined;
	}

	// The server is implemented in node
	const serverModule = context.asAbsolutePath(
		path.join('server', 'out', 'server.js')
	);
	// The debug options for the server
	// --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging
	const debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };

	// If the extension is launched in debug mode then the debug server options are used
	// Otherwise the run options are used
	const serverOptions: ServerOptions = {
		run: { module: serverModule, transport: TransportKind.ipc },
		debug: {
			module: serverModule,
			transport: TransportKind.ipc,
			options: debugOptions
		}
	};

	// Options to control the language client
	const clientOptions: LanguageClientOptions = {
		// Register the server for libconfig documents
		documentSelector: [{ scheme: 'file', language: 'libconfig' }]
	};

	// Create the language client and start the client.
	client = new LanguageClient(
		'LibConfigServer',
		'Language Server for LibConfig Documents',
		serverOptions,
		clientOptions
	);

	// Start the client. This will also launch the server.
	await client.start();
	return createExtensionApi(client);
}

export function deactivate(): Thenable<void> | undefined {
	if (!client) {
		return undefined;
	}
	const activeClient = client;
	client = undefined;
	return activeClient.stop();
}

function createExtensionApi(languageClient: LanguageClient): LibconfigExtensionApi {
	return {
		apiVersion: 1,
		getParsedDocument: (uri: string, text: string): Promise<ParsedLibconfigDocument> => {
			return languageClient.sendRequest(LIBCONFIG_PARSE_DOCUMENT_REQUEST, { uri, text });
		},
		getCompletionItems: (uri: string, text: string, offset: number): Promise<LibconfigCompletionEntry[]> => {
			return languageClient.sendRequest(LIBCONFIG_COMPLETION_ITEMS_REQUEST, { uri, text, offset });
		}
	};
}
