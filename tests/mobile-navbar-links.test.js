'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const MIME = {
  '.css': 'text/css',
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};

function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((request, response) => {
      const pathname = decodeURIComponent((request.url || '/').split('?')[0]);
      const filePath = path.resolve(ROOT, pathname === '/' ? 'index.html' : `.${pathname}`);
      if (!filePath.startsWith(`${ROOT}${path.sep}`) || !fs.existsSync(filePath)) {
        response.writeHead(404).end();
        return;
      }
      response.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
      response.end(fs.readFileSync(filePath));
    });
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

(async () => {
  const server = await startServer();
  let browser;

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      serviceWorkers: 'block',
    });
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
    await page.getByRole('button', { name: 'Menu' }).click();

    const target = await page.evaluate(() => {
      const home = document.querySelector('#nav-mobile > a[href="index.html"]');
      const about = document.querySelector('#nav-mobile > a[href="about.html"]');
      const homeRect = home.getBoundingClientRect();

      // Reproduce the reported mobile failure: the later About hit area
      // reaches upward into Home during layout/paint.
      about.style.position = 'relative';
      about.style.top = '-12px';
      about.style.paddingTop = '23px';

      const hit = document
        .elementFromPoint(homeRect.left + homeRect.width / 2, homeRect.bottom - 6)
        ?.closest('a');
      return hit?.getAttribute('href');
    });

    assert.equal(target, 'index.html', 'Home must remain the top hit target when adjacent mobile links overlap');
    console.log('mobile navbar link layering: ok');
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
