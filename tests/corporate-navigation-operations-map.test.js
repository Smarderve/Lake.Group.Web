'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const routeReference = /africa-network\.html/i;

test('Operations Map page and public route references are removed', () => {
  assert.equal(fs.existsSync(path.join(root, 'africa-network.html')), false, 'Operations Map page is removed');
  const files = fs.readdirSync(root).filter((file) => file.endsWith('.html'));
  for (const file of files) {
    assert.doesNotMatch(fs.readFileSync(path.join(root, file), 'utf8'), routeReference, `${file}: no Operations Map route reference`);
  }
  for (const file of ['scripts/templates/nav.html', 'scripts/templates/mobile_nav.html']) {
    assert.doesNotMatch(fs.readFileSync(path.join(root, file), 'utf8'), routeReference, `${file}: canonical menu has no Operations Map route reference`);
  }
});
