'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const requested = (req.url || '/index.html').split('?')[0].replace(/^\/+/, '') || 'index.html';
      const file = path.resolve(ROOT, requested);
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return res.writeHead(404).end();
      const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
      res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

test('Back-to-Top aligns left of Chat across desktop, tablet, and phone viewports', async () => {
  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const viewports = [
    [1920, 1080], [1366, 768], [1024, 768], [768, 1024],
    [960, 1027], [390, 844], [360, 740]
  ];
  try {
    for (const [width, height] of viewports) {
      await page.setViewportSize({ width, height });
      await page.goto(`http://127.0.0.1:${server.address().port}/index.html`, { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await page.waitForFunction(() => document.querySelector('.lake-back-to-top')?.classList.contains('is-visible'));
      await page.waitForTimeout(500); // Let the existing scroll-direction nudge finish before measuring resting alignment.
      const geometry = await page.evaluate(() => {
        const arrow = document.querySelector('.lake-back-to-top').getBoundingClientRect();
        const chat = document.querySelector('#chat-widget .la-launcher').getBoundingClientRect();
        return {
          gap: chat.left - arrow.right,
          centerDelta: Math.abs((arrow.top + arrow.bottom) / 2 - (chat.top + chat.bottom) / 2),
          withinViewport: arrow.left >= 0 && arrow.top >= 0 && chat.right <= innerWidth && chat.bottom <= innerHeight
        };
      });
      assert.ok(Math.abs(geometry.gap - 12) <= 1, `${width}x${height}: expected 12px gap, got ${geometry.gap}px`);
      assert.ok(geometry.centerDelta <= 1, `${width}x${height}: centers differ by ${geometry.centerDelta}px`);
      assert.equal(geometry.withinViewport, true, `${width}x${height}: a control clips outside the viewport`);
    }

    await page.locator('.lake-back-to-top').click();
    await page.waitForFunction(() => window.scrollY < 2);
    await page.getByRole('button', { name: 'Open Lake Assistant' }).click();
    await page.locator('#lake-assistant-panel').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#chat-widget .la-launcher').evaluate((button) => getComputedStyle(button).display), 'none');
    await page.getByRole('button', { name: 'Close Lake Assistant' }).click();
    assert.equal(await page.getByRole('button', { name: 'Open Lake Assistant' }).isVisible(), true);
  } finally {
    await browser.close();
    server.close();
  }
});
