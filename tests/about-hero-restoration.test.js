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
const HERO_ASSET = 'assets/images/about/about-hero-07.webp';
const STORY_ASSET = 'assets/images/about/about-story-terminal-enhanced.webp';
const HERO_ASSETS = [
  'assets/images/about/about-hero-07.webp',
  'assets/images/about/about-hero-09.webp',
  'assets/images/about/about-hero-12.webp',
  'assets/images/about/about-hero-03.webp',
  'assets/images/about/about-hero-04.webp',
  'assets/images/about/about-hero-05.webp',
  'assets/images/about/about-hero-06.webp',
];
const REMOVED_HERO_ASSETS = [
  'assets/images/lakeoil/current/lake-energies-station-approved.webp',
  'assets/images/about/about-hero-02.webp',
  'assets/images/about/about-hero-08.webp',
  'assets/images/about/about-hero-10.webp',
  'assets/images/about/about-hero-11.webp',
];

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

test('About uses only the approved remaining hero images and keeps the lower story asset separate', () => {
  assert.equal(sha256(STORY_ASSET), '5eeb767efe861cb28988e98b95aa2926a3b75cae9071d1ee8567558af4fbf556');
  const html = fs.readFileSync(path.join(ROOT, 'about.html'), 'utf8');
  HERO_ASSETS.forEach((asset) => assert.match(html, new RegExp(asset.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&'))));
  REMOVED_HERO_ASSETS.forEach((asset) => assert.equal(html.includes(asset), false, `removed About hero reference remains: ${asset}`));
  assert.match(html, new RegExp(`<section class="our-story-embed"[\\s\\S]*?src="${HERO_ASSET}"`));
  ['about-hero-lake-energies-enhanced', 'lakeoil/current/fleet-loading', 'leadership/annual-event'].forEach((legacy) => assert.equal(html.includes(legacy), false, `legacy About hero reference remains: ${legacy}`));
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
      await page.waitForFunction(() => document.querySelectorAll('#ose-progress .ose-dot').length === 7);

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
      assert.equal(initial.sceneCount, 7);
      assert.equal(initial.activeCount, 1);
      assert.equal(initial.firstSrc, HERO_ASSET);
      assert.equal(initial.fit, 'cover');
      assert.equal(initial.position, '50% 50%');
      assert.doesNotMatch(initial.overlay, /rgba?\((?!0, 0, 0)/, 'hero overlay must remain neutral');
      assert.equal(initial.secondSrc, STORY_ASSET);
      assert.equal(initial.arrows, 2);
      assert.equal(initial.dots, 7);
      assert.equal(initial.homepageControls, 0);
      assert.equal(initial.overflow, false);

      await page.locator('.ose-dot').first().click();
      await page.locator('.ose-arrow-next').click();
      assert.equal(await page.locator('#ose-s2').getAttribute('aria-hidden'), 'false', await page.locator('.ose-scene').evaluateAll((els) => els.map((el) => `${el.id}:${el.getAttribute('aria-hidden')}`).join(',')));
      assert.equal(await page.locator('.ose-dot[aria-current="true"]').getAttribute('aria-label'), 'Show About slide 2');
      await page.locator('.ose-arrow-prev').click();
      assert.equal(await page.locator('#ose-s1').getAttribute('aria-hidden'), 'false');
      const cycle = [];
      for (let i = 0; i < HERO_ASSETS.length; i++) {
        cycle.push(await page.locator('.ose-scene.ose-active .ose-photo').getAttribute('src'));
        await page.locator('.ose-arrow-next').click();
      }
      assert.deepEqual(cycle, HERO_ASSETS, `${viewport.width}px: carousel must visit all seven approved slides in order`);
      assert.equal(await page.locator('.ose-scene.ose-active .ose-photo').getAttribute('src'), HERO_ASSETS[0], `${viewport.width}px: carousel must wrap to the first approved slide`);
      await page.waitForTimeout(700);

      await page.screenshot({ path: path.join(os.tmpdir(), `lake-about-restored-${viewport.width}.png`), fullPage: false });
      await page.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
});
