const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const crypto = require('node:crypto');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const locales = ['sw', 'hi', 'ar', 'zh', 'fr', 'es', 'pt'];
const labels = { sw: 'Kiswahili', hi: 'हिन्दी', ar: 'العربية', zh: '简体中文', fr: 'Français', es: 'Español', pt: 'Português' };
const drafts = Object.fromEntries(locales.map((locale) => [locale, JSON.parse(fs.readFileSync(path.join(root, 'scripts', 'i18n-drafts', locale, 'shared-ui.json'), 'utf8'))]));
const heroDrafts = Object.fromEntries(locales.map((locale) => [locale, JSON.parse(fs.readFileSync(path.join(root, 'scripts', 'i18n-drafts', locale, 'hero-carousel.json'), 'utf8'))]));
const dictionary = JSON.parse(fs.readFileSync(path.join(root, 'assets', 'i18n-content.json'), 'utf8'));
for (const locale of locales) {
  dictionary[locale] ||= {};
  for (const row of drafts[locale].translations) dictionary[locale][row.key] = row.translation;
  for (const row of heroDrafts[locale].translations) dictionary[locale][row.key] = row.translation;
}
const releaseId = crypto.createHash('sha256').update(locales.map((locale) => drafts[locale].sourceDigest).join(':')).digest('hex').slice(0, 24);
const unsignedAssets = Object.fromEntries(locales.map((locale) => [locale, {
  schemaVersion: 1, releaseId, manifestVersion: drafts[locale].sourceDigest,
  language: locale, pages: {},
}]));
const assets = Object.fromEntries(locales.map((locale) => {
  const unsigned = unsignedAssets[locale];
  const integrity = `sha256-${crypto.createHash('sha256').update(JSON.stringify(unsigned)).digest('base64')}`;
  return [locale, { ...unsigned, integrity }];
}));
const pointer = {
  schemaVersion: 1, releaseId, manifestVersion: drafts.sw.sourceDigest,
  activeLanguages: ['en', ...locales],
  files: Object.fromEntries(locales.map((locale) => [locale, `releases/${releaseId}/${locale}.json`])),
};
const mime = new Map([
  ['.css', 'text/css'], ['.html', 'text/html'], ['.js', 'text/javascript'], ['.json', 'application/json'],
  ['.svg', 'image/svg+xml'], ['.webp', 'image/webp'], ['.png', 'image/png'], ['.jpg', 'image/jpeg'], ['.jpeg', 'image/jpeg'],
]);
let server;
let browser;
let baseUrl;

async function addDraftBanner(page) {
  await page.addInitScript(() => document.addEventListener('DOMContentLoaded', () => {
    const badge = document.createElement('aside');
    badge.textContent = 'LOCAL TRANSLATION DRAFT PREVIEW — NOT APPROVED OR PUBLIC';
    badge.setAttribute('aria-label', badge.textContent);
    Object.assign(badge.style, {
      position: 'fixed', top: '8px', left: '50%', transform: 'translateX(-50%)', zIndex: '2147483647',
      background: '#8a2d00', color: '#fff', padding: '5px 8px', font: '600 10px sans-serif',
      borderRadius: '4px', pointerEvents: 'none',
    });
    document.body.append(badge);
  }, { once: true }));
}

test.before(async () => {
  server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
    if (pathname === '/assets/i18n-published/current.json') {
      res.writeHead(200, { 'content-type': 'application/json', 'x-lake-i18n-state': 'local-seven-locale-draft-preview-only' }).end(JSON.stringify(pointer));
      return;
    }
    const release = pathname.match(new RegExp(`^/assets/i18n-published/releases/${releaseId}/(sw|hi|ar|zh|fr|es|pt)\\.json$`));
    if (release) {
      res.writeHead(200, { 'content-type': 'application/json', 'x-lake-i18n-state': 'local-seven-locale-draft-preview-only' }).end(JSON.stringify(assets[release[1]]));
      return;
    }
    if (pathname === '/assets/i18n-content.js') {
      res.writeHead(200, { 'content-type': 'text/javascript' }).end(`window.__LAKE_I18N_CONTENT__ = ${JSON.stringify(dictionary)};`);
      return;
    }
    const file = path.resolve(root, `.${pathname}`);
    if (file !== root && !file.startsWith(`${root}${path.sep}`)) { res.writeHead(403).end(); return; }
    fs.readFile(file, (error, data) => {
      if (error) { res.writeHead(404).end(); return; }
      res.writeHead(200, { 'content-type': mime.get(path.extname(file)) || 'application/octet-stream' }).end(data);
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true });
});

test.after(async () => {
  await browser?.close();
  if (server) await new Promise((resolve) => server.close(resolve));
});

test('seven locale shared UI drafts switch on real homepage DOM and persist in desktop and mobile preview', async () => {
  const screenshotDir = path.join(root, 'docs', 'qa', 'i18n-seven-locale-draft-preview');
  fs.mkdirSync(screenshotDir, { recursive: true });
  for (const locale of locales) {
    assert.equal(drafts[locale].status, 'DRAFT_PENDING_HUMAN_REVIEW');
    assert.equal(drafts[locale].reviewEvidence, null);
    assert.equal(drafts[locale].releaseEligible, false);
    const expectedHome = drafts[locale].translations.find((row) => row.key === 'nav.home')?.translation;
    const expectedHero = heroDrafts[locale].translations.map((row) => row.translation);
    assert.ok(expectedHome, `${locale} has a real navigation draft`);
    assert.equal(expectedHero.length, 6);

    const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
    await addDraftBanner(desktop);
    await desktop.goto(`${baseUrl}/index.html`, { waitUntil: 'domcontentloaded' });
    await desktop.locator('.lang-trigger').first().click();
    const option = desktop.locator(`.lang-menu [data-lang="${locale}"]`).first();
    await option.waitFor({ state: 'visible' });
    await assert.equal(await option.isDisabled(), false, `${locale} enabled only in this local draft preview`);
    await option.click();
    await desktop.waitForFunction((code) => window.LakeI18n?.current === code, locale);
    await desktop.waitForFunction((text) => document.querySelector('[data-i18n="nav.home"]')?.textContent === text, expectedHome);
    await desktop.waitForFunction((texts) => texts.includes(document.querySelector('.hero-sub')?.textContent.trim()), expectedHero);
    if (locale === 'ar') assert.equal(await desktop.locator('html').getAttribute('dir'), 'rtl');
    await desktop.waitForTimeout(1200);
    if (locale === 'ar') {
      assert.ok(await desktop.evaluate(() => document.querySelector('.hero').getBoundingClientRect().left === 0), 'Arabic desktop hero remains anchored to the viewport');
      assert.equal(await desktop.evaluate(() => { scrollTo(1200, 0); return scrollX; }), 0, 'Arabic desktop cannot be horizontally displaced by off-canvas content');
    }
    await desktop.screenshot({ path: path.join(screenshotDir, `homepage-${locale}-desktop-draft.png`) });
    await desktop.reload({ waitUntil: 'domcontentloaded' });
    await desktop.waitForFunction((code) => window.LakeI18n?.current === code, locale);
    await desktop.waitForFunction((text) => document.querySelector('[data-i18n="nav.home"]')?.textContent === text, expectedHome);
    await desktop.locator('.lang-trigger').first().click();
    await desktop.locator('.lang-menu [data-lang="en"]').first().click();
    await desktop.waitForFunction(() => window.LakeI18n?.current === 'en' && document.querySelector('[data-i18n="nav.home"]')?.textContent === 'Home');
    await desktop.close();

    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    await addDraftBanner(mobile);
    await mobile.goto(`${baseUrl}/index.html`, { waitUntil: 'domcontentloaded' });
    await mobile.locator('#nav-toggle').click();
    await mobile.locator('.mob-language-trigger').click();
    await mobile.locator(`#mob-language-panel [data-lang="${locale}"]`).click();
    await mobile.waitForFunction((code) => window.LakeI18n?.current === code, locale);
    await mobile.waitForFunction((text) => document.querySelector('[data-i18n="nav.home"]')?.textContent === text, expectedHome);
    await mobile.waitForFunction((texts) => texts.includes(document.querySelector('.hero-sub')?.textContent.trim()), expectedHero);
    if (locale === 'ar') assert.equal(await mobile.locator('html').getAttribute('dir'), 'rtl');
    await mobile.locator('#nav-toggle').click();
    await mobile.waitForTimeout(1200);
    await mobile.screenshot({ path: path.join(screenshotDir, `homepage-${locale}-mobile-draft.png`) });
    assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${locale} mobile width`);
    await mobile.close();
    console.log(`${locale} (${labels[locale]}): homepage nav translated and persisted in draft-only preview`);
  }
});
