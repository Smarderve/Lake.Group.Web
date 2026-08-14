'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const MIME_TYPES = {
  '.css': 'text/css',
  '.html': 'text/html',
  '.ico': 'image/x-icon',
  '.js': 'application/javascript',
  '.jpg': 'image/jpeg',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const DESKTOP = { width: 1280, height: 900 };
const MOBILE = { width: 390, height: 844 };
// Max_MS (8s) + fade (380ms) in assets/skeleton.js, with slack for slow loads.
const REMOVAL_TIMEOUT = 10000;

// Representative pages for the desktop + mobile smoke pass: heavy homepage,
// media grids, maps, forms, JS-rendered dashboards, and shared chrome pages.
const SMOKE_PAGES = [
  'index.html',
  'about.html',
  'news.html',
  'gallery.html',
  'station-locator.html',
  'contact.html',
  'lake-gas.html',
  'leadership.html',
  'our-story.html',
  'dashboard.html',
];

function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((request, response) => {
      const pathname = decodeURIComponent((request.url || '/').split('?')[0]);
      const filePath = path.resolve(ROOT, pathname === '/' ? 'index.html' : '.' + pathname);
      if (!filePath.startsWith(ROOT + path.sep) || !fs.existsSync(filePath)) {
        response.writeHead(404).end();
        return;
      }
      response.writeHead(200, { 'Content-Type': MIME_TYPES[path.extname(filePath)] || 'application/octet-stream' });
      response.end(fs.readFileSync(filePath));
    });
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function shippingPages() {
  return fs
    .readdirSync(ROOT)
    .filter((name) => name.endsWith('.html') && !['404.html', 'offline.html'].includes(name))
    .sort();
}

/* Installs an early observer that snapshots the loader's overlay and aria status
 * the moment they are created. `hide()` tears the status down synchronously and
 * the overlay only lingers through its fade, so on fast pages a post-DCL sample
 * can miss them entirely; recording at mutation time is deterministic. */
async function seedMountedObserver(page) {
  await page.addInitScript(() => {
    const record = (window.__lgSkelTest = { mount: null, status: null });

    function snapshotMount(overlay) {
      const overlayRect = overlay.getBoundingClientRect();
      const overlayStyle = getComputedStyle(overlay);
      const blocks = Array.from(document.querySelectorAll('[data-lg-skeleton-block]'));
      const rects = blocks.map((block) => block.getBoundingClientRect());
      record.mount = {
        count: document.querySelectorAll('[data-lg-skeleton-overlay]').length,
        ariaHidden: overlay.getAttribute('aria-hidden'),
        coversViewport:
          overlayRect.left <= 0 && overlayRect.top <= 0 &&
          overlayRect.right >= innerWidth - 1 && overlayRect.bottom >= innerHeight - 1,
        inert: overlay.inert === true,
        pointerEvents: overlayStyle.pointerEvents === 'none',
        opaque: overlayStyle.opacity === '1' && overlayStyle.backgroundColor !== 'transparent',
        blocks: rects.length,
        withinViewport: rects.every((rect) =>
          rect.left >= -1 && rect.top >= -1 && rect.right <= innerWidth + 1 && rect.bottom <= innerHeight + 1),
        // Mirror visible chrome: blocks in the navbar band and the vertical middle.
        navBand: rects.some((rect) => rect.top < 140 && rect.bottom > 20),
        midBand: rects.some((rect) => rect.top < innerHeight * 0.6 && rect.bottom > innerHeight * 0.2),
        kinds: Array.from(new Set(blocks.map((block) => block.dataset.lgSkeletonBlock))),
      };
      record.mount.textHeights = blocks
        .filter((block) => block.getAttribute('data-lg-skeleton-block') === 'text')
        .map((block) => Math.round(block.getBoundingClientRect().height));
      const probe = blocks[0];
      if (probe) {
        const shimmer = getComputedStyle(probe, '::after');
        record.mount.shimmer = { display: shimmer.display, animationName: shimmer.animationName };
      }
    }

    const obs = new MutationObserver(() => {
      if (!record.mount) {
        const overlay = document.querySelector('[data-lg-skeleton-overlay]');
        if (overlay) snapshotMount(overlay);
      }
      if (!record.status) {
        const status = document.getElementById('lg-skel-status');
        if (status) {
          record.status = {
            role: status.getAttribute('role'),
            live: status.getAttribute('aria-live'),
            hidden: (status.className || '').split(/\s+/).includes('lg-skel-status'),
            endsWithEllipsis: (status.textContent || '').trim().endsWith('…'),
          };
        }
      }
    });
    obs.observe(document, { childList: true, subtree: true });
  });
}

async function mountSnapshot(page) {
  return page.evaluate(() => window.__lgSkelTest && window.__lgSkelTest.mount);
}

async function completedState(page) {
  return page.evaluate(() => ({
    overlayGone: !document.querySelector('[data-lg-skeleton-overlay]'),
    statusGone: !document.getElementById('lg-skel-status'),
    loadingCleared: !document.documentElement.classList.contains('lg-loading'),
    doneMarked: document.documentElement.classList.contains('lg-skel-done'),
  }));
}

async function run() {
  const server = await startServer();
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  });

  try {
    const baseUrl = `http://127.0.0.1:${server.address().port}`;

    /* ---------- Early curtain wiring: critical CSS before any script runs ---------- */
    for (const pageName of shippingPages()) {
      const html = fs.readFileSync(path.join(ROOT, pageName), 'utf8');
      const doc = html.match(/<html\b[^>]*>/i);
      assert.ok(doc && /\blg-loading\b/.test(doc[0]), `${pageName} ships the loading class on <html>`);
      assert.ok(html.includes('id="lg-skel-critical"'), `${pageName} ships the critical early veil style`);
    }

    /* ---------- Structural contract: every shipping page, desktop layout ---------- */
    for (const pageName of shippingPages()) {
      const page = await browser.newPage({ viewport: DESKTOP });
      try {
        await seedMountedObserver(page);
        await page.goto(`${baseUrl}/${pageName}?lg-skeleton-test=1`, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => window.__lgSkelTest && !!window.__lgSkelTest.mount, null, { timeout: 3000 });

        const state = await mountSnapshot(page);
        assert.ok(state, `${pageName} mounts a layout-derived overlay`);
        assert.equal(state.count, 1, `${pageName} mounts a single overlay`);
        assert.equal(state.ariaHidden, 'true', `${pageName} hides the overlay from assistive technology`);

        assert.ok(state.coversViewport, `${pageName} overlay covers the visible page region`);
        assert.ok(state.inert, `${pageName} overlay is inert (no interactive targets)`);
        assert.ok(state.pointerEvents, `${pageName} overlay swallows no pointer events`);
        assert.ok(state.opaque, `${pageName} overlay curtain is opaque (no content beneath exposed)`);

        assert.ok(state.blocks > 0, `${pageName} contains placeholder blocks`);
        assert.ok(state.withinViewport, `${pageName} keeps skeleton blocks inside the viewport`);
        assert.ok(state.navBand, `${pageName} produces blocks for the shared navigation`);
        assert.ok(state.midBand, `${pageName} produces blocks for the visible main content`);
        assert.ok(Array.isArray(state.kinds) && state.kinds.length > 0, `${pageName} classifies placeholder kinds`);
        assert.ok(
          state.kinds.every((kind) => ['media', 'text', 'control', 'surface', 'navbar', 'navrule', 'rule', 'indicator'].includes(kind)),
          `${pageName} uses known placeholder kinds (got ${state.kinds.join(',')})`
        );

        // YouTube-style shapes: text placeholders must render as short thin lines
        // rather than full-height solid rectangles.
        const textHeights = state.textHeights || [];
        assert.ok(
          textHeights.length > 0 && textHeights.every((h) => h >= 4 && h <= 48),
          `${pageName} renders text placeholders as short lines (heights: ${textHeights.slice(0, 12).join(',')})`
        );

        const status = await page.evaluate(() => window.__lgSkelTest && window.__lgSkelTest.status);
        assert.ok(status, `${pageName} renders a loading status element`);
        assert.equal(status.role, 'status', `${pageName} communicates loading via role=status`);
        assert.equal(status.live, 'polite', `${pageName} announces loading politely`);
        assert.ok(status.hidden, `${pageName} keeps the status visually hidden`);
        assert.ok(status.endsWithEllipsis, `${pageName} status message ends with an ellipsis`);

        // Resource tracking and the timeout drive completion: the overlay is
        // removed after the curtain fades.
        await page.waitForFunction(
          () => !document.querySelector('[data-lg-skeleton-overlay]'),
          null,
          { timeout: REMOVAL_TIMEOUT }
        );
        const done = await completedState(page);
        assert.ok(done.overlayGone, `${pageName} removes the overlay after completion`);
        assert.ok(done.statusGone, `${pageName} removes the status element after completion`);
        assert.ok(done.loadingCleared, `${pageName} clears the temporary lg-loading class`);
        assert.ok(done.doneMarked, `${pageName} marks the finished loading state`);
      } finally {
        await page.close();
      }
    }

    /* ---------- Browser smoke: representative pages across desktop + mobile ---------- */
    for (const viewport of [DESKTOP, MOBILE]) {
      for (const pageName of SMOKE_PAGES) {
        const page = await browser.newPage({ viewport });
        const errors = [];
        page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
        page.on('console', (message) => {
          if (message.type() === 'error' && /skeleton|lg-skel/i.test(message.text())) {
            errors.push(`console: ${message.text()}`);
          }
        });
        try {
          const label = `${pageName} @ ${viewport.width}x${viewport.height}`;
          await seedMountedObserver(page);
          await page.goto(`${baseUrl}/${pageName}`, { waitUntil: 'domcontentloaded' });
          await page.waitForFunction(() => window.__lgSkelTest && !!window.__lgSkelTest.mount, null, { timeout: 5000 });
          const state = await mountSnapshot(page);
          assert.ok(state && state.blocks > 0, `${label} mounts skeleton blocks at this layout`);
          assert.ok(state.withinViewport, `${label} skeleton blocks fit this layout`);
          await page.waitForFunction(
            () => !document.querySelector('[data-lg-skeleton-overlay]'),
            null,
            { timeout: REMOVAL_TIMEOUT }
          );
          assert.deepEqual(errors, [], `${label} skeleton lifecycle emits no uncaught errors`);
        } finally {
          await page.close();
        }
      }
    }

    /* ---------- Accessibility: shimmer disabled under reduced motion ---------- */
    {
      const page = await browser.newPage({ viewport: DESKTOP });
      try {
        await seedMountedObserver(page);
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.goto(`${baseUrl}/index.html`, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => window.__lgSkelTest && !!window.__lgSkelTest.mount, null, { timeout: 3000 });
        const shimmer = (await mountSnapshot(page)).shimmer;
        assert.ok(shimmer, 'reduced motion records the shimmer state at mount');
        assert.equal(shimmer.animationName, 'none', 'reduced motion disables the shimmer animation');
        assert.equal(shimmer.display, 'none', 'reduced motion removes the shimmer pseudo-element');
      } finally {
        await page.close();
      }
    }

    /* ---------- Dynamic convergence: the skeleton tracks live page structure ---------- */
    {
      const page = await browser.newPage({ viewport: { width: 1280, height: 1440 } });
      try {
        // Hold images back so the window 'load' event is delayed and the curtain
        // stays up while we mutate the DOM, making the assertion deterministic.
        await page.route(/\.(jpe?g|png|webp)(\?|$)/, async (route) => {
          await new Promise((resolve) => setTimeout(resolve, 4000));
          await route.continue();
        });
        await seedMountedObserver(page);
        await page.goto(`${baseUrl}/index.html`, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => window.__lgSkelTest && !!window.__lgSkelTest.mount, null, { timeout: 3000 });
        const before = (await mountSnapshot(page)).blocks;

        // Simulate a page change: a component mounts while the skeleton is live.
        await page.evaluate(() => {
          const card = document.createElement('div');
          card.className = 'test-card';
          card.style.cssText = 'position:fixed;left:120px;top:320px;width:280px;height:180px';
          card.innerHTML = '<h3>Dynamic block</h3><p>Injected after DOMContentLoaded.</p>';
          document.body.appendChild(card);
        });

        // The loader should re-scan and grow the block set to match.
        await page.waitForFunction(
          () => typeof window.__lgSkelPolishedCount === 'number' && window.__lgSkelPolishedCount >= 1,
          null,
          { timeout: 5000 }
        );
        const after = await page.evaluate(() => {
          const r = { left: 120, top: 320, width: 280, height: 180 };
          const blocks = Array.from(document.querySelectorAll('[data-lg-skeleton-block]')).map((b) => b.getBoundingClientRect());
          const covered = blocks.some((b) =>
            b.left < r.left + r.width && b.left + b.width > r.left &&
            b.top < r.top + r.height && b.top + b.height > r.top);
          return { count: blocks.length, covered };
        });
        assert.ok(after.count > before, `skeleton grows when content mounts (${before} -> ${after.count})`);
        assert.ok(after.covered, 'skeleton gains a block inside the injected component');
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

run().then(
  () => console.log('Skeleton loader contract passed.'),
  (error) => { console.error(error); process.exitCode = 1; }
);