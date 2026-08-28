'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'assets/home-hero.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets/home-redesign.css'), 'utf8');

assert.match(html, /data-hero-mobile-indicator/);
assert.equal((html.match(/data-hero-mobile-sector="\d"/g) || []).length, 0);
assert.doesNotMatch(html, /aria-haspopup="listbox"/);
assert.match(js, /data-hero-mobile-sector-label/);
assert.match(js, /hero-mobile-sector-progress/);
assert.match(js, /mobileProgress\.classList\.add\("is-running"\)/);
assert.doesNotMatch(js, /mobileTrigger|mobileOptions|mobileOptionButtons|closeMobileSelector/);
assert.match(css, /@media \(max-width: 720px\)[\s\S]*?\.hero-tabs\s*\{\s*display: none/);
assert.match(css, /hero-mobile-sector-indicator[\s\S]*?pointer-events: none/);
assert.match(css, /hero-mobile-sector-progress[\s\S]*?lake-mobile-sector-progress 8s/);

console.log('Homepage mobile sector indicator checks passed');
