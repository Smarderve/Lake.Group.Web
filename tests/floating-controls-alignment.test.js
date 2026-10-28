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

test('Back-to-Top stays bottom-right while the Chat launcher is hidden', async () => {
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
        const launcher = document.querySelector('#chat-widget .la-launcher');
        return {
          launcherDisplay: getComputedStyle(launcher).display,
          launcherHitTarget: getComputedStyle(launcher).pointerEvents,
          rightGap: innerWidth - arrow.right,
          bottomGap: innerHeight - arrow.bottom,
          withinViewport: arrow.left >= 0 && arrow.top >= 0 && arrow.right <= innerWidth && arrow.bottom <= innerHeight
        };
      });
      assert.equal(geometry.launcherDisplay, 'none', `${width}x${height}: chat launcher remains visible`);
      assert.equal(geometry.launcherHitTarget, 'auto', `${width}x${height}: hidden launcher changed assistant implementation hit testing`);
      const expectedInset = width <= 600 ? 16 : 24;
      assert.ok(Math.abs(geometry.rightGap - expectedInset) <= 1, `${width}x${height}: expected ${expectedInset}px right inset, got ${geometry.rightGap}px`);
      assert.ok(Math.abs(geometry.bottomGap - expectedInset) <= 1, `${width}x${height}: expected ${expectedInset}px bottom inset, got ${geometry.bottomGap}px`);
      assert.equal(geometry.withinViewport, true, `${width}x${height}: a control clips outside the viewport`);
    }

    await page.locator('.lake-back-to-top').click();
    await page.waitForFunction(() => window.scrollY < 2);
    assert.equal(await page.getByRole('button', { name: 'Open Lake Assistant' }).isVisible(), false, 'hidden launcher is not visible or clickable');
  } finally {
    await browser.close();
    server.close();
  }
});
