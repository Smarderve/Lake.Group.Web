'use strict';

/**
 * Regression: a visitor browsing in a non-English locale must never see the
 * English source copy of a page before the locale's translations land.
 *
 * The detector watches every animation frame from the first document script
 * until `lake-i18n-applied` fires and records any frame where a known English
 * source string (the `nav.companies` fallback text in the HTML) is actually
 * visible. It therefore fails for the real defect (English painted, then
 * replaced) rather than for a specific implementation detail.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const ENGLISH_SOURCE = 'Business Verticals';
const LOCALES = ['ar', 'hi', 'sw', 'fr', 'es', 'pt', 'zh'];
const TYPES = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.mp4': 'video/mp4',
};

let server;
let browser;
let baseUrl;

function expectedTranslation(locale) {
  const draft = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'i18n-drafts', locale, 'shared-ui.json'), 'utf8'));
  const row = draft.translations.find((entry) => entry.key === 'nav.companies');
  assert.ok(row && row.source === ENGLISH_SOURCE, `${locale} draft carries the nav.companies row`);
  return row.translation;
}

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

/** Installs the per-frame English-visibility detector and the stored locale. */
async function prepare(page, locale, translation) {
  await page.addInitScript(({ locale, english, translated }) => {
    try { localStorage.setItem('lake-lang', locale); } catch (error) { /* ignore */ }
    window.__lakeVisibleEnglish = [];
    window.__lakeApplied = false;
    document.addEventListener('lake-i18n-applied', () => { window.__lakeApplied = true; }, true);
    const visible = (el) => (typeof el.checkVisibility === 'function'
      ? el.checkVisibility({ checkVisibilityCSS: true, checkOpacity: true })
      : !!el.offsetParent);
    (function poll() {
      const el = document.querySelector('[data-i18n="nav.companies"]');
      if (el && visible(el)) {
        const text = el.textContent.replace(/\s+/g, ' ').trim();
        if (text === english && english !== translated) {
          window.__lakeVisibleEnglish.push({ at: Math.round(performance.now()), url: location.pathname, gated: document.documentElement.classList.contains('lake-i18n-booting') });
        }
      }
      if (!window.__lakeApplied) requestAnimationFrame(poll);
    })();
  }, { locale, english: ENGLISH_SOURCE, translated: translation });
}

async function delayDrafts(page) {
  await page.route('**/scripts/i18n-drafts/**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 320));
    await route.continue();
  });
}

async function waitForLocale(page, locale) {
  await page.waitForFunction((expected) => document.documentElement.lang === expected
    && !document.documentElement.classList.contains('lake-i18n-booting'), locale, { timeout: 15000 });
  await page.waitForFunction((expected) => {
    const el = document.querySelector('[data-i18n="nav.companies"]');
    return !!el && el.textContent.replace(/\s+/g, ' ').trim() === expected;
  }, expectedTranslation(locale), { timeout: 15000 });
}

async function assertNoEnglishFlash(page, locale, context) {
  const flashes = await page.evaluate(() => window.__lakeVisibleEnglish || []);
  assert.deepEqual(flashes, [], `${locale}: ${context} never paints English copy before the translation (${JSON.stringify(flashes.slice(0, 3))})`);
}

async function assertLocale(page, locale) {
  assert.equal(await page.evaluate(() => document.documentElement.lang), locale, `${locale}: document language is applied`);
  assert.equal(await page.evaluate(() => document.documentElement.dir), locale === 'ar' ? 'rtl' : 'ltr', `${locale}: direction stays correct`);
  assert.equal(await page.evaluate(() => document.documentElement.classList.contains('lake-i18n-booting')), false, `${locale}: the boot gate is released`);
}

test('an internal navigation opens in the selected locale without showing English', async () => {
  for (const locale of LOCALES) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
    const page = await context.newPage();
    try {
      await prepare(page, locale, expectedTranslation(locale));
      await delayDrafts(page);

      await page.goto(`${baseUrl}/index.html`, { waitUntil: 'domcontentloaded' });
      await waitForLocale(page, locale);
      await assertNoEnglishFlash(page, locale, 'initial load');
      await assertLocale(page, locale);

      await page.locator('.nav-links a[href="about.html"]').first().click();
      await page.waitForURL('**/about.html');
      await waitForLocale(page, locale);
      await assertNoEnglishFlash(page, locale, 'navigation to about.html');
      await assertLocale(page, locale);

      await page.reload({ waitUntil: 'domcontentloaded' });
      await waitForLocale(page, locale);
      await assertNoEnglishFlash(page, locale, 'reload of about.html');
      await assertLocale(page, locale);

      await page.goBack({ waitUntil: 'domcontentloaded' });
      await waitForLocale(page, locale);
      await assertNoEnglishFlash(page, locale, 'browser back');
      await assertLocale(page, locale);

      await page.goForward({ waitUntil: 'domcontentloaded' });
      await waitForLocale(page, locale);
      await assertNoEnglishFlash(page, locale, 'browser forward');
      await assertLocale(page, locale);

      const tab = await context.newPage();
      await prepare(tab, locale, expectedTranslation(locale));
      await delayDrafts(tab);
      await tab.goto(`${baseUrl}/contact.html`, { waitUntil: 'domcontentloaded' });
      await waitForLocale(tab, locale);
      await assertNoEnglishFlash(tab, locale, 'new tab direct visit');
      await assertLocale(tab, locale);
      await tab.close();
    } finally {
      await context.close();
    }
  }
});

test('a failed translation request releases the page instead of stranding the gate', async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  const page = await context.newPage();
  try {
    await prepare(page, 'ar', expectedTranslation('ar'));
    await page.route('**/scripts/i18n-drafts/**', (route) => route.abort());
    await page.goto(`${baseUrl}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !document.documentElement.classList.contains('lake-i18n-booting'), null, { timeout: 15000 });
    assert.equal(await page.evaluate(() => document.querySelector('h1')?.checkVisibility?.({ checkVisibilityCSS: true })), true, 'page content is visible after the translation request fails');
    assert.equal(await page.evaluate(() => document.documentElement.lang), 'en', 'a failed translation falls back to English deliberately');
  } finally {
    await context.close();
  }
});

test('English visits stay immediate and switching back to English restores it', async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  const page = await context.newPage();
  try {
    await page.goto(`${baseUrl}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.LakeI18n?.current === 'en');
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains('lake-i18n-booting')), false, 'English visits never gate the page');

    await page.locator('.lang-trigger').first().click();
    await page.locator('.lang-menu [data-lang="ar"]').first().click();
    await page.waitForFunction(() => document.documentElement.lang === 'ar');
    await page.waitForFunction(() => document.querySelector('[data-i18n="nav.companies"]')?.textContent.trim() === 'قطاعات الأعمال');

    await page.locator('.lang-trigger').first().click();
    await page.locator('.lang-menu [data-lang="en"]').first().click();
    await page.waitForFunction(() => document.documentElement.lang === 'en' && document.documentElement.dir === 'ltr');
    await page.waitForFunction(() => document.querySelector('[data-i18n="nav.companies"]')?.textContent.trim() === 'Business Verticals');
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains('lake-i18n-booting')), false, 'switching back to English leaves no gate behind');
  } finally {
    await context.close();
  }
});
