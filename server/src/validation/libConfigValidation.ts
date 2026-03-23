'use strict';

import {
	Diagnostic
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';

import {
	ParseLibConfigDocument
} from '../parser/libConfigParser';

export class LibConfigValidation {
	public doValidation(textDocument: TextDocument): Promise<Diagnostic[]> {
		const libConfigDocument = ParseLibConfigDocument(textDocument);
		const diagnostics: Diagnostic[] = [];
		const added: { [signature: string]: boolean } = {};
		
		// Remove duplicated messages
		for (const p of libConfigDocument.syntaxErrors) {
			const signature = p.range.start.line + ' ' + p.range.start.character + ' ' + p.message;
			if (!added[signature]) {
				added[signature] = true;
				diagnostics.push(p);
			}
		}

		return Promise.resolve(diagnostics);
	}
}