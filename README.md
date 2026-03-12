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

## CI and Packaging
- Build workflow: .github/workflows/build-extension-package.yml
- Release workflow (tag-based VSIX publish): .github/workflows/publish-extension-release.yml

Push a tag matching v* (for example v1.0.5) to trigger VSIX packaging and release upload.

## Known Issues
None

## Release Notes

### 1.0.4
- Allow hex digits of arbitrary length.
- Add GitHub Actions workflow for extension package builds.
- Add GitHub Actions workflow for tag-based VSIX release publishing.
- Added automatic language detection for files matching sw-description*.
- Fixed parser CPU spin scenarios by guaranteeing forward progress in recovery loops.
- Updated test harness to use @vscode/test-electron and removed deprecated test dependencies.
- Reduced publish package contents using stricter .vscodeignore rules.

### 1.0.3
- Allow capital 0X in hex code value specifier.
