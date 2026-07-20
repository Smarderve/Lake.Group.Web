/**
 * Bundles assets/hero-globe → assets/hero-globe.bundle.js (classic IIFE).
 * Usage: node scripts/build_hero_globe.js
 */
const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const outfile = path.join(root, 'assets', 'hero-globe.bundle.js');

esbuild
  .build({
    entryPoints: [path.join(root, 'assets', 'hero-globe', 'mount.jsx')],
    bundle: true,
    minify: true,
    format: 'iife',
    outfile,
    jsx: 'automatic',
    loader: { '.js': 'jsx' },
    define: { 'process.env.NODE_ENV': '"production"' },
    logLevel: 'info',
  })
  .then(() => {
    const bytes = fs.statSync(outfile).size;
    console.log(`Built assets/hero-globe.bundle.js (${bytes} bytes, ${(bytes / 1024).toFixed(1)} KB)`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
