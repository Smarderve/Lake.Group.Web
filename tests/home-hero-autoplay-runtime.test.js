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
  assert.match(source, /document\.addEventListener\("visibilitychange"/, 'autoplay must resume when the page becomes visible again');
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
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.waitForFunction(() => document.querySelector('.hero-slide.is-active') !== document.querySelectorAll('.hero-slide')[0], null, { timeout: 1500 });
    const seen = await page.locator('.hero-slide').evaluateAll((slides) => slides.map((slide, i) => slide.classList.contains('is-active') ? i : -1).find((i) => i >= 0));
    assert.equal(errors.length, 0, errors.join('\n'));
    assert.notEqual(seen, 0, 'autoplay must schedule a future tick after a hidden-state callback');

  } finally {
    await browser.close();
    server.close();
  }
});

test('homepage hero completes three cycles through the eager first image and resumes after manual navigation', async () => {
  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.addInitScript(() => {
    window.__heroSeen = [];
    function attachHeroObserver() {
      const root = document.querySelector('.hero[data-hero-carousel]');
      if (!root || root.dataset.runtimeObserverAttached === '1') return;
      root.dataset.runtimeObserverAttached = '1';
      const slides = [...root.querySelectorAll('.hero-slide')];
      let current = slides.findIndex((slide) => slide.classList.contains('is-active'));
      new MutationObserver(() => {
        const next = slides.findIndex((slide) => slide.classList.contains('is-active'));
        if (next >= 0 && next !== current) { current = next; window.__heroSeen.push(next); }
      }).observe(root, { subtree: true, attributes: true, attributeFilter: ['class'] });
    }
    new MutationObserver(attachHeroObserver).observe(document, { subtree: true, childList: true });
    attachHeroObserver();
  });
  await page.addInitScript(() => {
    const originalSetTimeout = window.setTimeout.bind(window);
    const originalClearTimeout = window.clearTimeout.bind(window);
    const autoplayTimers = new Set();
    window.__heroTimerMetrics = { active: 0, maxActive: 0 };
    window.setTimeout = function (callback, delay, ...args) {
      if (delay !== 7000) return originalSetTimeout(callback, delay, ...args);
      let timerId;
      timerId = originalSetTimeout(() => {
        autoplayTimers.delete(timerId);
        window.__heroTimerMetrics.active = autoplayTimers.size;
        callback(...args);
      }, 25);
      autoplayTimers.add(timerId);
      window.__heroTimerMetrics.active = autoplayTimers.size;
      window.__heroTimerMetrics.maxActive = Math.max(window.__heroTimerMetrics.maxActive, autoplayTimers.size);
      return timerId;
    };
    window.clearTimeout = function (timerId) {
      autoplayTimers.delete(timerId);
      window.__heroTimerMetrics.active = autoplayTimers.size;
      return originalClearTimeout(timerId);
    };
  });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400 && /\/assets\/images\/delivery\/home\/.*\.webp(?:\?|$)/.test(response.url())) {
      errors.push(`${response.status()} ${response.url()}`);
    }
  });
  try {
    await page.goto(`http://127.0.0.1:${server.address().port}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__heroSeen.length >= 18, null, { timeout: 15000 });
    const cycle = await page.evaluate(() => window.__heroSeen.slice(0, 18));
    assert.deepEqual(cycle, [1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5, 0]);

    await page.locator('.hero-tab').nth(3).click();
    await page.waitForFunction(() => document.querySelectorAll('.hero-slide')[3].classList.contains('is-active'));
    await page.waitForFunction(() => document.querySelectorAll('.hero-slide')[4].classList.contains('is-active'), null, { timeout: 5000 });
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
    assert.equal((await page.evaluate(() => window.__heroTimerMetrics)).active, 0, 'pagehide must clear the pending autoplay timer');
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
    await page.waitForFunction(() => document.querySelectorAll('.hero-slide')[5].classList.contains('is-active'), null, { timeout: 5000 });
    const metrics = await page.evaluate(() => window.__heroTimerMetrics);
    assert.equal(metrics.maxActive, 1, 'autoplay must have no duplicate timers');
    assert.equal(errors.length, 0, errors.join('\n'));
  } finally {
    await browser.close();
    server.close();
  }
});
