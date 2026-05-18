const fs = require('fs');
const path = require('path');

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

console.log('Copying static assets to standalone directory...');

// Copy .next/static to .next/standalone/.next/static
const staticSrc = path.join(__dirname, '..', '.next', 'static');
const staticDest = path.join(__dirname, '..', '.next', 'standalone', '.next', 'static');

if (fs.existsSync(staticSrc)) {
  copyRecursiveSync(staticSrc, staticDest);
  console.log('Copied .next/static to .next/standalone/.next/static');
} else {
  console.warn('Warning: .next/static not found');
}

// Copy public to .next/standalone/public
const publicSrc = path.join(__dirname, '..', 'public');
const publicDest = path.join(__dirname, '..', '.next', 'standalone', 'public');

if (fs.existsSync(publicSrc)) {
  copyRecursiveSync(publicSrc, publicDest);
  console.log('Copied public to .next/standalone/public');
} else {
  console.warn('Warning: public directory not found');
}

console.log('Assets copy complete.');
