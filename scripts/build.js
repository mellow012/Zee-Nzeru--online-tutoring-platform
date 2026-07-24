const { execSync } = require('child_process');
const path = require('path');

console.log('Building Next.js application...');
try {
  const nextBin = path.join(__dirname, '..', 'node_modules', 'next', 'dist', 'bin', 'next');
  execSync(`node "${nextBin}" build`, { stdio: 'inherit', cwd: path.join(__dirname, '..') });
} catch (err) {
  process.exit(1);
}

// Run copy-build-assets
require('./copy-build-assets.js');
