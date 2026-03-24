/* --------------------------------------------------------------------------------------------
 * Copyright (c) LibConfig VS Code Support contributors.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as vscode from 'vscode'
import * as assert from 'assert'
import { activate, createTempFixtureDocUri } from './helper'

export async function runDiagnosticsTest(): Promise<void> {
  await testSyntaxDiagnostics(await createTempFixtureDocUri('diagnostics.cfg', [
    { source: 'diagnostics.sample', target: 'diagnostics.cfg' }
  ]))
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
  await testSignedBaseInvalidDiagnostics(await createTempFixtureDocUri('signed-base-invalid.cfg', [
    { source: 'signed-base-invalid.sample', target: 'signed-base-invalid.cfg' }
  ]))
}

async function testSyntaxDiagnostics(docUri: vscode.Uri) {
  await activate(docUri)
  const actualDiagnostics = await waitForDiagnostics(docUri)

  assert.ok(actualDiagnostics.length > 0)
  assert.ok(actualDiagnostics[0].message.includes('Expected'))
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

  assert.ok(compatibilityDiagnostics.length >= 4)
  assert.ok(compatibilityDiagnostics.some(d => d.message.includes("Use ';' instead of ','")))
  assert.ok(compatibilityDiagnostics.some(d => d.message.includes("Missing ';' terminator")))
  assert.ok(compatibilityDiagnostics.some(d => d.message.includes('Trailing comma in list')))
  assert.ok(compatibilityDiagnostics.some(d => d.message.includes('Trailing comma in array')))
}

async function testSpecVariantsDiagnostics(docUri: vscode.Uri) {
  await activate(docUri)
  const actualDiagnostics = await waitForDiagnostics(docUri)

  const errorDiagnostics = actualDiagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error)
  assert.strictEqual(errorDiagnostics.length, 0)
}

async function testSignedBaseInvalidDiagnostics(docUri: vscode.Uri) {
  await activate(docUri)
  const actualDiagnostics = await waitForDiagnostics(docUri)

  const valueDiagnostics = actualDiagnostics.filter(d =>
    d.severity === vscode.DiagnosticSeverity.Error &&
    d.message.includes('Expected setting type kind value')
  )

  assert.ok(valueDiagnostics.length >= 3)
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
