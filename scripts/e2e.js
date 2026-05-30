const path = require('path');
const { runTests } = require('@vscode/test-electron');

async function main() {
  try {
    // When invoked from VS Code's integrated terminal (or any Electron-based shell),
    // ELECTRON_RUN_AS_NODE=1 is inherited. That makes the downloaded VS Code binary run
    // as plain Node, treating the test workspace path as a script to execute and failing
    // with "Cannot find module .../client/testFixture". Scrub it before launching VS Code.
    delete process.env.ELECTRON_RUN_AS_NODE;

    const extensionDevelopmentPath = path.resolve(__dirname, '..');
    const extensionTestsPath = path.resolve(__dirname, '../client/out/test/index.js');
    const testWorkspace = path.resolve(__dirname, '../client/testFixture');

    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [testWorkspace, '--disable-extensions']
    });
  } catch (err) {
    console.error('Failed to run extension tests');
    console.error(err);
    process.exit(1);
  }
}

main();
