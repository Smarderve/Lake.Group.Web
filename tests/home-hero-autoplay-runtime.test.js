'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'assets', 'home-hero.js'), 'utf8');

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const file = path.resolve(ROOT, (req.url || '/index.html').split('?')[0].replace(/^\/+/, '') || 'index.html');
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return res.writeHead(404).end();
      const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
      res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

test('homepage hero autoplay keeps its controller alive across hidden-state ticks', async () => {
  assert.doesNotMatch(source, /if \(paused \|\| document\.hidden\) return;/, 'a hidden-state tick must not terminate autoplay without rescheduling');
  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.addInitScript(() => {
    const original = window.setTimeout;
    window.setTimeout = function (callback, delay, ...args) {
      return original.call(this, callback, delay >= 7000 ? 20 : delay, ...args);
    };
  });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto(`http://127.0.0.1:${server.address().port}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(10);
    assert.equal(await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      return document.hidden;
    }), true);
    await page.waitForTimeout(30);
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    });
    await page.waitForTimeout(100);
    const seen = await page.locator('.hero-slide').evaluateAll((slides) => slides.map((slide, i) => slide.classList.contains('is-active') ? i : -1).find((i) => i >= 0));
    assert.equal(errors.length, 0, errors.join('\n'));
    assert.notEqual(seen, 0, 'autoplay must schedule a future tick after a hidden-state callback');

  } finally {
    await browser.close();
    server.close();
  }
});
