'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');

function startServer() {
  let workerFetches = 0;
  const server = http.createServer((request, response) => {
    const pathname = decodeURIComponent((request.url || '/').split('?')[0]);
    const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const file = path.resolve(ROOT, relative);
    if (!file.startsWith(ROOT + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      response.writeHead(404); response.end('not found'); return;
    }
    let body = fs.readFileSync(file);
    const ext = path.extname(file);
    const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2' };
    if (pathname === '/sw.js') {
      workerFetches += 1;
      body = body.toString('utf8').replace(/v75-20260829-01/g, workerFetches === 1 ? 'v-test-a' : 'v-test-b');
      response.setHeader('cache-control', 'no-cache, no-store, must-revalidate');
    }
    response.writeHead(200, { 'content-type': types[ext] || 'application/octet-stream' });
    response.end(body);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

async function waitForIdle(page) {
  await page.waitForTimeout(2800);
  await page.waitForFunction(() => Boolean(window.__LAKE_BUILD__), null, { timeout: 5000 });
}

(async () => {
  const pwa = fs.readFileSync(path.join(ROOT, 'assets/pwa.js'), 'utf8');
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  assert.doesNotMatch(pwa, /lake-pwa-toast|showUpdateToast|new site version|Dismiss/i, 'PWA must not ship an update popup');
  assert.doesNotMatch(pwa, /registration\.waiting|updatefound/, 'PWA must not retain popup-only worker update listeners');
  assert.doesNotMatch(pwa, /location\.(?:reload|replace|assign)\s*\(/, 'PWA must not force a second navigation');
  assert.doesNotMatch(pwa, /controllerchange/, 'PWA must not reload on controllerchange');
  assert.doesNotMatch(sw, /await self\.skipWaiting\(\)/, 'worker must not take over an open tab');
  assert.doesNotMatch(sw, /await self\.clients\.claim\(\)/, 'worker must not claim an open tab');
  assert.match(sw, /return await networkFirst\(request, PAGES_CACHE\)/, 'navigation must be network-first');

  const server = await startServer();
  const profile = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'lake-update-profile-'));
  const browser = await chromium.launchPersistentContext(profile, { headless: true, viewport: { width: 390, height: 844 } });
  try {
    const origin = `http://127.0.0.1:${server.address().port}`;
    const first = await browser.newPage();
    let firstNavigations = 0;
    first.on('framenavigated', (frame) => { if (frame === first.mainFrame()) firstNavigations += 1; });
    await first.goto(`${origin}/index.html`, { waitUntil: 'domcontentloaded' });
    await waitForIdle(first);
    assert.equal(firstNavigations, 1, 'initial deployment must not auto-reload');
    assert.equal(await first.locator('#lake-pwa-toast').count(), 0, 'fresh visit must not show an update popup');
    await first.close();

    const second = await browser.newPage();
    let secondNavigations = 0;
    second.on('framenavigated', (frame) => { if (frame === second.mainFrame()) secondNavigations += 1; });
    await second.goto(`${origin}/index.html`, { waitUntil: 'domcontentloaded' });
    await waitForIdle(second);
    const state = await second.evaluate(() => ({ build: window.__LAKE_BUILD__, navigationEntries: performance.getEntriesByType('navigation').length, updatePopup: Boolean(document.querySelector('#lake-pwa-toast')) }));
    assert.equal(secondNavigations, 1, 'A→B update must not cause a second top-level navigation');
    assert.equal(state.navigationEntries, 1, 'A→B update must have one document navigation');
    assert.equal(state.build, '2026-08-28.01', 'current document must remain usable during worker update');
    assert.equal(state.updatePopup, false, 'persistent update visit must not show an update popup');
    await second.close();
    console.log('Persistent A→B lifecycle passed: one navigation per visit, no forced reload.');
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
    await fs.promises.rm(profile, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
