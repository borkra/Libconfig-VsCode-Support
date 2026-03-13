# LibConfig README
A maintenance fork of the original LibConfig VS Code extension repository, providing language support for C++ LibConfig files.
The original extension appeared unmaintained with various outstanding pull requests.

Original extension repo at https://github.com/wegman12/Libconfig-VsCode-Support

## Former Maintainers
- wegman12
- mtayler

See https://github.com/hyperrealm/libconfig for more details on libconfig specifications

Many features were modified from the JSON functionality of VSCode:

- https://github.com/microsoft/vscode.git
- https://github.com/microsoft/vscode-json-languageservice
- https://github.com/microsoft/node-jsonc-parser.git

## Features
This package provides:
- Syntax highlighting for .cfg files
- Brace-based code folding
- Syntax error hints/diagnostics
- Automatic language detection for files matching sw-description*
- Hex parsing support for 0x and 0X prefixes
- Hex digit sequences of arbitrary length


## Extension Settings
This extension contributes:
- libConfigServer.maxNumberOfProblems: controls the maximum number of diagnostics produced by the language server.
- libConfigServer.trace.server: traces communication between VS Code and the language server (off/messages/verbose).

## Known Issues
None

## Release Notes

### Unreleased
- Version 1.0.4 was never released; its planned changes are tracked here.
- Fixed parsing/validation issue: comma setting terminators now raise a portability warning instead of being silently accepted.
- Fixed parsing/validation issue: missing ';' setting terminators now raise a portability warning for parser compatibility.
- Fixed parsing/validation issue: trailing commas in lists now raise a compatibility warning.
- Fixed parsing/validation issue: trailing commas in arrays now raise a compatibility warning.
- Fixed parsing/validation issue: spec-variant syntax no longer produces false-positive error diagnostics.
- Fixed parsing/validation issue: signed base-prefixed numeric forms (for example +0x10, -0b11) are now rejected consistently instead of being misparsed.
- Added compatibility diagnostics for setting terminators so files are flagged when they rely on parser-variant behavior.
- Missing ';' and ',' setting terminators now produce portability warnings (code 0x300) instead of being silently accepted.
- Fixed extension activation/disposal lifecycle handling to avoid DisposableStore disposed-state errors on reload/reinstall.
- Allow hex digits of arbitrary length.
- Added automatic language detection for files matching sw-description*.
- Fixed parser CPU spin scenarios by guaranteeing forward progress in recovery loops.

### 1.0.3
- Allow capital 0X in hex code value specifier.
