# Libconfig Parser API

This document describes the extension-to-extension parser API exported by the
Libconfig VS Code extension.

## Provider Extension
- Extension ID: `borkra.libconfig-lang`

Consumer extensions should list this ID under `extensionDependencies` in their
`package.json`.

## API Contract (v1)

When activated via `vscode.extensions.getExtension(...).activate()`, the
extension returns this API object:

- `apiVersion: 1`
- `getParsedDocument(uri: string, text: string): Promise<ParsedLibconfigDocument>`
- `getCompletionItems(uri: string, text: string, offset: number): Promise<LibconfigCompletionEntry[]>`

## Data Shapes

`ParsedLibconfigDocument`:
- `syntaxErrors: SerializedDiagnostic[]`
- `rootSettings: ParsedLibconfigNode[]`

`SerializedDiagnostic`:
- `range?: SerializedRange`
- `message?: string`
- `severity?: number`
- `source?: string`

`SerializedRange`:
- `start?: SerializedPosition`
- `end?: SerializedPosition`

`SerializedPosition`:
- `line?: number`
- `character?: number`

`ParsedLibconfigNode`:
- `type: 'object' | 'array' | 'list' | 'property' | 'string' | 'number' | 'boolean'`
- `offset: number`
- `length: number`
- `value: string | boolean | number | null`
- `children?: ParsedLibconfigNode[]`
- `name?: string` (present for `property` nodes)

`LibconfigCompletionEntry`:
- `label: string`
- `kind?: number`
- `insertText?: string`
- `detail?: string`
- `documentation?: string`

## Consumer Example

```ts
import * as vscode from 'vscode';

interface ParsedLibconfigNode {
  type: 'object' | 'array' | 'list' | 'property' | 'string' | 'number' | 'boolean';
  offset: number;
  length: number;
  value: string | boolean | number | null;
  children?: ParsedLibconfigNode[];
  name?: string;
}

interface SerializedPosition {
  line?: number;
  character?: number;
}

interface SerializedRange {
  start?: SerializedPosition;
  end?: SerializedPosition;
}

interface SerializedDiagnostic {
  range?: SerializedRange;
  message?: string;
  severity?: number;
  source?: string;
}

interface LibconfigCompletionEntry {
  label: string;
  kind?: number;
  insertText?: string;
  detail?: string;
  documentation?: string;
}

interface ParsedLibconfigDocument {
  syntaxErrors: SerializedDiagnostic[];
  rootSettings: ParsedLibconfigNode[];
}

interface LibconfigExtensionApi {
  apiVersion: 1;
  getParsedDocument(uri: string, text: string): Promise<ParsedLibconfigDocument>;
  getCompletionItems(uri: string, text: string, offset: number): Promise<LibconfigCompletionEntry[]>;
}

export async function parseWithLibconfigProvider(
  document: vscode.TextDocument
): Promise<ParsedLibconfigDocument | undefined> {
  const extension = vscode.extensions.getExtension<LibconfigExtensionApi>('borkra.libconfig-lang');
  if (!extension) {
    return undefined;
  }

  const api = await extension.activate();
  if (!api || api.apiVersion !== 1) {
    return undefined;
  }

  return api.getParsedDocument(document.uri.toString(), document.getText());
}
```

## Compatibility Guidance

- Always check `apiVersion` before using the API.
- Treat unknown node/value fields as forward-compatible and avoid hard
  assumptions beyond the documented contract.