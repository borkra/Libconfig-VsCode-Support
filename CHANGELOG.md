# Change Log

All notable changes to this extension are documented in this file.

## [Unreleased]

- Version 1.0.4 was never released; its planned changes are tracked here.
- Fixed parsing/validation issue: comma setting terminators now raise a portability warning instead of being silently accepted.
- Fixed parsing/validation issue: missing ';' setting terminators now raise a portability warning for parser compatibility.
- Fixed parsing/validation issue: trailing commas in lists now raise a compatibility warning.
- Fixed parsing/validation issue: trailing commas in arrays now raise a compatibility warning.
- Fixed parsing/validation issue: spec-variant syntax no longer produces false-positive error diagnostics.
- Fixed parsing/validation issue: signed base-prefixed numeric forms (for example +0x10, -0b11) are now rejected consistently instead of being misparsed.
- Added compatibility diagnostics for setting terminators to flag parser-version incompatibilities.
- Missing ';' and ',' setting terminators now surface portability warnings (code 0x300).
- Fixed extension activation/disposal lifecycle handling to avoid DisposableStore disposed-state errors on reload/reinstall.
- Allow hex digits of arbitrary length.
- Added automatic language detection for files matching sw-description*.
- Fixed parser CPU spin scenarios by guaranteeing forward progress in recovery loops.

## [1.0.3]

- Allow capital 0X in hex code value specifier.

## [1.0.2]

- Maintenance update.

## [1.0.1]

- Maintenance update.

## [1.0.0]

- Initial release.
