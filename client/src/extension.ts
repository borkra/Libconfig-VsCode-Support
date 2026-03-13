/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as path from 'path';
import { workspace, ExtensionContext } from 'vscode';

import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind
} from 'vscode-languageclient';

let client: LanguageClient;

export function activate(context: ExtensionContext) {
	if (client) {
		return;
	}

	// The server is implemented in node
	let serverModule = context.asAbsolutePath(
		path.join('server', 'out', 'server.js')
	);
	// The debug options for the server
	// --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging
	let debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };

	// If the extension is launched in debug mode then the debug server options are used
	// Otherwise the run options are used
	let serverOptions: ServerOptions = {
		run: { module: serverModule, transport: TransportKind.ipc },
		debug: {
			module: serverModule,
			transport: TransportKind.ipc,
			options: debugOptions
		}
	};

	// Options to control the language client
	const fileEvents = workspace.createFileSystemWatcher('**/*.{cfg,schema}');
	context.subscriptions.push(fileEvents);

	let clientOptions: LanguageClientOptions = {
		// Register the server for libconfig documents
		documentSelector: [{ scheme: 'file', language: 'libconfig' }],
		synchronize: {
			// Notify the server about file changes to '.cfg and .schema files contained in the workspace
			fileEvents
		}
	};

	// Create the language client and start the client.
	client = new LanguageClient(
		'LibConfigServer',
		'Language Server for LibConfig Documents',
		serverOptions,
		clientOptions
	);

	// Start the client. This will also launch the server
	context.subscriptions.push(client.start());
}

export function deactivate(): Thenable<void> | undefined {
	if (!client) {
		return undefined;
	}
	const activeClient = client;
	client = undefined as any;
	return activeClient.stop();
}
