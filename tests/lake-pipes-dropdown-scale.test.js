'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const nav = fs.readFileSync(path.join(root, 'scripts', 'templates', 'nav.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets', 'phase-01-navbar.css'), 'utf8');

test('Manufacturing dropdown uses the official yellow Lake Pipes asset at a comparable visual scale', () => {
  assert.match(nav, /lake-pipes-dropdown-yellow\.png" alt="Lake Pipes"/);
  assert.doesNotMatch(nav, /lake-pipes-blue\.png" alt="Lake Pipes"/);
  assert.match(css, /img\[src\*="lake-pipes-dropdown-yellow\.png"\][\s\S]*?max-width:\s*132px/i);
  assert.ok(fs.existsSync(path.join(root, 'assets', 'images', 'logos', 'companies', 'lake-pipes-dropdown-yellow.png')));
});

test('all public desktop Manufacturing dropdown copies use the yellow Lake Pipes asset', () => {
  const pages = fs.readdirSync(root).filter((file) => file.endsWith('.html'));
  for (const page of pages) {
    const source = fs.readFileSync(path.join(root, page), 'utf8');
    if (!source.includes('data-mm-pane="manufacturing"')) continue;
    assert.match(source, /lake-pipes-dropdown-yellow\.png" alt="Lake Pipes"/, page);
    assert.doesNotMatch(source, /lake-pipes-blue\.png" alt="Lake Pipes"/, page);
  }
});
