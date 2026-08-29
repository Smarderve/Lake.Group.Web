'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const menuAnchor = /<a href="africa-network\.html">Operations Map<\/a>/i;

test('Operations Map is retained as a page but absent from all public Corporate menu markup', () => {
  assert.ok(fs.existsSync(path.join(root, 'africa-network.html')), 'Operations Map page remains available');
  const files = fs.readdirSync(root).filter((file) => file.endsWith('.html'));
  for (const file of files) {
    assert.doesNotMatch(fs.readFileSync(path.join(root, file), 'utf8'), menuAnchor, `${file}: no Operations Map Corporate-menu link`);
  }
  for (const file of ['scripts/templates/nav.html', 'scripts/templates/mobile_nav.html']) {
    assert.doesNotMatch(fs.readFileSync(path.join(root, file), 'utf8'), menuAnchor, `${file}: canonical menu has no Operations Map link`);
  }
});
