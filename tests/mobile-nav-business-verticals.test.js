'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const MIME = { '.css': 'text/css', '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
let server;
let browser;

test.before(async () => {
  server = http.createServer((request, response) => {
    const pathname = decodeURIComponent((request.url || '/').split('?')[0]);
    const file = path.resolve(ROOT, pathname === '/' ? 'index.html' : `.${pathname}`);
    if (!file.startsWith(`${ROOT}${path.sep}`) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { response.writeHead(404).end(); return; }
    response.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(response);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  browser = await chromium.launch({ headless: true });
});

test.after(async () => {
  if (browser) await browser.close();
  if (server) {
    // Browser-driven asset requests may keep HTTP/1.1 sockets alive briefly.
    // Close those fixture-only connections so this regression check terminates
    // deterministically without changing application runtime behavior.
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  }
});

for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 568 }]) {
  test(`mobile navigation is one scrollable disclosure at ${viewport.width}px`, async () => {
    const context = await browser.newContext({ viewport, hasTouch: true, serviceWorkers: 'block' });
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${server.address().port}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.locator('#nav-toggle').click();
    const drawer = page.locator('#nav-mobile');
    await page.waitForFunction(() => !document.querySelector('#nav-mobile')?.hasAttribute('hidden'));
    assert.equal(await drawer.getByText(/^Menu$/).count(), 0, 'no visible MENU label');
    assert.equal(await drawer.evaluate((el) => getComputedStyle(el).overflowY), 'auto', 'drawer owns vertical scrolling');
    assert.equal(await page.evaluate(() => document.body.classList.contains('lg-nav-open')), true, 'background body is locked');

    await drawer.locator('.mob-primary').click();
    assert.equal(await drawer.locator('.mob-primary').getAttribute('aria-expanded'), 'true');
    assert.equal(await drawer.locator('.mob-sector-heading').count(), 6);
    assert.equal(await drawer.locator('.mob-sector-heading button, .mob-sector-heading [aria-controls]').count(), 0, 'sectors are headings, not nested accordions');
    assert.equal(await drawer.locator('.mob-subsidiaries-panel img').count(), 0, 'mobile company rows have no logos');
    assert.equal(await drawer.getByText('Lake Oil', { exact: true }).isVisible(), true, 'companies render immediately');
    assert.equal(await drawer.locator('.mob-sector-companies a').count() > 0, true, 'company text links exist');

    await drawer.evaluate((el) => { el.scrollTop = el.scrollHeight; });
    await page.waitForTimeout(50);
    assert.equal(await drawer.getByText('Contact Us', { exact: true }).isVisible(), true, 'bottom navigation remains reachable');
    assert.equal(await drawer.locator('.mob-language-trigger').isVisible(), true, 'language disclosure remains reachable');

    await drawer.locator('.mob-corporate-trigger').click();
    assert.equal(await drawer.locator('.mob-primary').getAttribute('aria-expanded'), 'false', 'Corporate closes Business Verticals');
    assert.equal(await drawer.locator('.mob-corporate-trigger').getAttribute('aria-expanded'), 'true');
    for (const label of ['Our History', 'CSR & Sustainability', 'Investor Relations', 'Major Projects', 'Gallery']) {
      assert.equal(await drawer.getByText(label, { exact: true }).isVisible(), true, `${label} is visible`);
    }
    assert.equal(await drawer.getByText('Operations Map', { exact: true }).count(), 0, 'Operations Map is not exposed in the Corporate menu');

    await drawer.locator('.mob-language-trigger').scrollIntoViewIfNeeded();
    await drawer.locator('.mob-language-trigger').click();
    assert.equal(await drawer.locator('.mob-corporate-trigger').getAttribute('aria-expanded'), 'false', 'Language closes Corporate');
    assert.equal(await drawer.locator('.mob-language-trigger').getAttribute('aria-expanded'), 'true');
    await drawer.evaluate((el) => { el.scrollTop = el.scrollHeight; });
    assert.equal(await drawer.getByRole('menuitemradio', { name: 'Arabic' }).isVisible(), true, 'last language option is reachable');
    await drawer.getByRole('menuitemradio', { name: 'French' }).click();
    await page.waitForTimeout(25);
    assert.match(await drawer.locator('.mob-language-status').textContent(), /Translation for French is not available yet/, 'language choices preserve the configured unavailable-translation status');

    await drawer.locator('.mob-close').click();
    assert.equal(await page.evaluate(() => document.body.classList.contains('lg-nav-open')), false, 'closing restores page scrolling');
    await context.close();
  });
}
