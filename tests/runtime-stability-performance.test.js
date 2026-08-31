'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..');
const globe = fs.readFileSync(path.join(ROOT, 'assets', 'hero-globe', 'HeroGlobe.jsx'), 'utf8');
const marquee = fs.readFileSync(path.join(ROOT, 'assets', 'components', 'logo-loop-mount.js'), 'utf8');
const worker = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');

test('globe rendering pauses outside the viewport and while the document is hidden', () => {
  assert.match(globe, /\.pauseAnimation\(\)/, 'offscreen globe must stop its WebGL render loop');
  assert.match(globe, /\.resumeAnimation\(\)/, 'visible globe must resume its WebGL render loop');
  assert.match(globe, /document\.hidden/, 'hidden tabs must not keep the globe rendering');
  assert.match(globe, /setPixelRatio\(Math\.min\(1\.5, window\.devicePixelRatio\)\)/, 'globe DPR must be capped for mobile GPU stability');
});

test('route animation batches React updates instead of updating state in every route RAF', () => {
  assert.match(globe, /routeAnimationFrame/, 'route drawing uses one coordinated animation frame');
  assert.match(globe, /ROUTE_FRAME_INTERVAL_MS/, 'route state commits are frame-rate limited');
  assert.doesNotMatch(globe, /const drawRoute = \(\) => \{[\s\S]*?setArcsData\(/, 'individual route RAF loops must not trigger React renders');
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
