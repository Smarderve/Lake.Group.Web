'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const nav = fs.readFileSync(path.join(root, 'scripts', 'templates', 'nav.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets', 'phase-01-navbar.css'), 'utf8');

test('Manufacturing dropdown uses the official blue Lake Pipes asset at a comparable visual scale', () => {
  assert.match(nav, /lake-pipes-blue\.png" alt="Lake Pipes"/);
  assert.doesNotMatch(nav, /lake-pipes\.png" alt="Lake Pipes"/);
  assert.match(css, /img\[src\*="lake-pipes-blue\.png"\][\s\S]*?max-width:\s*132px/i);
});
