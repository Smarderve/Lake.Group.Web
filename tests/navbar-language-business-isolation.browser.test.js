'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
let server;
let browser;

test.before(async () => {
  server = http.createServer((req, res) => {
    const requested = decodeURIComponent((req.url || '/index.html').split('?')[0]).replace(/^\/+/, '') || 'index.html';
    const file = path.resolve(ROOT, requested);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404); res.end(); return;
    }
    const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  browser = await chromium.launch({ headless: true });
});

test.after(async () => {
  await browser?.close();
  if (server) await new Promise((resolve) => server.close(resolve));
});

test('desktop language interaction never opens Business Verticals and the two hover surfaces stay independent', async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    await page.goto(`http://127.0.0.1:${server.address().port}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.lang-menu', { state: 'attached' });
    await page.waitForFunction(() => !document.querySelector('[data-lg-skeleton-overlay]'));
    const language = page.locator('.lang-trigger');
    const business = page.locator('#nav-companies-trigger');
    const mega = page.locator('#nav-companies-menu');

    await language.hover();
    await page.waitForTimeout(250);
    assert.equal(await mega.evaluate((el) => el.closest('.has-dropdown').classList.contains('is-open')), false, 'hovering Language keeps Business Verticals closed');
    assert.equal(await page.locator('.lang-switcher').evaluate((el) => el.classList.contains('is-open')), true, 'hovering Language opens only Language');

    await language.click();
    assert.equal(await mega.evaluate((el) => el.closest('.has-dropdown').classList.contains('is-open')), false, 'clicking Language keeps Business Verticals closed');

    await business.hover();
    assert.equal(await mega.evaluate((el) => el.closest('.has-dropdown').classList.contains('is-open')), true, 'hovering Business Verticals opens its own menu');
    await mega.locator('.mm-cat').first().hover();
    assert.equal(await mega.evaluate((el) => el.closest('.has-dropdown').classList.contains('is-open')), true, 'entering the mega-menu keeps it open');

    await language.hover();
    await page.waitForTimeout(250);
    assert.equal(await mega.evaluate((el) => el.closest('.has-dropdown').classList.contains('is-open')), false, 'entering Language closes the business surface without reopening it');
    assert.equal(await page.locator('.lang-switcher').evaluate((el) => el.classList.contains('is-open')), true, 'entering Language leaves its own surface open');

    await page.mouse.move(10, 500);
    await page.waitForTimeout(250);
    assert.equal(await page.locator('.lang-switcher').evaluate((el) => el.classList.contains('is-open')), false, 'moving away closes Language');
    assert.equal(await mega.evaluate((el) => el.closest('.has-dropdown').classList.contains('is-open')), false, 'moving away leaves Business Verticals closed');
  } finally {
    await page.close();
  }
});

test('mobile navigation keeps Business Verticals and Language as separate accordions', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  try {
    await page.goto(`http://127.0.0.1:${server.address().port}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !document.querySelector('[data-lg-skeleton-overlay]'));
    await page.locator('#nav-toggle').click();
    const drawer = page.locator('#nav-mobile');
    await drawer.locator('.mob-language-trigger').click();
    assert.equal(await drawer.locator('#mob-language-panel').getAttribute('hidden'), null, 'mobile Language opens its own panel');
    assert.equal(await drawer.locator('#mob-subsidiaries').getAttribute('hidden'), '', 'mobile Business Verticals remains closed');
    await drawer.locator('.mob-primary[aria-controls="mob-subsidiaries"]').click();
    assert.equal(await drawer.locator('#mob-subsidiaries').getAttribute('hidden'), null, 'mobile Business Verticals opens explicitly');
    assert.equal(await drawer.locator('#mob-language-panel').getAttribute('hidden'), '', 'mobile Language closes when the other accordion opens');
  } finally {
    await page.close();
  }
});
