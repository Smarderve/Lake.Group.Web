const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.join(__dirname, '..');
const pages = ['index.html', 'leadership.html', 'news.html', 'lake-agro.html', '404.html'];
const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 820, height: 1180 },
  { name: 'mobile', width: 390, height: 844 }
];

let server;
let browser;
test.before(async () => {
  server = http.createServer((req, res) => {
    const requested = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
    const file = path.resolve(root, requested);
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    const type = file.endsWith('.html') ? 'text/html' : file.endsWith('.css') ? 'text/css' : file.endsWith('.js') ? 'text/javascript' : 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  browser = await chromium.launch({ headless: true });
});
test.after(async () => { if (browser) await browser.close(); if (server) await new Promise((resolve) => server.close(resolve)); });

for (const viewport of viewports) {
  test(viewport.name + ' launch chrome has no horizontal overflow', async () => {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    for (const filename of pages) {
      await page.goto(`http://127.0.0.1:${server.address().port}/${filename}`, { waitUntil: 'domcontentloaded' });
      const result = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        nav: !!document.querySelector('.site-nav'),
        footer: !!document.querySelector('.site-footer')
      }));
      assert.ok(result.overflow <= 1, `${viewport.name} ${filename} overflow ${result.overflow}px`);
      assert.equal(result.nav, true, `${filename} navbar`);
      assert.equal(result.footer, true, `${filename} footer`);
    }
    await context.close();
  });
}
