# LibConfig README
A VS Code extension that provides language support and validation for LibConfig files.

See https://github.com/hyperrealm/libconfig for more details on libconfig specification

## Features
This package provides:
- Language support and validation for LibConfig configuration files
- Syntax highlighting and automatic language detection for `*.cfg` and
  `sw-description*` files
- Brace-based code folding
- Autocomplete suggestions for common LibConfig constructs
- Syntax error hints/diagnostics
- `@include "path"` directive tokenization support
- Case-insensitive boolean keyword parsing (`true`/`false`, including
  upper-case variants)
- Binary, octal, and hex integer parsing support (`0b`/`0B`, `0o`/`0O`,
  `0q`/`0Q`, and `0x`/`0X`)

## Parser API (For Other Extensions)
Parser API documentation is available in:
- [docs/PARSER_API.md](docs/PARSER_API.md)

## Extension Settings
This extension contributes:
- libConfigServer.trace.server: traces communication between VS Code and
  the language server (off/messages/verbose).

## Known Issues
None

## Previous Maintainers
- wegman12 (https://github.com/wegman12/Libconfig-VsCode-Support)
- mtayler (https://github.com/mtayler/Libconfig-VsCode-Support)

## Release Notes

### Unreleased
- No changes yet.

### 1.1.0
- Documented the public parser provider API for extension-to-extension


  integration (`getParsedDocument`, API versioning, and consumer example).
- Better reliability on modern VS Code versions thanks to a language
  server stack upgrade (`vscode-languageclient`/`vscode-languageserver`
  9.x).
- Set compatibility to VS Code `1.82.0` and newer.
- Internal cleanup: updated to current language server APIs and removed
  unused or no longer required code.
- Better compatibility guidance: missing `;`/`,` terminators and trailing
  commas in lists/arrays now show portability warnings instead of being
  silently accepted or always rejected.
- Fewer false alarms: spec-variant syntax no longer triggers incorrect
  error diagnostics.
- Safer numeric parsing: invalid signed base-prefixed values (for example
  `+0x10`, `-0b11`) are now consistently rejected.
- More stable extension reload/reinstall behavior by fixing activation and
  disposal lifecycle issues.
- Better syntax support for `@include "path"` directives.
- Better boolean compatibility: `true`/`false` are now parsed
  case-insensitively.
- Better numeric compatibility: binary (`0b`/`0B`) and octal
  (`0o`/`0O`, `0q`/`0Q`) forms are now supported.
- Improved numeric handling by allowing hex digits of arbitrary length.
- Better file detection: files matching `sw-description*` are now
  auto-detected as LibConfig.
- Better editor responsiveness by fixing parser recovery loops that could
  cause hang and 100% CPU utilitzation.
- Added context-aware autocomplete suggestions for booleans,
  `@include` directives, value snippets, and setting/group templates.

### 1.0.3
- Allow capital 0X in hex code value specifier.
