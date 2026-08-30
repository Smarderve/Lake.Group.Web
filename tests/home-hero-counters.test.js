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
      const relative = decodeURIComponent((req.url || '/index.html').split('?')[0]).replace(/^\/+/, '') || 'index.html';
      const file = path.resolve(ROOT, relative);
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return res.writeHead(404).end();
      const types = { '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2' };
      res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

test('Home counters begin after first paint, finish once, and keep their exact formatting', async () => {
  assert.match(source, /function heroIsVisible\(\)/, 'counters must check their current visibility without waiting for a new observer transition');
  assert.match(source, /beginAfterFirstPaint\(\)/, 'counters start after the first visible frame without a page-level loader');
  assert.match(source, /event\.persisted/, 'bfcache restores must not leave counters at zero');
  assert.match(source, /prefers-reduced-motion/, 'reduced-motion users must receive final values without animation');
  assert.doesNotMatch(source, /setTimeout\(.*DURATION_MS/, 'counter animation must not use arbitrary timer delays');

  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.addInitScript(() => {
      window.__counterHistory = [];
      const record = () => {
        const nums = Array.from(document.querySelectorAll('.hero-kf-num')).map((node) => node.textContent.trim());
        if (nums.length === 3) window.__counterHistory.push(nums);
      };
      new MutationObserver(record).observe(document, { childList: true, subtree: true, characterData: true });
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Array.from(document.querySelectorAll('.hero-kf-num')).every((node) => node.textContent.trim() === node.getAttribute('data-count-end')));
    const result = await page.evaluate(() => ({
      final: Array.from(document.querySelectorAll('.hero-kf-num')).map((node) => node.textContent.trim()),
      targets: Array.from(document.querySelectorAll('.hero-kf-num')).map((node) => node.getAttribute('data-count-end')),
      history: window.__counterHistory,
    }));
    assert.deepEqual(result.final, result.targets, 'each counter must finish at its exact current published value');
    assert.ok(result.history.some((values) => values.includes('0')), 'a fresh load visibly starts from zero');
    assert.ok(result.history.some((values) => values[0] !== '30,000+' && values[0] !== '0'), 'the employee count includes intermediate frames');
    assert.equal(errors.length, 0, errors.join('\n'));
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});

test('Home counters complete automatically after a fresh load at every supported hero viewport', async () => {
  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  const viewports = [
    { width: 1920, height: 1080 },
    { width: 1440, height: 900 },
    { width: 1366, height: 768 },
    { width: 390, height: 844 },
    { width: 375, height: 812 },
  ];
  try {
    for (const viewport of viewports) {
      const page = await browser.newPage({ viewport });
      await page.goto(`http://127.0.0.1:${server.address().port}/index.html`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => Array.from(document.querySelectorAll('.hero-kf-num')).every((node) => node.textContent.trim() === node.getAttribute('data-count-end')), { timeout: 7000 });
      assert.deepEqual(
        await page.locator('.hero-kf-num').evaluateAll((nodes) => nodes.map((node) => node.textContent.trim())),
        await page.locator('.hero-kf-num').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-count-end'))),
        `counters finish automatically at ${viewport.width}px`
      );
      await page.close();
    }
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});

test('Home counters render their final values immediately with reduced motion', async () => {
  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`http://127.0.0.1:${server.address().port}/index.html`, { waitUntil: 'domcontentloaded' });
    assert.deepEqual(
      await page.locator('.hero-kf-num').evaluateAll((nodes) => nodes.map((node) => node.textContent.trim() === node.getAttribute('data-count-end'))),
      [true, true, true],
      'reduced-motion users receive every published final value immediately'
    );
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});

test('Home counters never remain at zero when a persisted page is restored', async () => {
  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    await page.goto(`http://127.0.0.1:${server.address().port}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Array.from(document.querySelectorAll('.hero-kf-num')).every((node) => node.textContent.trim() === node.getAttribute('data-count-end')));
    await page.evaluate(() => {
      document.querySelectorAll('.hero-kf-num').forEach((node) => { node.textContent = '0'; });
      window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
    });
    assert.deepEqual(
      await page.locator('.hero-kf-num').evaluateAll((nodes) => nodes.map((node) => node.textContent.trim())),
      await page.locator('.hero-kf-num').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-count-end'))),
      'a persisted page restores the published final values instead of leaving zeroes visible'
    );
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});
