const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const crypto = require('node:crypto');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const mime = new Map([
  ['.css', 'text/css'], ['.html', 'text/html'], ['.js', 'text/javascript'],
  ['.json', 'application/json'], ['.svg', 'image/svg+xml'], ['.webp', 'image/webp'],
  ['.png', 'image/png'], ['.jpg', 'image/jpeg'], ['.jpeg', 'image/jpeg'],
]);

let server;
let browser;
let baseUrl;

test.before(async () => {
  server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
    const file = path.resolve(root, `.${pathname}`);
    if (file !== root && !file.startsWith(`${root}${path.sep}`)) {
      res.writeHead(403).end();
      return;
    }
    fs.readFile(file, (error, data) => {
      if (error) {
        res.writeHead(404).end();
        return;
      }
      res.writeHead(200, { 'content-type': mime.get(path.extname(file)) || 'application/octet-stream' });
      res.end(data);
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

test('desktop selector exposes eight selectable languages and applies draft locales', async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${baseUrl}/index.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.LakeI18n?.current === 'en' && window.LakeI18n?.draftPreview === true);
  const trigger = page.locator('.lang-trigger');
  await trigger.waitFor({ state: 'visible' });
  const options = page.locator('.lang-menu .lang-btn');
  await trigger.click();
  await assert.equal(await options.count(), 8);
  assert.equal(await options.filter({ hasText: 'English' }).isEnabled(), true);
  for (const [label, code] of [['Kiswahili', 'sw'], ['हिन्दी', 'hi'], ['العربية', 'ar'], ['简体中文', 'zh'], ['Français', 'fr'], ['Español', 'es'], ['Português', 'pt']]) {
    const option = options.filter({ hasText: label });
    assert.equal(await option.count(), 1, `${label} is present once`);
    assert.equal(await option.isEnabled(), true, `${label} is selectable in draft preview`);
    assert.equal(await option.getAttribute('data-available'), 'true');
    assert.equal(await option.getAttribute('data-lang'), code);
  }
  await page.locator('.lang-menu .lang-btn[data-lang="fr"]').click();
  await page.waitForFunction(() => window.LakeI18n?.current === 'fr' && localStorage.getItem('lake-lang') === 'fr');
  assert.equal(await page.locator('html').getAttribute('lang'), 'fr');
  await page.close();
});

test('desktop selector opens from the keyboard and marks the current choice', async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${baseUrl}/index.html`, { waitUntil: 'domcontentloaded' });
  const trigger = page.locator('.lang-trigger').first();
  await trigger.focus();
  await trigger.press('Enter');
  await page.locator('.lang-menu').first().waitFor({ state: 'visible' });
  assert.equal(await trigger.getAttribute('aria-expanded'), 'true');
  assert.equal(await page.locator('.lang-menu .lang-btn[aria-current="true"]').textContent(), 'English');
  await page.close();
});

test('desktop selector opens from the language label and pointer can enter the compact menu', async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${baseUrl}/index.html`, { waitUntil: 'domcontentloaded' });
  const trigger = page.locator('.lang-trigger').first();
  const label = trigger.locator('span').first();
  await label.hover();
  const menu = page.locator('.lang-menu').first();
  await menu.waitFor({ state: 'visible' });
  await page.waitForFunction(() => document.querySelector('.lang-switcher')?.classList.contains('is-open'));
  const bounds = await menu.boundingBox();
  assert.ok(bounds && bounds.width >= 190 && bounds.width <= 210, `compact menu width: ${JSON.stringify(bounds)}`);
  const option = menu.locator('[data-lang="en"]');
  const optionBounds = await option.boundingBox();
  assert.ok(optionBounds && optionBounds.height >= 34 && optionBounds.height <= 40, `compact row height: ${JSON.stringify(optionBounds)}`);
  await option.hover();
  await page.waitForTimeout(220);
  assert.equal(await trigger.getAttribute('aria-expanded'), 'true', 'menu stays open while pointer is inside the menu');
  await page.close();
});

test('mobile selector opens, preserves selected English on reload, and fits the viewport', async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/index.html`, { waitUntil: 'domcontentloaded' });
  await page.locator('#nav-toggle').click();
  const trigger = page.locator('.mob-language-trigger');
  await trigger.waitFor({ state: 'visible' });
  await trigger.click();
  const panel = page.locator('#mob-language-panel');
  await panel.waitFor({ state: 'visible' });
  assert.equal(await panel.locator('.mob-language-option').count(), 8);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'mobile layout has no horizontal overflow');
  await panel.locator('[data-lang="en"]').click();
  await page.waitForFunction(() => localStorage.getItem('lake-lang') === 'en');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.LakeI18n?.current === 'en');
  assert.equal(await page.evaluate(() => localStorage.getItem('lake-lang')), 'en');
  await context.close();
});

test('RTL direction reaches the legacy navigation and keeps the language menu in the viewport', async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${baseUrl}/index.html`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.documentElement.setAttribute('dir', 'rtl'));
  assert.equal(await page.locator('.site-nav').evaluate((element) => getComputedStyle(element).direction), 'rtl');
  await page.locator('.lang-trigger').first().click();
  const menu = page.locator('.lang-menu').first();
  await menu.waitFor({ state: 'visible' });
  const bounds = await menu.boundingBox();
  assert.ok(bounds && bounds.x >= 0 && bounds.x + bounds.width <= 1440, `RTL language menu stays within the viewport: ${JSON.stringify(bounds)}`);
  await page.close();
});

test('draft page translations reach visible copy and survive switching, reload, navigation, and English restore', async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  const page = await context.newPage();
  const readRows = (locale, html) => JSON.parse(fs.readFileSync(path.join(root, 'scripts', 'i18n-drafts', locale, `${html}.json`), 'utf8')).translations
    .filter((row) => row.translation !== row.source && row.selector);
  const findVisibleSourceRow = async (html, rows) => page.evaluate(({ html, rows }) => {
    const norm = (value) => String(value || '').replace(/<br\s*\/?\s*>/gi, ' ').replace(/\s+/g, ' ').trim();
    for (const row of rows) {
      let nodes = [];
      try { nodes = [...document.querySelectorAll(row.selector)]; } catch { continue; }
      const element = nodes.find((node) => node.getClientRects().length && norm(row.mode === 'attribute' ? node.getAttribute(row.attribute) : node.textContent) === norm(row.source));
      if (element) return { html, selector: row.selector, mode: row.mode, attribute: row.attribute, source: row.source, translation: row.translation };
    }
    return null;
  }, { html, rows });
  const switchTo = async (code) => {
    const trigger = page.locator('.lang-trigger').first();
    if (!(await trigger.getAttribute('aria-expanded')).includes('true')) await trigger.click();
    await page.locator(`.lang-menu [data-lang="${code}"]`).click();
    await page.waitForFunction((locale) => window.LakeI18n?.current === locale && localStorage.getItem('lake-lang') === locale, code);
  };
  const assertRow = async (row, locale, field) => page.waitForFunction(({ row, locale, field }) => {
    const el = document.querySelector(row.selector);
    if (!el) return false;
    const value = row.mode === 'attribute' ? el.getAttribute(row.attribute) : el.textContent;
    const expected = field === 'source' ? row.source : window.LakeI18n.localizeDigitsInText(locale, row.translation);
    const norm = (text) => String(text || '').replace(/<br\s*\/?\s*>/gi, ' ').replace(/\s+/g, ' ').trim();
    return norm(value) === norm(expected);
  }, { row, locale, field });

  await page.goto(`${baseUrl}/index.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.LakeI18n?.current === 'en' && window.__LAKE_I18N_CONTENT__);
  const indexRow = await findVisibleSourceRow('index.html', readRows('fr', 'index.html'));
  assert.ok(indexRow, 'index page has visible French draft copy that matches its current English source');
  await switchTo('fr');
  await assertRow(indexRow, 'fr', 'translation');
  assert.equal(await page.locator('html').getAttribute('lang'), 'fr');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.LakeI18n?.current === 'fr');
  await assertRow(indexRow, 'fr', 'translation');

  await page.goto(`${baseUrl}/about.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.LakeI18n?.current === 'fr');
  const aboutRows = readRows('fr', 'about.html');
  const aboutRow = await page.evaluate((rows) => {
    const norm = (value) => String(value || '').replace(/<br\s*\/?\s*>/gi, ' ').replace(/\s+/g, ' ').trim();
    for (const row of rows) {
      let nodes = [];
      try { nodes = [...document.querySelectorAll(row.selector)]; } catch { continue; }
      const element = nodes.find((node) => node.getClientRects().length && norm(row.mode === 'attribute' ? node.getAttribute(row.attribute) : node.textContent) === norm(row.translation));
      if (element) return row;
    }
    return null;
  }, aboutRows);
  assert.ok(aboutRow, 'about page renders a French draft row after navigation with persisted language');
  await switchTo('ar');
  await page.waitForFunction(() => document.documentElement.dir === 'rtl');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Arabic page fits the desktop viewport');
  await switchTo('en');
  await assertRow(indexRow, 'en', 'source');
  await context.close();
});

test('rapid language selection keeps the latest locale when an earlier draft request finishes last', async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  const page = await context.newPage();
  await page.route('**/scripts/i18n-drafts/pt/**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 350));
    await route.continue();
  });
  await page.goto(`${baseUrl}/index.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.LakeI18n?.current === 'en' && window.LakeI18n?.draftPreview === true);
  await page.locator('.lang-trigger').first().click();
  await page.evaluate(() => {
    document.querySelector('.lang-menu [data-lang="pt"]').click();
    document.querySelector('.lang-menu [data-lang="ar"]').click();
  });
  await page.waitForFunction(() => window.LakeI18n?.current === 'ar' && localStorage.getItem('lake-lang') === 'ar');
  await page.waitForTimeout(500);
  assert.equal(await page.locator('html').getAttribute('lang'), 'ar');
  assert.equal(await page.locator('html').getAttribute('dir'), 'rtl');
  assert.equal(await page.evaluate(() => localStorage.getItem('lake-lang')), 'ar');
  await context.close();
});

test('approved CMS snapshot translations reach the Lake Aviation page after a language change', async () => {
  const releaseId = 'cms-fixture-release';
  const content = {
    hero: { heading: 'Lake Aviation', description: 'Fixture aviation services.', image: '/assets/images/delivery/lake-aviation/remediated/lake-aviation-hero-apron-clean.webp', alt: 'Aircraft' },
    introduction: { heading: 'Aviation services', body: 'Fixture introduction in English.' },
    cta: { label: 'Contact Lake Aviation', href: '/contact.html' },
    seo: { title: 'Lake Aviation fixture', description: 'Fixture CMS description.' },
  };
  const documents = { 'lake-aviation': content };
  const translations = { fr: { 'lake-aviation': { 'introduction.body': 'La prestation aéronautique approuvée par le CMS.' } } };
  const canonical = (value) => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
    ? Object.keys(value).sort().reduce((result, key) => { result[key] = canonical(value[key]); return result; }, {}) : value;
  const integrity = `sha256-${crypto.createHash('sha256').update(JSON.stringify(canonical({ schemaVersion: 1, documents, translations }))).digest('base64')}`;
  const snapshot = { schemaVersion: 1, releaseId, integrity, documents, translations };
  const localeReleaseId = 'b'.repeat(24);
  const localeUnsigned = { schemaVersion: 1, releaseId: localeReleaseId, manifestVersion: 'fixture-locale', language: 'fr', pages: {} };
  const localeAsset = { ...localeUnsigned, integrity: `sha256-${crypto.createHash('sha256').update(JSON.stringify(localeUnsigned)).digest('base64')}` };
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  const page = await context.newPage();
  await page.addInitScript(() => { window.LAKE_CMS_CONTENT_V2 = { enabled: true, pointerUrl: '/public-content/cms-v2/current.json' }; });
  await page.route('**/assets/i18n-published/current.json', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ schemaVersion: 1, releaseId: localeReleaseId, manifestVersion: 'fixture-locale', activeLanguages: ['en', 'fr'], files: { fr: `releases/${localeReleaseId}/fr.json` } }) }));
  await page.route('**/assets/i18n-published/releases/**/fr.json', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(localeAsset) }));
  await page.route('**/public-content/cms-v2/current.json', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ schemaVersion: 2, releaseId, integrity, snapshotUrl: `releases/${releaseId}/content.json` }) }));
  await page.route('**/public-content/cms-v2/releases/**/content.json', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(snapshot) }));
  await page.goto(`${baseUrl}/lake-aviation.html`, { waitUntil: 'domcontentloaded' });
  const body = page.locator('[data-cms-field="introduction.body"]');
  await page.waitForFunction(() => window.LakeI18n?.current === 'en');
  await page.waitForFunction(() => document.querySelector('[data-cms-field="introduction.body"]')?.textContent === 'Fixture introduction in English.');
  await page.locator('.lang-trigger').first().click();
  await page.locator('.lang-menu [data-lang="fr"]').click();
  await page.waitForFunction(() => document.querySelector('[data-cms-field="introduction.body"]')?.textContent === 'La prestation aéronautique approuvée par le CMS.');
  assert.equal(await body.textContent(), 'La prestation aéronautique approuvée par le CMS.');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.LakeI18n?.current === 'fr' && document.querySelector('[data-cms-field="introduction.body"]')?.textContent === 'La prestation aéronautique approuvée par le CMS.');
  await context.close();
});
