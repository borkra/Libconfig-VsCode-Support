#!/usr/bin/env node
'use strict';

const { execSync } = require('child_process');
const path = require('path');

const EXTENSION_ID = 'borkra.libconfig-lang';
const CONFLICTING_EXTENSION_IDS = [
	'tmulligan.libconfig-lang',
	'wegman12.cfg-language-features'
];
const VSIX_FILE = path.resolve(__dirname, '..', 'libconfig-lang.vsix');

/**
 * Execute a shell command and return the output
 */
function exec(command, options = {}) {
	try {
		return execSync(command, { 
			encoding: 'utf8',
			stdio: options.silent ? 'pipe' : 'inherit',
			...options 
		});
	} catch (error) {
		if (!options.ignoreErrors) {
			throw error;
		}
		return null;
	}
}

/**
 * Get list of all installed extensions for a VS Code variant
 */
function getInstalledExtensions(codeCommand) {
	try {
		const output = exec(`${codeCommand} --list-extensions --show-versions`, { 
			silent: true,
			ignoreErrors: true 
		});
		if (!output) return [];
		
		return output.trim().split('\n').map(line => {
			const match = line.match(/^(.+)@(.+)$/);
			return match ? { id: match[1], version: match[2] } : null;
		}).filter(Boolean);
	} catch (error) {
		console.warn(`Warning: Could not list extensions for ${codeCommand}`);
		return [];
	}
}

/**
 * Get extension manifest to check dependencies
 */
function getExtensionManifest(codeCommand, extensionId) {
	try {
		// Try to read the extension's package.json
		// This is a simplified approach - VS Code doesn't expose extension dependencies easily via CLI
		const homeDir = process.env.HOME || process.env.USERPROFILE;
		const extensionsDir = codeCommand.includes('insiders') 
			? path.join(homeDir, '.vscode-insiders', 'extensions')
			: path.join(homeDir, '.vscode', 'extensions');
		
		const fs = require('fs');
		if (!fs.existsSync(extensionsDir)) return null;
		
		const extensions = fs.readdirSync(extensionsDir);
		const extFolder = extensions.find(dir => dir.startsWith(extensionId.toLowerCase()));
		
		if (!extFolder) return null;
		
		const packageJsonPath = path.join(extensionsDir, extFolder, 'package.json');
		if (fs.existsSync(packageJsonPath)) {
			return JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
		}
	} catch (error) {
		// Silently fail
	}
	return null;
}

/**
 * Find extensions that depend on the target extension
 */
function findDependentExtensions(codeCommand, targetExtensionId) {
	const installed = getInstalledExtensions(codeCommand);
	const dependents = [];
	
	for (const ext of installed) {
		if (ext.id === targetExtensionId) continue;
		
		const manifest = getExtensionManifest(codeCommand, ext.id);
		if (manifest && manifest.extensionDependencies) {
			if (manifest.extensionDependencies.includes(targetExtensionId)) {
				dependents.push({
					id: ext.id,
					version: ext.version,
					name: manifest.displayName || ext.id
				});
			}
		}
	}
	
	return dependents;
}

/**
 * Uninstall an extension
 */
function uninstallExtension(codeCommand, extensionId) {
	console.log(`  → Uninstalling ${extensionId}...`);
	exec(`${codeCommand} --uninstall-extension ${extensionId}`, { ignoreErrors: true });
}

/**
 * Install an extension
 */
function installExtension(codeCommand, vsixPath) {
	console.log(`  → Installing ${path.basename(vsixPath)}...`);
	exec(`${codeCommand} --install-extension ${vsixPath} --force`);
}

/**
 * Smart reinstall for a specific VS Code variant
 */
function smartReinstall(codeCommand, extensionId, vsixPath) {
	console.log(`\n🔍 Checking ${codeCommand}...`);
	
	// Check if extension is installed
	const installed = getInstalledExtensions(codeCommand);
	const isInstalled = installed.some(ext => ext.id === extensionId);
	
	if (!isInstalled) {
		for (const conflictingId of CONFLICTING_EXTENSION_IDS) {
			uninstallExtension(codeCommand, conflictingId);
		}
		console.log(`  ℹ Extension not installed, installing...`);
		installExtension(codeCommand, vsixPath);
		return;
	}
	
	// Find dependent extensions
	console.log(`  🔎 Scanning for dependent extensions...`);
	const dependents = findDependentExtensions(codeCommand, extensionId);
	
	if (dependents.length > 0) {
		console.log(`  ⚠️  Found ${dependents.length} dependent extension(s):`);
		dependents.forEach(dep => {
			console.log(`     - ${dep.name} (${dep.id}@${dep.version})`);
		});
		
		console.log(`  📦 Uninstalling dependent extensions first...`);
		dependents.forEach(dep => {
			uninstallExtension(codeCommand, dep.id);
		});
	} else {
		console.log(`  ✓ No dependent extensions found`);
	}

	for (const conflictingId of CONFLICTING_EXTENSION_IDS) {
		uninstallExtension(codeCommand, conflictingId);
	}
	
	// Uninstall main extension
	console.log(`  🗑️  Uninstalling ${extensionId}...`);
	uninstallExtension(codeCommand, extensionId);
	
	// Reinstall main extension
	console.log(`  📦 Installing ${extensionId} from VSIX...`);
	installExtension(codeCommand, vsixPath);
	
	// Note about dependent extensions
	if (dependents.length > 0) {
		console.log(`  ⚠️  Note: Dependent extensions were removed and not reinstalled automatically.`);
		console.log(`     You may need to reinstall them manually:`);
		dependents.forEach(dep => {
			console.log(`     - ${dep.id}`);
		});
	}
	
	console.log(`  ✅ Done!`);
}

/**
 * Main function
 */
function main() {
	console.log('═══════════════════════════════════════════════════════════');
	console.log('  Smart Extension Reinstaller for LibConfig VS Code Support');
	console.log('═══════════════════════════════════════════════════════════');
	
	// Check if VSIX exists
	const fs = require('fs');
	if (!fs.existsSync(VSIX_FILE)) {
		console.error(`\n❌ Error: VSIX file not found at ${VSIX_FILE}`);
		console.error('   Run "npm run package:local" first to build the VSIX.');
		process.exit(1);
	}
	
	// Reinstall for VS Code stable
	try {
		smartReinstall('code', EXTENSION_ID, VSIX_FILE);
	} catch (error) {
		console.error(`\n❌ Error with VS Code stable: ${error.message}`);
	}
	
	// Reinstall for VS Code Insiders
	try {
		smartReinstall('code-insiders', EXTENSION_ID, VSIX_FILE);
	} catch (error) {
		console.error(`\n❌ Error with VS Code Insiders: ${error.message}`);
	}
	
	console.log('\n═══════════════════════════════════════════════════════════');
	console.log('  Reinstall Complete!');
	console.log('═══════════════════════════════════════════════════════════\n');
}

if (require.main === module) {
	main();
}

module.exports = { smartReinstall, findDependentExtensions };
