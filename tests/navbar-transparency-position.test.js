'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const PAGES = ['index.html', 'about.html', 'leadership.html', 'contact.html', 'history.html', 'gallery.html', 'lake-agro.html', 'assembly-tech.html'];

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const pathname = (req.url || '/').split('?')[0].replace(/^\/+/, '') || 'index.html';
      const file = path.resolve(ROOT, pathname);
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return res.writeHead(404).end();
      const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
      res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

test('global navbar is transparent, hero-overlaid, and scrolls away on every public page', async () => {
  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  try {
    for (const file of PAGES) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await page.goto(`http://127.0.0.1:${server.address().port}/${file}`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.site-nav[data-phase01-navbar]');
      await page.waitForTimeout(100);
      const initial = await page.locator('.site-nav[data-phase01-navbar]').evaluate((nav) => {
        const style = getComputedStyle(nav);
        return { position: style.position, background: style.backgroundColor, image: style.backgroundImage, shadow: style.boxShadow, blur: style.backdropFilter, top: nav.getBoundingClientRect().top };
      });
      assert.equal(initial.position, 'absolute', `${file}: navbar must be document-positioned over the hero`);
      assert.equal(initial.background, 'rgba(0, 0, 0, 0)', `${file}: navbar background must be transparent`);
      assert.equal(initial.image, 'none', `${file}: navbar must not have a background image`);
      assert.equal(initial.shadow, 'none', `${file}: navbar must not add a background block shadow`);
      assert.equal(initial.blur, 'none', `${file}: navbar must not blur the hero`);
      assert.equal(initial.top, 0, `${file}: navbar must begin at the document top`);
      await page.evaluate(() => window.scrollTo(0, 400));
      const scrolledTop = await page.locator('.site-nav[data-phase01-navbar]').evaluate((nav) => nav.getBoundingClientRect().top);
      assert.ok(scrolledTop < 0, `${file}: navbar must scroll away with the hero`);
      await page.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
});
