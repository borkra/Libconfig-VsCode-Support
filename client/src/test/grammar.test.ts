/* --------------------------------------------------------------------------------------------
 * Copyright (c) LibConfig VS Code Support contributors.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as assert from 'assert';
import * as fs from 'fs/promises';
import * as path from 'path';

type GrammarRule = {
	begin?: string;
	end?: string;
	name?: string;
	include?: string;
	patterns?: GrammarRule[];
};

type GrammarRepository = Record<string, GrammarRule>;

type GrammarDocument = {
	repository?: GrammarRepository;
};

export async function runGrammarTest(): Promise<void> {
	const grammarPath = path.resolve(__dirname, '../../../syntaxes/libconfig.tmLanguage.json');
	const grammarContent = await fs.readFile(grammarPath, 'utf8');
	const grammar = JSON.parse(grammarContent) as GrammarDocument;
	const repository = grammar.repository;

	assert.ok(repository, 'Expected grammar repository to exist');

	const propertyNameRule = repository['property-name'];
	assert.ok(propertyNameRule, 'Expected property-name rule to exist');
	assert.strictEqual(propertyNameRule.name, 'meta.structure.dictionary.key.json');
	assert.ok(
		propertyNameRule.patterns?.some(pattern => pattern.name === 'string.json support.type.property-name.json'),
		'Expected property-name rule to expose JSON property-name scopes'
	);

	const declarationRule = repository.declaration;
	assert.ok(declarationRule, 'Expected declaration rule to exist');
	assert.ok(
		declarationRule.patterns?.some(pattern => pattern.include === '#property-name'),
		'Expected declaration rule to include property-name rule'
	);
}