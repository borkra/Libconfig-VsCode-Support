# LibConfig VS Code Extension — Copilot Instructions

## Project Overview

A VS Code language extension providing full language support for LibConfig `.cfg` files.
It supplies syntax highlighting, semantic validation, folding, formatting, and completions via an LSP server.

It also acts as a **dependency and parser API provider** for downstream extensions — notably
`borkra.swupdate-lang` (sibling project at `/devel/Swupdate-VSCode-Support`). Downstream extensions
call into this extension via the exported API to parse libconfig documents and receive completions.

---

## Repository Layout

```
Libconfig-VsCode-Support/
  client/src/extension.ts          — VS Code client: activates LSP, exposes public API to dependents
  client/src/test/                  — E2E tests (completion.test.ts, diagnostics.test.ts, grammar.test.ts)
  client/testFixture/               — .sample fixture files used by tests
  server/src/server.ts              — LSP server entry point
  server/src/parser/
    libConfigParser.ts              — Full libconfig parser (produces AST)
  server/src/scanner/               — Tokeniser / lexer
  server/src/validation/
    libConfigValidation.ts          — Syntax + semantic diagnostics
  server/src/format/
    libConfigFormat.ts              — Document formatting
  server/src/folding/
    libConfigFolding.ts             — Folding range provider
  server/src/dataClasses/
    index.ts                        — Re-exports all node types and data classes
    nodeInterfaces.ts               — AST node type interfaces
    nodeImplementations.ts          — Concrete AST node classes
    errorCode.ts / scanError.ts / syntaxKind.ts — Enums used by scanner and parser
    libConfigDocument.ts            — Top-level document wrapper
  syntaxes/libconfig.tmLanguage.json — TextMate grammar
  docs/
    DEVELOPMENT.md                  — Local dev and install workflow
    PARSER_API.md                   — Extension-to-extension API contract
  scripts/
    e2e.js / e2e.sh                 — E2E test runner
    bundle.js                       — esbuild bundler for client + server
    smart-reinstall.js              — Reinstall script aware of dependent extensions
    update-version.js               — Bumps version across package.json files
```

---

## NPM Scripts (all run from `/devel/Libconfig-VsCode-Support`)

| Script | Command | Purpose |
|---|---|---|
| `compile` | `npm run compile` | TypeScript build (`tsc -b`) |
| `watch` | `npm run watch` | Incremental watch mode |
| `test` | `npm test` | E2E test suite |
| `package:local` | `npm run package:local` | Compile + bundle + produce `libconfig-lang.vsix` |
| `install:local` | `npm run install:local` | `package:local` then installs into code + code-insiders |
| `clean` | `npm run clean` | Remove all build artifacts and `.vsix` |
| `clean:full` | `npm run clean:full` | `clean` + remove all `node_modules` |
| `update:version` | `npm run update:version` | Bump version in all package.json files |

### Building and installing locally

```bash
cd /devel/Libconfig-VsCode-Support
npm run install:local
# Produces libconfig-lang.vsix and installs into VS Code stable + Insiders
# Reload the VS Code window after installation to activate the new version
```

### Smart reinstall (when swupdate extension is also installed)

Because `borkra.swupdate-lang` declares `borkra.libconfig-lang` as a dependency, VS Code can
refuse to uninstall libconfig if swupdate is also installed. Use the smart reinstaller:

```bash
cd /devel/Libconfig-VsCode-Support
node scripts/smart-reinstall.js
# Detects dependent extensions, uninstalls them first, reinstalls libconfig,
# then reports which dependents were removed so you can reinstall them manually.
```

### Building as a dependency for the swupdate extension tests

The swupdate test runner needs a `.vsix` of this extension. Build it here first:

```bash
cd /devel/Libconfig-VsCode-Support
npm run compile && npm run bundle && npx @vscode/vsce package --no-yarn --out libconfig-lang.vsix

# Then run swupdate tests with:
cd /devel/Swupdate-VSCode-Support
LIBCONFIG_VSIX_PATH=/devel/Libconfig-VsCode-Support/libconfig-lang.vsix npm test
```

---

## Key Source Files to Know

### `server/src/parser/libConfigParser.ts`
Full libconfig parser. Produces a `LibConfigDocument` containing an AST of `ParsedLibconfigNode` objects.
- Entry point: `ParseLibConfigDocument(text, uri)`
- Cache management: `clearParseCacheForUri(uri)`

### `server/src/dataClasses/`
All AST node type definitions consumed by the parser and by downstream extensions:
- `nodeInterfaces.ts` — interfaces: `BaseLibConfigNode`, `LibConfigPropertyNode`, `ObjectLibConfigNode`, `ArrayLibConfigNode`, `ListLibConfigNode`, `StringLibConfigNode`, etc.
- `nodeImplementations.ts` — concrete implementations of all node types
- `syntaxKind.ts` — `SyntaxKind` enum (tokeniser token types)
- `errorCode.ts` — `ErrorCode` enum (parse error codes)
- `scanError.ts` — `ScanError` enum (scanner-level errors)
- `libConfigDocument.ts` — top-level document wrapper

### `server/src/validation/libConfigValidation.ts`
Applies syntax and semantic diagnostics. Entry point: `doValidation(document, parsedDoc)`.

### `client/src/extension.ts`
Activates the LSP client and **exports the public parser API** to dependent extensions.
The exported API object:
- `apiVersion: 1`
- `getParsedDocument(uri, text): Promise<ParsedLibconfigDocument>` — returns AST + syntax errors
- `getCompletionItems(uri, text, offset): Promise<LibconfigCompletionEntry[]>` — returns completion items

---

## Extension-to-Extension API (Parser API)

Full contract documented in `docs/PARSER_API.md`. Key points:

- Extension ID: `borkra.libconfig-lang`
- Consumers must list this ID in `extensionDependencies` in their `package.json`
- Activate via `vscode.extensions.getExtension('borkra.libconfig-lang').activate()`
- Returns `LibconfigExtensionApi` with `getParsedDocument` and `getCompletionItems`

`ParsedLibconfigNode` shape:
```ts
{
  type: 'object' | 'array' | 'list' | 'property' | 'string' | 'number' | 'boolean';
  offset: number;   // character offset in source text
  length: number;   // character length
  value: string | boolean | number | null;
  children?: ParsedLibconfigNode[];
  name?: string;    // present for 'property' nodes only
}
```

`ParsedLibconfigDocument` shape:
```ts
{
  syntaxErrors: SerializedDiagnostic[];
  rootSettings: ParsedLibconfigNode[];
}
```

---

## Test Fixtures (`client/testFixture/`)

| File | Tested error / scenario |
|---|---|
| `diagnostics.sample` | Settings must have an assignment operator (`=` or `:`) |
| `signed-base-invalid.sample` | Sign prefix (`+`/`-`) only valid on decimal integers |
| `unclosed-string.sample` | Unterminated string literal |
| `unclosed-comment.sample` | Unterminated block comment |
| `malformed-number.sample` | Truncated exponent, invalid suffix |
| `missing-name.sample` | Settings must have a name |
| `missing-value.sample` | Settings must have a value |
| `missing-include-path.sample` | `@include` must have a quoted path argument |
| `list-missing-comma.sample` | List elements must be separated by commas |
| `array-missing-comma.sample` | Array elements must be separated by commas |
| `node-constraint-errors.sample` | Duplicate names in group; heterogeneous arrays |
| `invalid-boolean.sample` | Boolean must be exactly `true` or `false` (case-sensitive) |
| `unrecognized-value.sample` | Unrecognised value token |
| `compatibility.sample` | `@include` target used by other fixtures |
| `spec-variants.sample` | All supported libconfig syntax variants (no errors) |

### Test structure
- `diagnostics.test.ts` — asserts minimum error counts per fixture; validates specific messages for unrecognized-value and compatibility
- `completion.test.ts` — verifies `true`, `false`, `@include` appear as completions on an empty document
- `grammar.test.ts` — structural checks on `libconfig.tmLanguage.json` (property-name rule, declaration rule)

---

## Spec Reference

LibConfig manual: http://www.hyperrealm.com/libconfig/libconfig_manual.html

Key spec rules encoded in the plugin:
- Settings require a name and a value with `=` or `:` operator
- Group members must have unique names
- Arrays must be homogeneous (all elements same scalar type)
- Lists can be heterogeneous but elements must be comma-separated
- `@include "path"` directive is supported; path must be a quoted string
- Boolean values are exactly `true` or `false` (case-sensitive; `True`, `TRUE` are invalid)
- Integer sign prefix (`+`/`-`) is only valid on decimal integers, not hex/octal/binary
- Block comments (`/* */`) must be closed
- String literals must be terminated

---

## CI / Release Workflows

Located in `.github/workflows/`:
- `build-extension-package.yml` — builds and packages vsix on push/PR
- `publish-extension-release.yml` — publishes GitHub release
- `publish-extension-marketplace.yml` — publishes to VS Code Marketplace (triggered by tag `v*` or manual dispatch with an existing release tag)
