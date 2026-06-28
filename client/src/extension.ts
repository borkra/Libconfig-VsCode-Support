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
	State,
	TransportKind
} from 'vscode-languageclient/node';

const LIBCONFIG_PARSE_DOCUMENT_REQUEST = 'libconfig/parseDocument';
const LIBCONFIG_COMPLETION_ITEMS_REQUEST = 'libconfig/getCompletionItems';

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

let client: LanguageClient | undefined;
let refCount = 0;
let libconfigDocCount = 0;
let serverRunning = false;
let startPromise: Promise<void> | undefined;

function ensureServerRunning(): Promise<void> {
	if (!client) { return Promise.resolve(); }
	if (serverRunning) { return Promise.resolve(); }
	if (startPromise) { return startPromise; }
	startPromise = client.start().then(() => { startPromise = undefined; });
	return startPromise;
}

function maybeStopServer(): void {
	if (!client || !serverRunning || refCount > 0 || libconfigDocCount > 0) { return; }
	void client.stop();
}

export async function activate(context: ExtensionContext): Promise<LibconfigExtensionApi | undefined> {
	if (client) {
		return createExtensionApi(client);
	}

	const configuredConflictingExtensionIds = Array.isArray(context.extension.packageJSON?.conflictingExtensionIds)
		? context.extension.packageJSON.conflictingExtensionIds.filter((value: unknown): value is string => typeof value === 'string')
		: [];
	const conflictingExtensionIds = configuredConflictingExtensionIds.filter((id: string) => !!vscode.extensions.getExtension(id));
	if (conflictingExtensionIds.length > 0) {
		vscode.window.showErrorMessage(
			vscode.l10n.t(
				"{0} conflicts with installed LibConfig variants: {1}. Uninstall the conflicting variant before using this extension.",
				context.extension.id,
				conflictingExtensionIds.join(', ')
			)
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
		documentSelector: [{ scheme: 'file', language: 'libconfig' }],
		initializationOptions: vscode.l10n.uri ? { l10nUri: vscode.l10n.uri.toString() } : {}
	};

	client = new LanguageClient(
		'LibConfigServer',
		'Language Server for LibConfig Documents',
		serverOptions,
		clientOptions
	);

	client.onDidChangeState(e => {
		if (e.newState === State.Running) { serverRunning = true; }
		if (e.newState === State.Stopped) { serverRunning = false; startPromise = undefined; }
	});

	// Track open libconfig documents for server lifecycle management.
	libconfigDocCount = vscode.workspace.textDocuments.filter(d => d.languageId === 'libconfig').length;
	context.subscriptions.push(
		vscode.workspace.onDidOpenTextDocument(doc => {
			if (doc.languageId === 'libconfig') {
				libconfigDocCount++;
				void ensureServerRunning();
			}
		}),
		vscode.workspace.onDidCloseTextDocument(doc => {
			if (doc.languageId === 'libconfig') {
				libconfigDocCount = Math.max(0, libconfigDocCount - 1);
				maybeStopServer();
			}
		})
	);

	// Start immediately if libconfig files are already open; otherwise start lazily.
	if (libconfigDocCount > 0) {
		await client.start();
	}

	return createExtensionApi(client);
}

export function deactivate(): Thenable<void> | undefined {
	if (!client) {
		return undefined;
	}
	const activeClient = client;
	client = undefined;
	refCount = 0;
	libconfigDocCount = 0;
	serverRunning = false;
	startPromise = undefined;
	return activeClient.stop();
}

function createExtensionApi(languageClient: LanguageClient): LibconfigExtensionApi {
	return {
		apiVersion: 2,
		getParsedDocument: async (uri: string, text: string): Promise<ParsedLibconfigDocument> => {
			await ensureServerRunning();
			return languageClient.sendRequest(LIBCONFIG_PARSE_DOCUMENT_REQUEST, { uri, text });
		},
		getCompletionItems: async (uri: string, text: string, offset: number): Promise<LibconfigCompletionEntry[]> => {
			await ensureServerRunning();
			return languageClient.sendRequest(LIBCONFIG_COMPLETION_ITEMS_REQUEST, { uri, text, offset });
		},
		acquireHandle: (): vscode.Disposable => {
			refCount++;
			void ensureServerRunning();
			let released = false;
			return {
				dispose() {
					if (!released) {
						released = true;
						refCount--;
						maybeStopServer();
					}
				}
			};
		}
	};
}
