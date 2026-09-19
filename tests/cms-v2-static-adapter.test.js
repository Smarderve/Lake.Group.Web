const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

test('Lake Aviation CMS V2 adapter uses only the isolated verified release path', () => {
  const page = fs.readFileSync(path.join(root, 'lake-aviation.html'), 'utf8');
  const config = fs.readFileSync(path.join(root, 'assets', 'cms-content-v2-config.js'), 'utf8');
  const adapter = fs.readFileSync(path.join(root, 'assets', 'cms-content-v2.js'), 'utf8');
  assert.match(page, /cms-content-v2-config\.js/);
  assert.match(config, /enabled:\s*true/);
  assert.match(config, /pointerUrl:\s*'\/public-content\/cms-v2\/current\.json'/);
  assert.match(adapter, /if \(config\.enabled !== true\) return/);
  assert.match(adapter, /releases\\\/\[a-zA-Z0-9_-\]\+\\\/content\\\.json/);
  assert.match(adapter, /public-content\/cms-v2/);
  assert.match(adapter, /snapshot\.schemaVersion !== 1/);
  assert.match(page, /data-cms-field="hero\.heading"/);
});
