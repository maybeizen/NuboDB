#!/usr/bin/env node

import { execSync } from 'child_process';
import { readdirSync } from 'fs';
import { join } from 'path';

console.log('🚀 NuboDB Examples Runner\n');

const examplesDir = join(process.cwd(), 'examples');
const exampleFiles = readdirSync(examplesDir)
  .filter(file => file.endsWith('.js') && file !== 'index.js')
  .sort();

console.log(`Found ${exampleFiles.length} examples:\n`);

for (const file of exampleFiles) {
  console.log(`📋 Running: ${file}`);
  console.log('─'.repeat(50));

  try {
    execSync(`node ${join(examplesDir, file)}`, {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
    console.log('✅ Completed successfully\n');
  } catch (error) {
    console.log('❌ Failed to run example\n');
  }
}

console.log('🎉 All examples completed!');
console.log('\n📚 For more information, see:');
console.log('   - README.md - Complete documentation');
console.log('   - CONTRIBUTING.md - How to contribute');
console.log('   - DEVELOPING.md - Development guide');
console.log('   - CHANGELOG.md - Version history');
