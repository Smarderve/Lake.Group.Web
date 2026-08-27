'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'assets/home-hero.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets/home-redesign.css'), 'utf8');

assert.match(html, /data-hero-mobile-selector/);
assert.equal((html.match(/data-hero-mobile-sector="\d"/g) || []).length, 6);
assert.match(html, /aria-haspopup="listbox"/);
assert.match(js, /data-hero-mobile-sector-label/);
assert.match(js, /setActive\(index\);\s*schedule\(\);\s*closeMobileSelector/);
assert.match(js, /event\.key === "Escape"/);
assert.match(css, /@media \(max-width: 720px\)[\s\S]*?\.hero-tabs\s*\{\s*display: none/);
assert.match(css, /@media \(max-width: 720px\)[\s\S]*?\.hero-mobile-sector-selector\s*\{[\s\S]*?backdrop-filter: blur\(10px\)/);
assert.match(css, /hero-mobile-sector-options button[\s\S]*?min-height: 44px/);

console.log('Homepage mobile sector selector checks passed');
