'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const pages = ['index.html', 'about.html', 'gallery.html', 'lake-oil.html'];

function startServer() {
  const server = http.createServer((req, res) => {
    const name = decodeURIComponent((req.url || '/').split('?')[0]).replace(/^\/+/, '') || 'index.html';
    const file = path.resolve(ROOT, name);
    if (!file.startsWith(ROOT + path.sep) || !fs.existsSync(file)) return res.writeHead(404).end();
    const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2' };
    res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

(async () => {
  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  try {
    const origin = `http://127.0.0.1:${server.address().port}`;
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const builds = new Set();
    let failures = 0;
    for (const name of pages) {
      for (let cycle = 0; cycle < 20; cycle += 1) {
        const page = await context.newPage();
        page.on('response', (response) => { if (response.status() >= 400) failures += 1; });
        try {
          await page.goto(`${origin}/${name}`, { waitUntil: 'domcontentloaded' });
          await page.waitForFunction(() => !document.documentElement.classList.contains('lg-loading'), null, { timeout: 4000 });
          const state = await page.evaluate(() => ({
            build: window.__LAKE_BUILD__ || null,
            overflow: document.documentElement.scrollWidth > innerWidth,
            loading: document.documentElement.classList.contains('lg-loading'),
          }));
          builds.add(state.build);
          assert.equal(state.overflow, false, `${name} cycle ${cycle + 1} has horizontal overflow`);
          assert.equal(state.loading, false, `${name} cycle ${cycle + 1} remains loading`);
        } finally {
          await page.close();
        }
      }
    }
    await context.close();
    assert.deepEqual([...builds], ['2026-08-28.01']);
    assert.equal(failures, 0, 'reload stress produced HTTP failures');
    console.log(`Reload stability passed: ${pages.length * 20} mobile reloads, one build marker, no failures.`);
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
