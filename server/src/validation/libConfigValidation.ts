'use strict';

import {
	TextDocument,
	Diagnostic
} from 'vscode-languageserver/node';

import {
	ParseLibConfigDocument
} from '../parser/libConfigParser';

export class LibConfigValidation {
	public doValidation(textDocument: TextDocument): Promise<Diagnostic[]> {
		const libConfigDocument = ParseLibConfigDocument(textDocument);
		const diagnostics: Diagnostic[] = [];
		const added: { [signature: string]: boolean } = {};
		const addProblem = (problem: Diagnostic) => {
			// remove duplicated messages
			const signature = problem.range.start.line + ' ' + problem.range.start.character + ' ' + problem.message;
			if (!added[signature]) {
				added[signature] = true;
				diagnostics.push(problem);
			}
		};
		const getDiagnostics = () => {
			for (const p of libConfigDocument.syntaxErrors) {
				addProblem(p);
			}

			return diagnostics;
		};

		return Promise.resolve(getDiagnostics());
	}
}