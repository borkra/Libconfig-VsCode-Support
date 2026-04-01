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

## Publishing a Release

### 1. Create a GitHub Release (and tag)

Trigger the **Publish Extension Release** workflow (`.github/workflows/publish-extension-release.yml`) via one of:

- **Workflow dispatch** — go to *Actions → Publish Extension Release → Run workflow* and enter the version (e.g. `1.2.0`).
- **PR label** — add a label in the format `release:v1.2.0` (or just `v1.2.0`) to any open PR targeting `master`.

The workflow will:
1. Bump the version in all `package.json` files via `npm run update:version`.
2. Commit and push a `chore(release): vX.Y.Z` commit to `master`.
3. Create and push the `vX.Y.Z` tag.
4. Build and package `libconfig-lang.vsix`.
5. Create a GitHub Release with the VSIX attached.

### 2. Publish to Marketplace

Once the GitHub Release exists, the **Publish VS Code Marketplace Extension** workflow
(`.github/workflows/publish-extension-marketplace.yml`) runs automatically on the `v*` tag push.

To publish manually from an existing release tag:
- Go to *Actions → Publish VS Code Marketplace Extension → Run workflow* and enter the existing tag (e.g. `v1.2.0`).

Required repository secrets:
- `VSCE_PAT` — personal access token for the VS Code Marketplace.
- `OVSX_PAT` — personal access token for the Open VSX Registry.