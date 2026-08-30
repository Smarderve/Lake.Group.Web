'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const heroScript = fs.readFileSync(path.join(ROOT, 'assets', 'home-hero.js'), 'utf8');
const heroCss = fs.readFileSync(path.join(ROOT, 'assets', 'home-redesign.css'), 'utf8');
const loopScript = fs.readFileSync(path.join(ROOT, 'assets', 'components', 'logo-loop-mount.js'), 'utf8');
const loopCss = fs.readFileSync(path.join(ROOT, 'assets', 'components', 'LogoLoop.css'), 'utf8');

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const relative = decodeURIComponent((req.url || '/index.html').split('?')[0]).replace(/^\/+/, '') || 'index.html';
      const file = path.resolve(ROOT, relative);
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return res.writeHead(404).end();
      const types = { '.css': 'text/css', '.html': 'text/html', '.jpg': 'image/jpeg', '.js': 'text/javascript', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2' };
      res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

test('Home animation sources retain compositor-only hero and fixed two-copy marquee contracts', () => {
  assert.match(heroScript, /var DURATION = 7000/, 'hero cadence stays within the approved 6–7 second range');
  assert.match(heroScript, /var TRANSITION_DURATION = 900/, 'hero transition stays within the approved 800–1000ms range');
  assert.match(heroScript, /function preloadNext\(/, 'only the next hero image is warmed before its transition');
  assert.match(heroCss, /transition: opacity 900ms ease, transform 900ms ease/, 'hero transitions use only opacity and transform');
  assert.doesNotMatch(heroCss, /lake-zoom|animation: lake-zoom/, 'the continuous full-hero zoom is removed');
  assert.match(loopScript, /COPIES: 2, DURATION_SECONDS: 24/, 'marquee uses exactly one duplicate and a 24 second cycle');
  assert.doesNotMatch(loopScript, /ResizeObserver/, 'marquee does not retain a resize measurement loop');
  assert.match(loopCss, /animation: logoloop-scroll var\(--logoloop-duration, 36s\) linear infinite/, 'marquee remains a linear CSS transform animation');
  assert.match(loopCss, /translate3d\(/, 'marquee is GPU-composited through translate3d');
});

test('Home hero and logo track animate smoothly without runtime errors at desktop and mobile widths', async () => {
  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of [{ width: 1440, height: 900 }, { width: 430, height: 932 }, { width: 390, height: 844 }, { width: 375, height: 812 }, { width: 360, height: 800 }]) {
      const page = await browser.newPage({ viewport });
      const errors = [];
      await page.addInitScript(() => {
        window.__homeAnimationErrors = [];
        window.addEventListener('error', (event) => {
          window.__homeAnimationErrors.push({ message: event.message, source: event.filename, line: event.lineno, column: event.colno });
        });
      });
      page.on('pageerror', (error) => errors.push(error.stack || error.message));
      try {
        await page.goto(`http://127.0.0.1:${server.address().port}/index.html`, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => !document.querySelector('[data-lg-skeleton-overlay]'));
        const initial = await page.evaluate(() => {
          const track = document.querySelector('.logoloop__track');
          const lists = track.querySelectorAll('.logoloop__list');
          const trackStyle = getComputedStyle(track);
          const active = document.querySelector('.hero-slide.is-active');
          return {
            lists: lists.length,
            animation: trackStyle.animationName,
            timing: trackStyle.animationTimingFunction,
            transform: trackStyle.transform,
            activeWillChange: getComputedStyle(active).willChange,
            overflow: document.documentElement.scrollWidth > innerWidth,
          };
        });
        await page.waitForTimeout(350);
        const movedTransform = await page.locator('.logoloop__track').evaluate((track) => getComputedStyle(track).transform);
        assert.equal(initial.lists, 2, `${viewport.width}px: marquee has exactly one duplicate sequence`);
        assert.equal(initial.animation, 'logoloop-scroll', `${viewport.width}px: marquee uses the CSS transform animation`);
        assert.equal(initial.timing, 'linear', `${viewport.width}px: marquee keeps linear timing`);
        assert.notEqual(movedTransform, initial.transform, `${viewport.width}px: marquee advances without JavaScript frame work`);
        assert.equal(initial.activeWillChange, 'auto', `${viewport.width}px: hero does not retain permanent compositing hints`);
        assert.equal(initial.overflow, false, `${viewport.width}px: no horizontal overflow is introduced`);

        await page.locator('.hero-tab').nth(1).click();
        const duringTransition = await page.locator('.hero').evaluate((hero) => ({
          transitioning: hero.classList.contains('hero--transitioning'),
          activeWillChange: getComputedStyle(hero.querySelector('.hero-slide.is-active')).willChange,
        }));
        assert.equal(duringTransition.transitioning, true, `${viewport.width}px: hero marks the short transition window`);
        assert.match(duringTransition.activeWillChange, /transform.*opacity|opacity.*transform/, `${viewport.width}px: will-change is limited to the active transition`);
        await page.waitForTimeout(1000);
        assert.equal(await page.locator('.hero-slide.is-active').evaluate((slide) => getComputedStyle(slide).willChange), 'auto', `${viewport.width}px: will-change clears after the transition`);
        const browserErrors = await page.evaluate(() => window.__homeAnimationErrors);
        assert.deepEqual(errors.concat(browserErrors.map((error) => JSON.stringify(error))), [], `${viewport.width}px: home animations emit no runtime errors`);
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});
