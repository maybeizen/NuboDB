#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = __dirname;

const isWindows = process.platform === 'win32';
const binaryName = isWindows ? 'nubodb-native.exe' : 'nubodb-native';
const distDir = join(rootDir, 'dist');
const binaryPath = join(distDir, binaryName);
const goDir = join(rootDir, 'native', 'go');

function log(message) {
  console.log(`[build] ${message}`);
}

function checkCommand(command) {
  try {
    execSync(`which ${command}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function buildGo() {
  log('Building Go binary...');

  if (!checkCommand('go')) {
    log('⚠️  Go not found in PATH. Skipping Go build.');
    log('   Install Go from https://go.dev/dl/ to enable native acceleration.');
    return false;
  }

  try {
    if (!existsSync(distDir)) {
      mkdirSync(distDir, { recursive: true });
    }

    log(`   Compiling Go code...`);
    execSync(`go build -o "${binaryPath}" "${goDir}"`, {
      cwd: goDir,
      stdio: 'inherit',
      env: {
        ...process.env,
        CGO_ENABLED: '0',
      },
    });

    log(`✅ Go binary built: ${binaryPath}`);
    return true;
  } catch (error) {
    log(
      `❌ Go build failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    log('   Falling back to TypeScript-only build.');
    return false;
  }
}

function buildTypeScript() {
  log('Building TypeScript...');

  try {
    execSync('npx tsup', {
      cwd: rootDir,
      stdio: 'inherit',
    });

    log('✅ TypeScript build completed');
    return true;
  } catch (error) {
    log(
      `❌ TypeScript build failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    return false;
  }
}

function main() {
  log('Starting build process...\n');

  const tsSuccess = buildTypeScript();
  log('');

  const goSuccess = buildGo();

  log('');
  if (goSuccess && tsSuccess) {
    log('✅ Build completed successfully!');
    if (goSuccess) {
      log(`   Go binary: ${binaryPath}`);
    }
    log(`   TypeScript: dist/`);
  } else if (tsSuccess) {
    log('✅ Build completed (TypeScript only)');
    log('   Go binary: Not built (Go not available)');
  } else {
    log('❌ Build failed');
    process.exit(1);
  }
}

main();
