'use strict';

const assert = require('assert');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { chromium } = require('playwright');
const { resolveStatic } = require('../scripts/_safe_static.js');

const ROOT = path.join(__dirname, '..');
const PORT = 4174;
const URL = `http://127.0.0.1:${PORT}/index.html`;

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const requestPath = (req.url || '/').split('?')[0];
      const filePath = resolveStatic(ROOT, requestPath === '/' ? '/index.html' : requestPath);
      if (!filePath) {
        res.writeHead(403).end('Forbidden');
        return;
      }

      fs.readFile(filePath, (error, data) => {
        if (error) {
          res.writeHead(404).end('Not found');
          return;
        }
        const mime = {
          '.css': 'text/css',
          '.html': 'text/html',
          '.js': 'application/javascript',
          '.jpg': 'image/jpeg',
          '.json': 'application/json',
          '.png': 'image/png',
          '.svg': 'image/svg+xml',
          '.woff2': 'font/woff2',
        }[path.extname(filePath).toLowerCase()];
        res.writeHead(200, { 'Content-Type': mime || 'application/octet-stream' });
        res.end(data);
      });
    });
    server.listen(PORT, '127.0.0.1', () => resolve(server));
  });
}

async function inspectTicker(page) {
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.locator('#hero-logo-loop .logoloop').waitFor();
  await page.waitForFunction(() => {
    const firstLogo = document.querySelector('#hero-logo-loop img');
    return firstLogo && firstLogo.complete && firstLogo.naturalWidth > 0;
  });
  await page.locator('html.lg-skel-done').waitFor({ timeout: 12000 });
  await page.locator('[data-lg-skeleton-overlay]').waitFor({ state: 'detached', timeout: 2000 });
  await page.locator('.logoloop__list:first-child img').evaluateAll((images) =>
    Promise.all(images.map((image) => image.decode()))
  );

  return page.evaluate(() => {
    const wrap = document.querySelector('.marquee-wrap');
    const loop = document.querySelector('#hero-logo-loop .logoloop');
    const images = [...loop.querySelectorAll('img')];
    const track = loop.querySelector('.logoloop__track');
    const wrapRect = wrap.getBoundingClientRect();
    const wrapStyle = getComputedStyle(wrap);
    const loopStyle = getComputedStyle(loop);
    const visibleLabels = images
      .filter((image) => {
        const rect = image.getBoundingClientRect();
        return rect.right > wrapRect.left && rect.left < wrapRect.right && rect.bottom > wrapRect.top && rect.top < wrapRect.bottom;
      })
      .map((image) => image.alt);
    return {
      backgroundImage: wrapStyle.backgroundImage,
      brokenImages: images.filter((image) => image.complete && image.naturalWidth === 0).length,
      fadeColor: loopStyle.getPropertyValue('--logoloop-fadeColor').trim(),
      gap: loopStyle.getPropertyValue('--logoloop-gap').trim(),
      imageHeight: Math.round(images[0].getBoundingClientRect().height),
      labels: images.slice(0, 17).map((image) => image.alt),
      loadedImages: images.filter((image) => image.naturalWidth > 0).length,
      trackTransform: track.style.transform,
      visibleLabels,
      wrapHeight: Math.round(wrap.getBoundingClientRect().height),
    };
  });
}

(async () => {
  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  try {
    const cases = [
      { name: 'desktop', viewport: { width: 1440, height: 900 }, height: 44, gap: '52px' },
      { name: 'mobile', viewport: { width: 390, height: 844 }, height: 34, gap: '34px' },
    ];

    for (const testCase of cases) {
      const page = await browser.newPage({ viewport: testCase.viewport });
      const before = await inspectTicker(page);
      const ticker = page.locator('.marquee-wrap');
      await ticker.scrollIntoViewIfNeeded();
      await page.waitForTimeout(150);
      await ticker.screenshot({
        path: path.join(os.tmpdir(), `lake-logo-ticker-${testCase.name}.png`),
      });
      await page.waitForTimeout(450);
      const afterTransform = await page.locator('.logoloop__track').evaluate((track) => track.style.transform);

      assert.match(before.backgroundImage, /linear-gradient/, `${testCase.name}: ticker needs an opaque brand surface`);
      assert.strictEqual(before.brokenImages, 0, `${testCase.name}: all ticker logos must load`);
      assert(before.visibleLabels.length >= 2, `${testCase.name}: the viewport must contain rendered logos`);
      assert.strictEqual(before.fadeColor, '#013f5c', `${testCase.name}: edge fade must match the ticker surface`);
      assert.strictEqual(before.gap, testCase.gap, `${testCase.name}: spacing must match the responsive design`);
      assert(
        Math.abs(before.imageHeight - testCase.height) <= 1,
        `${testCase.name}: logo height must stay legible`
      );
      assert(before.wrapHeight >= testCase.height + 20, `${testCase.name}: ticker must retain vertical breathing room`);
      for (const label of ['Lake Oil', 'Lake Gas', 'Lake Aviation', 'Lake Buildings']) {
        assert(before.labels.includes(label), `${testCase.name}: missing ${label}`);
      }
      assert.notStrictEqual(afterTransform, before.trackTransform, `${testCase.name}: ticker animation must remain active`);
      await page.close();
      console.log(`${testCase.name}:`, JSON.stringify(before));
    }

    const reducedPage = await browser.newPage({
      viewport: { width: 390, height: 844 },
      reducedMotion: 'reduce',
    });
    await inspectTicker(reducedPage);
    const reducedBefore = await reducedPage.locator('.logoloop__track').evaluate((track) => track.style.transform);
    await reducedPage.waitForTimeout(450);
    const reducedAfter = await reducedPage.locator('.logoloop__track').evaluate((track) => track.style.transform);
    assert.strictEqual(reducedAfter, reducedBefore, 'reduced motion must keep the ticker static');
    await reducedPage.close();

    console.log('home logo ticker: responsive, animated, and reduced-motion checks passed');
  } finally {
    await browser.close();
    server.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
