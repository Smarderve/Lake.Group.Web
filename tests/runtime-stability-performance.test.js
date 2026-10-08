'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..');
const globe = fs.readFileSync(path.join(ROOT, 'globe-lab', 'entry.tsx'), 'utf8');
const marquee = fs.readFileSync(path.join(ROOT, 'assets', 'components', 'logo-loop-mount.js'), 'utf8');
const worker = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');

test('current globe source pauses offscreen and respects reduced motion', () => {
  assert.match(globe, /setFrameloop\(document\.hidden\|\|!onscreen\?'never':'always'\)/, 'offscreen/hidden globe stops its render loop');
  assert.match(globe, /prefers-reduced-motion:\s*reduce/, 'globe respects reduced motion');
  assert.match(globe, /dpr=\{\[1,1\.5\]\}/, 'globe DPR is capped for mobile GPU stability');
});

test('current globe runtime is served by the maintained globe-lab bundle', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.match(html, /globe-lab\.bundle\.js/);
  assert.doesNotMatch(html, /hero-globe\.bundle\.js|hero-3d\.bundle\.js/);
});

test('failed script and stylesheet fetches fall back to a cached asset instead of an empty 503 response', () => {
  assert.match(worker, /case 'network-first-asset':\s*event\.respondWith\(networkFirstAsset\(request\)\)/, 'all network-first assets use the fallback-aware strategy');
  assert.doesNotMatch(worker, /new Response\('', \{ status: 503 \}\)/, 'asset failures must not produce blank script/style bodies');
});

test('marquee animation stops while its strip is offscreen or the tab is hidden', () => {
  assert.match(marquee, /var viewportVisible = true/, 'marquee tracks viewport visibility');
  assert.match(marquee, /viewportVisible && documentVisible/, 'offscreen marquee must not schedule animation frames');
  assert.match(marquee, /document\.hidden/, 'hidden tabs must not keep the marquee animating');
  assert.match(marquee, /new IntersectionObserver/, 'marquee uses a lightweight visibility observer');
});
