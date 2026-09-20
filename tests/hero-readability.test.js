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
  assert.ok(stops.length >= 4, 'Home: desktop retains a layered readability veil');
  assert.match(background, /linear-gradient/);
}

function assertNoMobileDarkeningTreatment(background) {
  assert.doesNotMatch(background, /rgba\(0, 12, 24,/);
  assert.doesNotMatch(background, /rgba\(0, 0, 0,/);
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
  const pages = [['Home', 'index.html', '.hero-scrim', '.hero-content .hero-sub']];

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
        if (label === 'Home' && viewport.width <= 720) assertNoMobileDarkeningTreatment(result.background);
        else if (label === 'Home') assertSubtleHomeTextVeil(result.background);
        else assertSubtleHomeTextVeil(result.background);
        assertLightText(result.textColor, `${label}: hero text`);
        assertLightText(result.navColor, `${label}: navbar text`);
        assert.doesNotMatch(result.mediaFilter, /blur|brightness|grayscale|hue-rotate|sepia/, `${label}: photo must retain natural detail and color`);
        assert.equal(result.overflow, false, `${label}: hero correction must not create horizontal overflow`);
        if (label === 'Home') {
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

test('every Home hero slide keeps mobile copy, key facts, CTA and navigation readable', async () => {
  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  const base = `http://127.0.0.1:${server.address().port}`;
  const qaDir = path.join(ROOT, 'docs', 'qa', 'p0-27-home-hero');
  fs.mkdirSync(qaDir, { recursive: true });
  try {
    for (const viewport of [{ width: 360, height: 800 }, { width: 390, height: 844 }, { width: 412, height: 915 }, { width: 430, height: 932 }, { width: 768, height: 1024 }, { width: 820, height: 1180 }, { width: 1024, height: 1366 }]) {
      const page = await browser.newPage({ viewport });
      await page.goto(`${base}/index.html`, { waitUntil: 'domcontentloaded' });
      for (let index = 0; index < 6; index += 1) {
        if (index > 0) await page.locator('.hero-tab').nth(index).evaluate((button) => button.click());
        await page.waitForTimeout(1200);
        const state = await page.evaluate(() => {
          const visible = (selector) => {
            const node = document.querySelector(selector);
            if (!node) return false;
            const style = getComputedStyle(node); const rect = node.getBoundingClientRect();
            return style.visibility !== 'hidden' && style.display !== 'none' && Number(style.opacity) > 0 && rect.right > 0 && rect.left < innerWidth && rect.bottom > 0 && rect.top < innerHeight;
          };
          const image = document.querySelector('.hero-slide.is-active img');
          const toggle = document.querySelector('.nav-toggle');
          const toggleBar = document.querySelector('.nav-toggle span');
          return {
            overlay: getComputedStyle(document.querySelector('.hero-scrim')).backgroundImage,
            headline: visible('.hero-sub'), facts: visible('.hero-keyfacts'), cta: visible('.hero-link'), arrow: visible('.hero-link-ico'), hamburger: visible('.nav-toggle'),
            headlineColor: getComputedStyle(document.querySelector('.hero-sub')).color,
            labelColor: getComputedStyle(document.querySelector('.hero-kf-label')).color,
            headlineWeight: Number(getComputedStyle(document.querySelector('.hero-sub')).fontWeight),
            toggleBackground: toggle ? getComputedStyle(toggle).backgroundColor : '',
            toggleBorder: toggle ? getComputedStyle(toggle).borderTopWidth : '',
            toggleShadow: toggle ? getComputedStyle(toggle).boxShadow : '',
            toggleBarColor: toggleBar ? getComputedStyle(toggleBar).backgroundColor : '',
            currentSrc: image && image.currentSrc,
            overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          };
        });
        assert.ok(state.overlay.includes('gradient'), `${viewport.width}px slide ${index + 1}: readability overlay exists`);
        assert.ok(state.headline && state.facts && state.cta && state.arrow && state.hamburger, `${viewport.width}px slide ${index + 1}: all mobile hero elements are visible`);
        assertLightText(state.headlineColor, `${viewport.width}px slide ${index + 1}: headline`);
        assertLightText(state.labelColor, `${viewport.width}px slide ${index + 1}: key-fact label`);
        assert.ok(state.headlineWeight >= 600, `${viewport.width}px slide ${index + 1}: headline uses the stronger mobile weight`);
        assert.match(state.toggleBackground, /rgba\(0, 0, 0, 0\)|transparent/, `${viewport.width}px slide ${index + 1}: hamburger stays transparent`);
        assert.equal(state.toggleBorder, '0px', `${viewport.width}px slide ${index + 1}: hamburger has no border`);
        assert.equal(state.toggleShadow, 'none', `${viewport.width}px slide ${index + 1}: hamburger has no shadow`);
        assert.match(state.toggleBarColor, /rgb\(255, 255, 255\)/, `${viewport.width}px slide ${index + 1}: hamburger bars remain solid white`);
        assert.equal(state.overflow, false, `${viewport.width}px slide ${index + 1}: no horizontal overflow`);
        if (viewport.width <= 600) assert.match(state.currentSrc, /-mobile\.webp$/, `${viewport.width}px slide ${index + 1}: requests the mobile full-frame image`);
        else if (viewport.width <= 1024) assert.match(state.currentSrc, /-tablet\.webp$/, `${viewport.width}px slide ${index + 1}: requests the tablet full-frame image`);
        else assert.doesNotMatch(state.currentSrc, /-(?:mobile|tablet)\.webp$/, `${viewport.width}px slide ${index + 1}: retains desktop image`);
        if (viewport.width === 390 || viewport.width === 430) await page.screenshot({ path: path.join(qaDir, `slide-${index + 1}-${viewport.width}.png`), fullPage: false });
      }
      await page.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
});
