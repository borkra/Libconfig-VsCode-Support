// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 LibConfig VS Code Support contributors
'use strict';

import {
	Diagnostic
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';

import {
	ParseLibConfigDocument
} from '../parser/libConfigParser';

export class LibConfigValidation {
	public doValidation(textDocument: TextDocument): Diagnostic[] {
		const libConfigDocument = ParseLibConfigDocument(textDocument);
		const seen = new Set<string>();
		const diagnostics: Diagnostic[] = [];

		for (const p of libConfigDocument.syntaxErrors) {
			const signature = `${p.range.start.line} ${p.range.start.character} ${p.message}`;
			if (!seen.has(signature)) {
				seen.add(signature);
				diagnostics.push(p);
			}
		}

		return diagnostics;
	}
}