'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const PAGES = fs.readdirSync(ROOT).filter((name) => name.endsWith('.html')).sort();
const MIME = { '.css': 'text/css', '.html': 'text/html', '.js': 'application/javascript', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((request, response) => {
      let relative = decodeURIComponent((request.url || '/index.html').split('?')[0]);
      while (relative.startsWith('/')) relative = relative.slice(1);
      const file = path.resolve(ROOT, relative || 'index.html');
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return response.writeHead(404).end();
      response.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(response);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

test('public pages ship no page-level loading veil', () => {
  for (const pageName of PAGES) {
    const page = fs.readFileSync(path.join(ROOT, pageName), 'utf8');
    assert.doesNotMatch(page, /<html\b[^>]*\blg-loading\b/i, `${pageName} does not gate static HTML`);
    assert.doesNotMatch(page, /html\.lg-loading|data-lg-skeleton-overlay/i, `${pageName} has no inline full-page skeleton rule`);
  }
  const js = fs.readFileSync(path.join(ROOT, 'assets/skeleton.js'), 'utf8');
  const css = fs.readFileSync(path.join(ROOT, 'assets/skeleton.css'), 'utf8');
  assert.match(js, /DELAY_MS = 150/, 'local placeholders wait briefly before appearing');
  assert.match(js, /\.decode/, 'images resolve independently after decoding');
  assert.doesNotMatch(js, /data-lg-skeleton-overlay|position:\s*fixed/, 'shared loader does not create an overlay');
  assert.doesNotMatch(css, /position:\s*fixed|\[data-lg-skeleton-overlay\]/, 'skeleton CSS contains no fixed page layer');
  assert.match(css, /body\.co-theme-agro \.lg-media-pending[\s\S]*#315e49/i, 'agricultural local placeholders retain their green theme');
});

test('slow media receives local placeholders while real navigation and content stay usable', async () => {
  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  try {
    for (const viewport of [{ width: 430, height: 932 }, { width: 390, height: 844 }, { width: 375, height: 812 }, { width: 360, height: 800 }]) {
      const page = await browser.newPage({ viewport });
      page.on('pageerror', (error) => errors.push(error.message));
      await page.route(/\.(jpe?g|png|webp)(\?|$)/, async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 650));
        await route.continue();
      });
      await page.goto(`http://127.0.0.1:${server.address().port}/lake-oil.html`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(240);
      const loading = await page.evaluate(() => ({
        overlays: document.querySelectorAll('[data-lg-skeleton-overlay]').length,
        pending: document.querySelectorAll('.lg-media-pending').length,
        navVisible: !!document.querySelector('.site-nav a[href="index.html"]') && getComputedStyle(document.querySelector('.site-nav')).visibility !== 'hidden',
        headingVisible: !!document.querySelector('h1') && getComputedStyle(document.querySelector('h1')).visibility !== 'hidden',
        linksUsable: !document.elementFromPoint(10, 10)?.matches('[data-lg-skeleton-overlay]'),
      }));
      assert.equal(loading.overlays, 0, `no full-page overlay is mounted at ${viewport.width}px`);
      assert.ok(loading.pending > 0, `only unresolved media receives placeholders at ${viewport.width}px`);
      assert.ok(loading.navVisible && loading.headingVisible && loading.linksUsable, `static chrome, text and links remain available at ${viewport.width}px`);
      await page.waitForFunction(() => !Array.from(document.querySelectorAll('.lg-media-pending')).some((node) => {
        const rect = node.getBoundingClientRect();
        return rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth;
      }), null, { timeout: 6000 });
      await page.close();
    }
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});

test('local placeholder shimmer respects reduced motion', async () => {
  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route(/\.(jpe?g|png|webp)(\?|$)/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 650));
    await route.continue();
  });
  try {
    await page.goto(`http://127.0.0.1:${server.address().port}/lake-oil.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(240);
    assert.equal(await page.locator('.lg-media-pending').evaluate((node) => getComputedStyle(node).animationName), 'none');
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});

test('warm media skips local placeholders', async () => {
  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 430, height: 932 } });
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    await page.goto(`${base}/index.html`, { waitUntil: 'load' });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(120);
    assert.equal(await page.locator('.lg-media-pending').evaluateAll((nodes) => nodes.filter((node) => {
      const rect = node.getBoundingClientRect();
      return rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth;
    }).length), 0, 'warm-cache media does not force a visible placeholder');
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});
