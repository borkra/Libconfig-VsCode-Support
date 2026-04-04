# Change Log

## Unreleased
- No changes yet.

## 1.1.1
- Updated documentation per VSCode marketplace requirements

## 1.1.0
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
- Better editor responsiveness by fixing parser recovery loops that could
  cause hang and 100% CPU utilizaton.
- Added context-aware autocomplete suggestions for booleans,
  `@include` directives, value snippets, and setting/group templates.

## 1.0.3
- Allow capital 0X in hex code value specifier.
