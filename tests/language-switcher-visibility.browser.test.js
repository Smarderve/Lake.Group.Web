'use strict';

/**
 * Regression for the temporary language-selector hide driven by
 * `LANGUAGE_SWITCHER_ENABLED` in assets/site.js (false for launch).
 *
 * While the flag is false, <html> never receives `lg-lang-switcher-enabled`,
 * so phase-01-navbar.css hides the entire desktop and mobile language surface
 * from first paint: no globe, label, dropdown or option may be visible, the
 * dropdown must not open even from a programmatic click, and the rest of the
 * navbar (Business Verticals, Company, links, drawer accordions) must keep
 * working. The markup itself must stay intact, and adding the restore class —
 * the exact effect of flipping the flag to true — must bring the selector
 * back with all eight languages functional.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const TYPES = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.mp4': 'video/mp4',
};
let server;
let browser;
let baseUrl;

test.before(async () => {
  server = http.createServer((req, res) => {
    const requested = decodeURIComponent((req.url || '/index.html').split('?')[0]).replace(/^\/+/, '') || 'index.html';
    const file = path.resolve(ROOT, requested);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404); res.end(); return;
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true });
});

test.after(async () => {
  await browser?.close();
  if (server) await new Promise((resolve) => server.close(resolve));
});

test('desktop navbar hides the whole language selector without affecting other navigation', async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    await page.goto(`${baseUrl}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.LakeI18n?.current === 'en');
    await page.waitForFunction(() => document.querySelector('.lang-trigger')?.disabled === false);

    const state = await page.evaluate(() => {
      const switcher = document.querySelector('.lang-switcher');
      const trigger = document.querySelector('.lang-trigger');
      const menu = document.querySelector('.lang-menu');
      // Even a programmatic click on the hidden trigger must not reveal anything.
      trigger?.click();
      return {
        switcherDisplay: switcher ? getComputedStyle(switcher).display : null,
        triggerDisplay: trigger ? getComputedStyle(trigger).display : null,
        menuVisible: menu ? menu.checkVisibility({ checkVisibilityCSS: true }) : false,
        navLinksRight: Math.round(document.querySelector('.nav-links')?.getBoundingClientRect().right || 0),
        navInnerRight: Math.round(document.querySelector('.nav-inner')?.getBoundingClientRect().right || 0),
        aboutLinkVisible: Boolean(document.querySelector('.nav-links a[href="about.html"]')?.checkVisibility({ checkVisibilityCSS: true })),
      };
    });

    assert.equal(state.switcherDisplay, 'none', 'desktop language switcher (globe + label + dropdown) is hidden');
    assert.equal(state.triggerDisplay, 'none', 'desktop language trigger is hidden');
    assert.equal(state.menuVisible, false, 'the language dropdown cannot be opened while hidden');
    assert.ok(state.navLinksRight > 0 && state.navLinksRight <= state.navInnerRight, 'navbar links keep their layout with no empty language gap');
    assert.equal(state.aboutLinkVisible, true, 'the rest of the desktop navigation stays visible');

    // Business Verticals mega-menu still opens with the switcher hidden.
    await page.locator('[data-nav-section="subsidiaries"]').first().click();
    await page.waitForTimeout(250);
    assert.equal(
      await page.locator('[data-nav-section="subsidiaries"]').first().evaluate((link) => link.parentElement.classList.contains('is-open')),
      true,
      'Business Verticals still opens while the language selector is hidden',
    );

    // Internal navigation still works.
    await page.locator('.nav-links a[href="about.html"]').first().click();
    await page.waitForURL('**/about.html');
    await page.waitForFunction(() => window.LakeI18n?.current === 'en');
  } finally {
    await page.close();
  }
});

test('mobile drawer hides the language accordion but keeps the other drawers usable', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    await page.goto(`${baseUrl}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.LakeI18n?.current === 'en');
    await page.locator('#nav-toggle').click();
    await page.waitForFunction(() => document.querySelector('#nav-mobile')?.classList.contains('open'));

    const state = await page.evaluate(() => {
      const trigger = document.querySelector('.mob-language-trigger');
      const panel = document.querySelector('#mob-language-panel');
      return {
        triggerVisible: trigger ? trigger.checkVisibility({ checkVisibilityCSS: true }) : false,
        globeVisible: Boolean(document.querySelector('.mob-language-globe')?.checkVisibility({ checkVisibilityCSS: true })),
        panelVisible: panel ? panel.checkVisibility({ checkVisibilityCSS: true }) : false,
        optionCount: document.querySelectorAll('.mob-language-option').length,
      };
    });
    assert.equal(state.triggerVisible, false, 'mobile language trigger is hidden');
    assert.equal(state.globeVisible, false, 'mobile language globe is hidden');
    assert.equal(state.panelVisible, false, 'mobile language panel is hidden');
    assert.equal(state.optionCount, 8, 'all eight language options stay preserved in the markup');

    // Business Verticals and Corporate accordions still open and close.
    const verticals = page.locator('.mob-primary');
    await verticals.click();
    await page.waitForFunction(() => document.querySelector('.mob-primary')?.getAttribute('aria-expanded') === 'true');

    const corporate = page.locator('.mob-corporate-trigger');
    await corporate.click();
    await page.waitForFunction(() => document.querySelector('.mob-corporate-trigger')?.getAttribute('aria-expanded') === 'true');
    assert.equal(await verticals.getAttribute('aria-expanded'), 'false', 'opening Corporate closes Business Verticals');

    // The drawer still reaches its footer action.
    assert.equal(await page.locator('#nav-mobile').getByText('Contact Us', { exact: true }).isVisible(), true, 'Contact Us remains reachable in the drawer');
  } finally {
    await page.close();
  }
});

test('the restore class brings the full language selector back with all eight languages', async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  // Setting the class is the exact runtime effect of LANGUAGE_SWITCHER_ENABLED = true.
  try {
    await page.goto(`${baseUrl}/index.html?lake-i18n-preview=1`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.LakeI18n?.current === 'en');
    await page.evaluate(() => document.documentElement.classList.add('lg-lang-switcher-enabled'));

    const display = await page.evaluate(() => getComputedStyle(document.querySelector('.lang-switcher')).display);
    assert.notEqual(display, 'none', 'the language switcher is visible again once the class is set');

    await page.locator('.lang-trigger').first().click();
    await page.locator('.lang-menu').first().waitFor({ state: 'visible' });
    assert.equal(await page.locator('.lang-menu .lang-btn').count(), 8, 'the restored selector exposes all eight languages');

    await page.locator('.lang-menu .lang-btn[data-lang="ar"]').first().click();
    await page.waitForFunction(() => document.documentElement.lang === 'ar' && document.documentElement.dir === 'rtl');
  } finally {
    await page.close();
  }
});
