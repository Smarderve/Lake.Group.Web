'use strict';

const assert = require('assert');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const test = require('node:test');
const { chromium } = require('playwright');
const { resolveStatic } = require('../scripts/_safe_static.js');

const ROOT = path.join(__dirname, '..');

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const requestPath = (req.url || '/').split('?')[0];
      const filePath = resolveStatic(ROOT, requestPath === '/' ? '/index.html' : requestPath);
      if (!filePath) return res.writeHead(403).end('Forbidden');
      fs.readFile(filePath, (error, data) => {
        if (error) return res.writeHead(404).end('Not found');
        const mime = {
          '.css': 'text/css', '.html': 'text/html', '.js': 'application/javascript',
          '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
          '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2',
        }[path.extname(filePath).toLowerCase()];
        res.writeHead(200, { 'Content-Type': mime || 'application/octet-stream' });
        res.end(data);
      });
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function assertNeutralLightOverlay(background, label) {
  const stops = [...background.matchAll(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/g)];
  assert(stops.length > 0, `${label}: overlay must contain explicit neutral color stops`);
  for (const stop of stops) {
    const [, red, green, blue, alpha = '1'] = stop;
    assert.equal(Number(red), 0, `${label}: overlay must not contain red/brand tint`);
    assert.equal(Number(green), 0, `${label}: overlay must not contain green/brand tint`);
    assert.equal(Number(blue), 0, `${label}: overlay must not contain blue/brand tint`);
    assert(Number(alpha) >= 0.10 && Number(alpha) <= 0.18, `${label}: opacity ${alpha} must stay within 10%-18%`);
  }
}

function assertSubtleHomeTextVeil(background) {
  const stops = [...background.matchAll(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/g)];
  assert.equal(stops.length, 4, 'Home: expected the four-stop text-side gradient');
  const expected = [[1, 63, 92, 0.135], [1, 63, 92, 0.07], [1, 63, 92, 0.025], [1, 63, 92, 0]];
  stops.forEach((stop, index) => {
    const [, red, green, blue, alpha = '1'] = stop;
    assert.deepEqual([Number(red), Number(green), Number(blue)], expected[index].slice(0, 3), 'Home: uses only the subtle Lake-blue veil');
    assert(Math.abs(Number(alpha) - expected[index][3]) <= 0.003, 'Home: preserves the intended subtle opacity');
  });
  assert.match(background, /35%/);
  assert.match(background, /50%/);
  assert.match(background, /60%/);
}

function assertLightText(color, label) {
  const match = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  assert(match, `${label}: text needs a rendered foreground color`);
  assert(Math.max(Number(match[1]), Number(match[2]), Number(match[3])) >= 220, `${label}: text must remain light over photography`);
}

test('hero photography uses only a subtle neutral readability veil', async () => {
  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  const base = `http://127.0.0.1:${server.address().port}`;
  const pages = [
    ['Home', 'index.html', '.hero-scrim', '.hero-content .hero-sub'],
    ['About', 'about.html', '#ose-s1 .ose-tint', '#ose-s1 .ose-display'],
    ['Leadership', 'leadership.html', '.page-hero .hero-overlay', '.page-hero h1'],
    ['Contact', 'contact.html', '.page-hero .hero-overlay', '.page-hero h1'],
    ['History', 'history.html', '.page-hero .hero-overlay', '.page-hero h1'],
    ['Gallery', 'gallery.html', '.gal-slider__slide.is-active .gal-slider__scrim', '.gal-slider__slide.is-active .gal-slider__title'],
    ['Lake Oil', 'lake-oil.html', '.page-hero .hero-overlay', '.page-hero h1'],
    ['Lake Agro', 'lake-agro.html', '.page-hero .hero-overlay', '.page-hero h1'],
    ['Gulf Aggregates', 'gulf-aggregates.html', '.page-hero .hero-overlay', '.page-hero h1'],
    ['Ocean Galleria', 'ocean-galleria.html', '.page-hero .hero-overlay', '.page-hero h1'],
    ['News', 'news.html', '.page-hero .hero-overlay', '.page-hero h1'],
  ];

  try {
    for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
      for (const [label, file, overlaySelector, textSelector] of pages) {
        const page = await browser.newPage({ viewport });
        await page.goto(`${base}/${file}`, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => !document.documentElement.classList.contains('lg-loading'), null, { timeout: 12000 });
        await page.locator('[data-lg-skeleton-overlay]').waitFor({ state: 'detached', timeout: 2500 }).catch(() => {});
        await page.locator(overlaySelector).first().waitFor({ state: 'attached' });
        const result = await page.evaluate(({ overlaySelector, textSelector }) => {
          const overlay = document.querySelector(overlaySelector);
          const text = document.querySelector(textSelector);
          const navLink = document.querySelector('.nav-links a');
          const media = document.querySelector('.page-hero .hero-media, .hero-slide.is-active img, #ose-s1 .ose-photo, .gal-slider__slide.is-active img');
          return {
            background: getComputedStyle(overlay).backgroundImage,
            textColor: text ? getComputedStyle(text).color : '',
            navColor: navLink ? getComputedStyle(navLink).color : '',
            mediaFilter: media ? getComputedStyle(media).filter : 'none',
            overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          };
        }, { overlaySelector, textSelector });
        if (label === 'Home') assertSubtleHomeTextVeil(result.background);
        else assertNeutralLightOverlay(result.background, `${label} ${viewport.width}px`);
        assertLightText(result.textColor, `${label}: hero text`);
        assertLightText(result.navColor, `${label}: navbar text`);
        assert.doesNotMatch(result.mediaFilter, /blur|brightness|grayscale|hue-rotate|sepia/, `${label}: photo must retain natural detail and color`);
        assert.equal(result.overflow, false, `${label}: hero correction must not create horizontal overflow`);
        if (['Home', 'About', 'Leadership', 'Gallery', 'Lake Oil', 'Lake Agro'].includes(label)) {
          await page.screenshot({
            path: path.join(os.tmpdir(), `lake-hero-${label.toLowerCase().replaceAll(' ', '-')}-${viewport.width}.png`),
            fullPage: false,
          });
        }
        await page.close();
      }
    }
  } finally {
    await browser.close();
    server.close();
  }
});
