// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 LibConfig VS Code Support contributors
import { Diagnostic, Range } from 'vscode-languageserver';
import { LibConfigPropertyNode } from './nodeInterfaces';

export class LibConfigDocument {

	constructor(
		public readonly syntaxErrors: Diagnostic[] = [],
		public readonly comments: Range[] = [],
		public readonly rootSettings: LibConfigPropertyNode[] = []
	) {
	}

}