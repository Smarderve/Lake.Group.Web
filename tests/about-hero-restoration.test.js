'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const test = require('node:test');
const { chromium } = require('playwright');
const { resolveStatic } = require('../scripts/_safe_static.js');

const ROOT = path.join(__dirname, '..');
const HERO_ASSET = 'assets/images/about/about-hero-lake-energies-enhanced.webp';
const STORY_ASSET = 'assets/images/about/about-story-terminal-enhanced.webp';

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, file))).digest('hex');
}

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const requestPath = (req.url || '/').split('?')[0];
      const filePath = resolveStatic(ROOT, requestPath === '/' ? '/about.html' : requestPath);
      if (!filePath) return res.writeHead(403).end('Forbidden');
      fs.readFile(filePath, (error, data) => {
        if (error) return res.writeHead(404).end('Not found');
        const mime = {
          '.css': 'text/css', '.html': 'text/html', '.js': 'application/javascript',
          '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml',
          '.webp': 'image/webp', '.woff2': 'font/woff2',
        }[path.extname(filePath).toLowerCase()];
        res.writeHead(200, { 'Content-Type': mime || 'application/octet-stream' });
        res.end(data);
      });
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

test('About uses the two supplied enhanced images byte-for-byte', () => {
  assert.equal(sha256(HERO_ASSET), '62fbe3cc2306e6538f71e49759c70a46bcaa07e0ce87aabb8b04b6d12d6800dd');
  assert.equal(sha256(STORY_ASSET), '5eeb767efe861cb28988e98b95aa2926a3b75cae9071d1ee8567558af4fbf556');
  const html = fs.readFileSync(path.join(ROOT, 'about.html'), 'utf8');
  assert.match(html, new RegExp(`<section class="our-story-embed"[\\s\\S]*?src="${HERO_ASSET}"`));
  assert.match(html, new RegExp(`<section class="fs-section"[\\s\\S]*?<figure[\\s\\S]*?src="${STORY_ASSET}"`));
});

test('About restores a full-screen accessible carousel without homepage controls', async () => {
  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
      const page = await browser.newPage({ viewport });
      await page.goto(`${base}/about.html`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => !document.documentElement.classList.contains('lg-loading'), null, { timeout: 12000 });
      await page.locator('[data-lg-skeleton-overlay]').waitFor({ state: 'detached', timeout: 2500 }).catch(() => {});
      await page.waitForFunction(() => document.querySelectorAll('#ose-progress .ose-dot').length === 3);

      const initial = await page.evaluate(() => {
        const stage = document.querySelector('#ose-stage');
        const nav = document.querySelector('.site-nav');
        const image = document.querySelector('#ose-s1 .ose-photo');
        const overlay = document.querySelector('#ose-s1 .ose-tint');
        const firstPostHeroImage = document.querySelector('.our-story-embed + .fs-section figure img');
        return {
          stageHeight: stage.getBoundingClientRect().height,
          navTop: nav.getBoundingClientRect().top,
          stageTop: stage.getBoundingClientRect().top,
          sceneCount: stage.querySelectorAll('.ose-scene').length,
          activeCount: stage.querySelectorAll('.ose-scene.ose-active').length,
          firstSrc: image.getAttribute('src'),
          fit: getComputedStyle(image).objectFit,
          position: getComputedStyle(image).objectPosition,
          overlay: getComputedStyle(overlay).backgroundImage,
          secondSrc: firstPostHeroImage && firstPostHeroImage.getAttribute('src'),
          arrows: stage.querySelectorAll('.ose-arrow').length,
          dots: stage.querySelectorAll('.ose-dot').length,
          homepageControls: document.querySelectorAll('.hero-keyfacts, .hero-tabs').length,
          overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        };
      });

      assert(initial.stageHeight >= viewport.height, `${viewport.width}px: hero must fill the viewport`);
      assert.equal(initial.navTop, initial.stageTop, `${viewport.width}px: navbar must overlay the hero`);
      assert.equal(initial.sceneCount, 3);
      assert.equal(initial.activeCount, 1);
      assert.equal(initial.firstSrc, HERO_ASSET);
      assert.equal(initial.fit, 'cover');
      assert.equal(initial.position, '50% 50%');
      assert.doesNotMatch(initial.overlay, /rgba?\((?!0, 0, 0)/, 'hero overlay must remain neutral');
      assert.equal(initial.secondSrc, STORY_ASSET);
      assert.equal(initial.arrows, 2);
      assert.equal(initial.dots, 3);
      assert.equal(initial.homepageControls, 0);
      assert.equal(initial.overflow, false);

      await page.locator('.ose-arrow-next').click();
      assert.equal(await page.locator('#ose-s2').getAttribute('aria-hidden'), 'false');
      assert.equal(await page.locator('.ose-dot[aria-current="true"]').getAttribute('aria-label'), 'Show About slide 2');
      await page.locator('.ose-arrow-prev').click();
      assert.equal(await page.locator('#ose-s1').getAttribute('aria-hidden'), 'false');
      await page.waitForTimeout(700);

      await page.screenshot({ path: path.join(os.tmpdir(), `lake-about-restored-${viewport.width}.png`), fullPage: false });
      await page.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
});
