/* --------------------------------------------------------------------------------------------
 * Copyright (c) LibConfig VS Code Support contributors.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as vscode from 'vscode';
import * as assert from 'assert';
import { getDocUri, activate } from './helper';

export async function runCompletionTest(): Promise<void> {
	const docUri = getDocUri('completion.sample');
	await testCompletion(docUri, new vscode.Position(0, 0), [
		{ label: 'true', kind: vscode.CompletionItemKind.Keyword },
		{ label: 'false', kind: vscode.CompletionItemKind.Keyword },
		{ label: '@include', kind: vscode.CompletionItemKind.Snippet }
	]);
}

async function testCompletion(
	docUri: vscode.Uri,
	position: vscode.Position,
	expectedItems: Array<Pick<vscode.CompletionItem, 'label' | 'kind'>>
) {
	await activate(docUri);

	// Executing the command `vscode.executeCompletionItemProvider` to simulate triggering completion
	const actualCompletionList = (await vscode.commands.executeCommand(
		'vscode.executeCompletionItemProvider',
		docUri,
		position
	)) as vscode.CompletionList;

	expectedItems.forEach((expectedItem) => {
		const actualItem = actualCompletionList.items.find(item => item.label === expectedItem.label);
		assert.ok(actualItem, `Expected completion item not found: ${expectedItem.label}`);
		assert.equal(actualItem!.kind, expectedItem.kind);
	});
}
