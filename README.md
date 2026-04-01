# LibConfig README
A VS Code extension that provides language support and validation for LibConfig files.

See https://github.com/hyperrealm/libconfig for more details on libconfig specification

## Features
This package provides:
- Language support and validation for LibConfig configuration files
- Syntax highlighting and automatic language detection for `*.cfg` files
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

See [CHANGELOG.md](CHANGELOG.md) for the full release history.
