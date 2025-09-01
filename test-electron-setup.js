#!/usr/bin/env node

// Simple test script to verify Electron setup
const fs = require('fs');
const path = require('path');

console.log('🔍 Testing Electron Setup...\n');

// Check if required files exist
const requiredFiles = [
  'package.json',
  'electron/main.js',
  'electron/preload.js',
  'electron/README.md',
  'frontend/src/types/electron.d.ts',
  'frontend/src/hooks/useElectron.ts'
];

let allFilesExist = true;

requiredFiles.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(`${exists ? '✅' : '❌'} ${file}`);
  if (!exists) allFilesExist = false;
});

console.log('\n📋 Package.json Scripts:');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const electronScripts = [
  'dev',
  'electron:dev',
  'build',
  'build:electron',
  'dist',
  'dist:win',
  'dist:mac',
  'dist:linux'
];

electronScripts.forEach(script => {
  const exists = packageJson.scripts && packageJson.scripts[script];
  console.log(`${exists ? '✅' : '❌'} ${script}`);
});

console.log('\n🔧 Electron Dependencies:');
const electronDeps = ['electron', 'electron-builder', 'wait-on'];
electronDeps.forEach(dep => {
  const exists = packageJson.devDependencies && packageJson.devDependencies[dep];
  console.log(`${exists ? '✅' : '❌'} ${dep}`);
});

console.log('\n📦 Build Configuration:');
const hasBuildConfig = packageJson.build;
console.log(`${hasBuildConfig ? '✅' : '❌'} electron-builder configuration`);

if (allFilesExist && hasBuildConfig) {
  console.log('\n🎉 Electron setup is complete!');
  console.log('\nNext steps:');
  console.log('1. Install dependencies: npm install');
  console.log('2. Start development: npm run dev');
  console.log('3. Build for production: npm run build');
  console.log('4. Create distributable: npm run dist');
} else {
  console.log('\n⚠️  Some files or configurations are missing. Please check the setup.');
}
