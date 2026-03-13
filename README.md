# LibConfig README
A VS Code extension that provides language support and validation for LibConfig files.

See https://github.com/hyperrealm/libconfig for more details on libconfig specification

## Features
This package provides:
- Language support and validation for LibConfig configuration files
- Syntax highlighting and automatic language detection for `*.cfg` and
  `sw-description*` files
- Brace-based code folding
- Syntax error hints/diagnostics
- `@include "path"` directive tokenization support
- Case-insensitive boolean keyword parsing (`true`/`false`, including
  upper-case variants)
- Binary, octal, and hex integer parsing support (`0b`/`0B`, `0o`/`0O`,
  `0q`/`0Q`, and `0x`/`0X`)

## Extension Settings
This extension contributes:
- libConfigServer.maxNumberOfProblems: controls the maximum number of
  diagnostics produced by the language server.
- libConfigServer.trace.server: traces communication between VS Code and
  the language server (off/messages/verbose).

## Known Issues
None

## Previous Maintainers
- wegman12 (https://github.com/wegman12/Libconfig-VsCode-Support)
- mtayler (https://github.com/mtayler/Libconfig-VsCode-Support)

## Release Notes

### Unreleased
- Version 1.0.4 was never released; its planned changes are tracked here.
- Missing `;` and `,` setting terminators and trailing commas
  (lists/arrays) now raise compatibility/portability warnings instead of
  being silently accepted or unconditionally rejected
- Fixed parsing/validation issue: spec-variant syntax no longer produces
  false-positive error diagnostics.
- Fixed parsing/validation issue: signed base-prefixed numeric forms (for
  example +0x10, -0b11) are now rejected consistently instead of being
  misparsed.
- Fixed extension activation/disposal lifecycle handling to avoid
  DisposableStore disposed-state errors on reload/reinstall.
- Added scanner support for `@include` directives.
- Added case-insensitive boolean keyword parsing for `true`/`false`.
- Added binary (`0b`/`0B`) and octal (`0o`/`0O`, `0q`/`0Q`) integer
  parsing support.
- Allow hex digits of arbitrary length.
- Added automatic language detection for files matching sw-description*.
- Fixed parser CPU spin scenarios by guaranteeing forward progress in
  recovery loops.

### 1.0.3
- Allow capital 0X in hex code value specifier.
