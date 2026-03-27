/* --------------------------------------------------------------------------------------------
 * Copyright (c) LibConfig VS Code Support contributors.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as vscode from 'vscode'
import * as assert from 'assert'
import { activate, createTempFixtureDocUri } from './helper'

// fixture base name → minimum expected error count
const MIN_ERROR_CASES: [string, number][] = [
  ['diagnostics',            1],  // settings must have a setter (= or :)
  ['signed-base-invalid',    6],  // sign prefix only valid on decimal integers (3 group + 3 array)
  ['unclosed-string',        1],  // string literals must be terminated
  ['unclosed-comment',       1],  // block comments must be terminated
  ['malformed-number',       3],  // truncatedExponent, truncatedExponentSigned, invalidSuffix
  ['missing-name',           1],  // settings must have a name
  ['missing-value',          1],  // settings must have a value
  ['missing-include-path',   1],  // @include must have a quoted path
  ['list-missing-comma',     1],  // list elements must be separated by commas
  ['array-missing-comma',    1],  // array elements must be separated by commas
  ['node-constraint-errors', 3],  // unique names in group; homogeneous arrays
  ['invalid-boolean',        2],  // boolean must be exactly 'true' or 'false'
]

export async function runDiagnosticsTest(): Promise<void> {
  for (const [base, minErrors] of MIN_ERROR_CASES) {
    await assertMinErrors(await createTempFixtureDocUri(`${base}.cfg`, [
      { source: `${base}.sample`, target: `${base}.cfg` }
    ]), minErrors)
  }

  // Cases with custom assertions
  await testCompatibilityDiagnostics(await createTempFixtureDocUri('compatibility.cfg', [
    { source: 'compatibility.sample', target: 'compatibility.cfg' }
  ]))
  await testSpecVariantsDiagnostics(await createTempFixtureDocUri('spec-variants.cfg', [
    {
      source: 'spec-variants.sample',
      target: 'spec-variants.cfg',
      transform: (content) => content.replace('"compatibility.sample"', '"compatibility.cfg"')
    },
    { source: 'compatibility.sample', target: 'compatibility.cfg' }
  ]))
  await testUnrecognizedValueDiagnostics(await createTempFixtureDocUri('unrecognized-value.cfg', [
    { source: 'unrecognized-value.sample', target: 'unrecognized-value.cfg' }
  ]))
}

async function assertMinErrors(docUri: vscode.Uri, minErrors: number): Promise<void> {
  await activate(docUri)
  const diagnostics = await waitForDiagnostics(docUri)
  const errors = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error)
  assert.ok(errors.length >= minErrors)
}

async function testCompatibilityDiagnostics(docUri: vscode.Uri) {
  await activate(docUri)
  const actualDiagnostics = await waitForDiagnostics(docUri)

  const compatibilityDiagnostics = actualDiagnostics.filter(d =>
    typeof d.code === 'number' &&
    d.code >= 0x300 &&
    d.code < 0x400 &&
    d.severity === vscode.DiagnosticSeverity.Warning
  )

  // 0x300 = SemicolonExpected: covers both ',' as terminator and missing ';'
  const terminatorWarnings = compatibilityDiagnostics.filter(d => d.code === 0x300)
  assert.ok(terminatorWarnings.length >= 2)

  // 0x301 = TrailingCommaCompatibility: covers trailing comma in list and in array
  const trailingCommaWarnings = compatibilityDiagnostics.filter(d => d.code === 0x301)
  assert.ok(trailingCommaWarnings.length >= 2)
}

async function testSpecVariantsDiagnostics(docUri: vscode.Uri) {
  await activate(docUri)
  const actualDiagnostics = await waitForDiagnostics(docUri)

  const errorDiagnostics = actualDiagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error)
  assert.strictEqual(errorDiagnostics.length, 0)
}

async function testUnrecognizedValueDiagnostics(docUri: vscode.Uri) {
  await activate(docUri)
  const actualDiagnostics = await waitForDiagnostics(docUri)

  // @bad in a setting value (group context) + abc in an array element (scalar context)
  const errors = actualDiagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error)
  assert.ok(errors.length >= 2)

  // \q and \xZZ are unsupported escapes — valid per grammar but undefined behaviour
  const warnings = actualDiagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Warning)
  assert.ok(warnings.length >= 2)
}

async function waitForDiagnostics(docUri: vscode.Uri): Promise<vscode.Diagnostic[]> {
  const currentDiagnostics = vscode.languages.getDiagnostics(docUri)
  if (currentDiagnostics.length > 0) {
    return currentDiagnostics
  }

  const docUriKey = docUri.toString()
  const settleDelayMs = 250

  return await new Promise((resolve) => {
    let settleTimeout: NodeJS.Timeout | undefined

    const finish = (diagnostics: vscode.Diagnostic[]) => {
      if (settleTimeout) {
        clearTimeout(settleTimeout)
      }
      clearTimeout(timeout)
      disposable.dispose()
      resolve(diagnostics)
    }

    const scheduleSettle = () => {
      if (settleTimeout) {
        clearTimeout(settleTimeout)
      }
      settleTimeout = setTimeout(() => {
        finish(vscode.languages.getDiagnostics(docUri))
      }, settleDelayMs)
    }

    const timeout = setTimeout(() => {
      finish(vscode.languages.getDiagnostics(docUri))
    }, 5000)

    const disposable = vscode.languages.onDidChangeDiagnostics((event) => {
      if (!event.uris.some((uri) => uri.toString() === docUriKey)) {
        return
      }

      const diagnostics = vscode.languages.getDiagnostics(docUri)
      if (diagnostics.length > 0) {
        finish(diagnostics)
        return
      }

      scheduleSettle()
    })

    scheduleSettle()
  })
}
