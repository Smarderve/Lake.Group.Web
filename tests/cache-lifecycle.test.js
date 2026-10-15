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

assert.match(sw, /const VERSION = 'v110-20261015-03'/);
assert.ok(urls.includes('./assets/i18n.js?v=20261015-01'), 'i18n runtime precache uses the current release');
assert.ok(urls.includes('./assets/phase-01-navbar.css?v=20261015-01'), 'language menu CSS precache uses the current release');
assert.ok(urls.includes('./assets/assistant.js?v=20261013-02'), 'assistant JavaScript precache uses the current release');
assert.ok(urls.includes('./assets/assistant.css?v=20261015-01'), 'assistant CSS precache uses the current release');
assert.ok(urls.includes('./assets/home-hero.js?v=20261015-02'), 'homepage hero JavaScript precache uses the current release');
assert.match(sw, /await self\.skipWaiting\(\)/, 'the current worker activates without waiting for closed tabs');
assert.match(sw, /await self\.clients\.claim\(\)/, 'future navigations are claimed without reloading visible tabs');
assert.match(sw, /name\.startsWith\('lake-'\) && !KNOWN_CACHES\.includes\(name\)/);
assert.match(sw, /fetch\(request, \{ cache: 'no-cache' \}\)/);
assert.match(sw, /request\.mode === 'navigate' \|\| request\.destination === 'document'/);
assert.match(sw, /return 'network-first-asset'/);
assert.doesNotMatch(sw, /terminal-overview\.jpg|fleet-loading\.jpg|depot-terminal\.jpg/);

console.log(`Cache lifecycle check: ${urls.length} precache entries validated; current network-first lifecycle controls present.`);
