/* --------------------------------------------------------------------------------------------
 * Copyright (c) LibConfig VS Code Support contributors.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

export let doc: vscode.TextDocument;
export let editor: vscode.TextEditor;
export let documentEol: string;
export let platformEol: string;

const tempFixtureDirs = new Set<string>();

/**
 * Activates the vscode.lsp-sample extension
 */
export async function activate(docUri: vscode.Uri) {
	const extensionIds = [
		'boris-krasnovskiy.libconfig-lang',
		'borkra.libconfig-lang',
		'tmulligan.libconfig-lang'
	];

	const ext = extensionIds
		.map((id) => vscode.extensions.getExtension(id))
		.find((candidate) => !!candidate);

	if (!ext) {
		throw new Error('LibConfig extension is not installed for tests.');
	}
	await ext.activate();
	try {
		doc = await vscode.workspace.openTextDocument(docUri);
		editor = await vscode.window.showTextDocument(doc, { preview: true });
		await sleep(2000); // Wait for server activation
	} catch (e) {
		console.error(e);
	}
}

async function sleep(ms: number) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

export const getDocPath = (p: string) => {
	return path.resolve(__dirname, '../../testFixture', p);
};
export const getDocUri = (p: string) => {
	return vscode.Uri.file(getDocPath(p));
};

type TempFixtureSpec = {
	source: string;
	target: string;
	transform?: (content: string) => string;
};

export async function createTempFixtureDocUri(
	entryTarget: string,
	fixtures: TempFixtureSpec[]
): Promise<vscode.Uri> {
	const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'libconfig-test-'));
	tempFixtureDirs.add(tempDir);

	for (const fixture of fixtures) {
		const sourcePath = getDocPath(fixture.source);
		const sourceContent = await fs.readFile(sourcePath, 'utf8');
		const targetPath = path.join(tempDir, fixture.target);
		const targetContent = fixture.transform ? fixture.transform(sourceContent) : sourceContent;
		await fs.writeFile(targetPath, targetContent, 'utf8');
	}

	return vscode.Uri.file(path.join(tempDir, entryTarget));
}

export async function cleanupTestArtifacts(): Promise<void> {
	await vscode.commands.executeCommand('workbench.action.closeAllEditors');

	for (const tempDir of tempFixtureDirs) {
		await fs.rm(tempDir, { recursive: true, force: true });
	}

	tempFixtureDirs.clear();
}

export async function setTestContent(content: string): Promise<boolean> {
	const all = new vscode.Range(
		doc.positionAt(0),
		doc.positionAt(doc.getText().length)
	);
	return editor.edit(eb => eb.replace(all, content));
}
