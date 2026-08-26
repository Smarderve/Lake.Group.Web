const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.join(__dirname, '..');
const evidence = path.join(root, 'docs', 'qa', 'phase-02-homepage');
let server;
let browser;

test.before(async () => {
  fs.mkdirSync(evidence, { recursive: true });
  server = http.createServer((req, res) => {
    const requested = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
    const file = path.resolve(root, requested);
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404); res.end(); return;
    }
    const ext = path.extname(file);
    const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
    res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  browser = await chromium.launch({ headless: true });
});

test.after(async () => {
  if (browser) await browser.close();
  if (server) await new Promise((resolve) => server.close(resolve));
});

for (const viewport of [{ name: 'desktop', width: 1440, height: 900 }, { name: 'mobile', width: 390, height: 844 }]) {
  test(`${viewport.name} homepage visual contract`, async () => {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/index.html`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => !document.documentElement.classList.contains('lg-loading'), null, { timeout: 10000 });
    await page.waitForFunction(() => !document.querySelector('[data-lg-skeleton-overlay]'), null, { timeout: 10000 });
    const state = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      hero: getComputedStyle(document.querySelector('.hero')).minHeight,
      logoBackground: getComputedStyle(document.querySelector('.marquee-wrap')).backgroundColor,
      mapDisplayed: getComputedStyle(document.querySelector('[data-home-operations-map]')).display,
      mapCta: [...document.querySelectorAll('#fuel-experience a')].some((a) => /operations map/i.test(a.textContent)),
    }));
    assert.ok(state.overflow <= 1, `horizontal overflow: ${state.overflow}px`);
    assert.equal(state.logoBackground, 'rgb(1, 129, 187)');
    assert.equal(state.mapDisplayed, 'none');
    assert.equal(state.mapCta, false);
    await page.screenshot({ path: path.join(evidence, `${viewport.name}-hero.png`), fullPage: false });
    await page.locator('#fuel-experience').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('#experience-3d-panel canvas'), null, { timeout: 15000 });
    await page.waitForTimeout(1200);
    const canvas = await page.locator('#experience-3d-panel canvas').boundingBox();
    assert.ok(canvas && canvas.width > 280 && canvas.height > 260, 'large globe canvas is rendered');
    await page.screenshot({ path: path.join(evidence, `${viewport.name}-globe.png`), fullPage: false });
    assert.deepEqual(errors, []);
    await context.close();
  });
}
