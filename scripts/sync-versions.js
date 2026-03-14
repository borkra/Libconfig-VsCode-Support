#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

function readJson(filePath) {
	return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
	fs.writeFileSync(filePath, `${JSON.stringify(value, null, '\t')}\n`, 'utf8');
}

function syncPackageVersion(packagePath, version) {
	const pkg = readJson(packagePath);
	pkg.version = version;
	writeJson(packagePath, pkg);
	return pkg;
}

function syncLockfile(lockfilePath, packageName, version) {
	if (!fs.existsSync(lockfilePath)) {
		return;
	}
	const lock = readJson(lockfilePath);
	lock.name = packageName;
	lock.version = version;
	if (lock.packages && lock.packages['']) {
		lock.packages[''].name = packageName;
		lock.packages[''].version = version;
	}
	writeJson(lockfilePath, lock);
}

function main() {
	const rootPackagePath = path.join(rootDir, 'package.json');
	const rootPackage = readJson(rootPackagePath);
	const rootVersion = rootPackage.version;

	if (!rootVersion) {
		throw new Error('Root package.json has no version field.');
	}

	const packageDirs = ['client', 'server'];
	for (const dir of packageDirs) {
		const packagePath = path.join(rootDir, dir, 'package.json');
		const lockfilePath = path.join(rootDir, dir, 'package-lock.json');
		const pkg = syncPackageVersion(packagePath, rootVersion);
		syncLockfile(lockfilePath, pkg.name, rootVersion);
	}

	console.log(`Synchronized client/server versions to ${rootVersion}`);
}

main();
