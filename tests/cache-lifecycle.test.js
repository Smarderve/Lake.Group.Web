'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
const precacheBlock = sw.match(/const PRECACHE_URLS = \[(.*?)\];/s);
assert.ok(precacheBlock, 'service worker precache manifest is present');

const urls = [...precacheBlock[1].matchAll(/'([^']+)'/g)].map((match) => match[1]);
assert.ok(urls.length > 0, 'service worker precache manifest is not empty');

for (const url of urls) {
  const pathname = url.split('?')[0].replace(/^\.\//, '');
  assert.ok(!pathname.includes('..'), `precache entry stays within the web root: ${url}`);
  assert.ok(fs.existsSync(path.join(ROOT, pathname)), `precache entry exists: ${url}`);
}

assert.match(sw, /const VERSION = 'v74-20260828-01'/);
assert.match(sw, /self\.skipWaiting\(\)/);
assert.match(sw, /self\.clients\.claim\(\)/);
assert.match(sw, /name\.startsWith\('lake-'\) && !KNOWN_CACHES\.includes\(name\)/);
assert.match(sw, /fetch\(request, \{ cache: 'no-cache' \}\)/);
assert.match(sw, /request\.mode === 'navigate' \|\| request\.destination === 'document'/);
assert.doesNotMatch(sw, /terminal-overview\.jpg|fleet-loading\.jpg|depot-terminal\.jpg/);

console.log(`Cache lifecycle check: ${urls.length} precache entries validated; v74 lifecycle controls present.`);
