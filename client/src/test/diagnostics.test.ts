/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as vscode from 'vscode'
import * as assert from 'assert'
import { getDocUri, activate } from './helper'

export async function runDiagnosticsTest(): Promise<void> {
  await testSyntaxDiagnostics(getDocUri('diagnostics.cfg'))
  await testCompatibilityDiagnostics(getDocUri('compatibility.cfg'))
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
    d.code === 0x300 &&
    d.severity === vscode.DiagnosticSeverity.Warning
  )

  assert.ok(compatibilityDiagnostics.length >= 2)
  assert.ok(compatibilityDiagnostics.some(d => d.message.includes("Use ';' instead of ','")))
  assert.ok(compatibilityDiagnostics.some(d => d.message.includes("Missing ';' terminator")))
}

async function waitForDiagnostics(docUri: vscode.Uri): Promise<vscode.Diagnostic[]> {
  const timeoutAt = Date.now() + 5000

  while (Date.now() < timeoutAt) {
    const diagnostics = vscode.languages.getDiagnostics(docUri)
    if (diagnostics.length > 0) {
      return diagnostics
    }
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  return vscode.languages.getDiagnostics(docUri)
}
