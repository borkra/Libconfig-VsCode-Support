# Development

## Local Extension Install

- `npm run package:local`: compile, bundle, and package the extension as `libconfig-lang.vsix`.
- `npm run install:local`: build, package, and force-install the current VSIX into `code` and `code-insiders`.
- `npm run reinstall:local`: attempt uninstall first, then force-install again.
- `npm run reinstall:smart`: **recommended** - intelligently detects and handles dependent extensions before reinstalling.

## Clean Reinstall

### Smart Reinstall (Recommended)

Use `npm run reinstall:smart` for an intelligent reinstall that:

1. **Automatically detects** extensions that depend on `borkra.libconfig-lang`
2. **Uninstalls dependent extensions first** (avoiding VS Code's dependency lock)
3. **Removes the current extension** completely
4. **Reinstalls from the VSIX**
5. **Reports** which dependent extensions were removed (so you can reinstall them if needed)

This solves the common issue where VS Code refuses to uninstall an extension that other extensions depend on.

### Manual Reinstall Caveat

If using `npm run reinstall:local` instead:

If another extension depends on `borkra.libconfig-lang`, VS Code can refuse the uninstall step. In that case, remove the dependent extension first if you need a truly clean reinstall, or use `npm run reinstall:smart` instead.