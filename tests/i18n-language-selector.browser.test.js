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

test('desktop selector exposes eight locales and marks seven pending', async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${baseUrl}/index.html`, { waitUntil: 'domcontentloaded' });
  const trigger = page.locator('.lang-trigger');
  await trigger.waitFor({ state: 'visible' });
  await trigger.click();
  const options = page.locator('.lang-menu .lang-btn');
  await assert.equal(await options.count(), 8);
  assert.equal(await options.filter({ hasText: 'English' }).isEnabled(), true);
  for (const label of ['Kiswahili', 'हिन्दी', 'العربية', '简体中文', 'Français', 'Español', 'Português']) {
    const option = options.filter({ hasText: label });
    assert.equal(await option.count(), 1, `${label} is present once`);
    assert.equal(await option.isDisabled(), true, `${label} stays unavailable pending translation validation`);
  }
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

test('approved publication fixture applies on the real page and survives reload and navigation', async () => {
  const releaseId = 'a'.repeat(24);
  const unsigned = {
    schemaVersion: 1,
    releaseId,
    manifestVersion: 'fixture-manifest',
    language: 'fr',
    pages: {
      'index.html': [{ id: 'fixture.index.heading', mode: 'runtime-text', source: 'Welcome to Lake Group', translation: 'Bienvenue Lake Group' }],
      'about.html': [{ id: 'fixture.about.heading', mode: 'runtime-text', source: 'About Lake Group', translation: 'À propos Lake Group' }],
    },
  };
  const asset = { ...unsigned, integrity: `sha256-${crypto.createHash('sha256').update(JSON.stringify(unsigned)).digest('base64')}` };
  const rtlUnsigned = { ...unsigned, language: 'ar', pages: {} };
  const rtlAsset = { ...rtlUnsigned, integrity: `sha256-${crypto.createHash('sha256').update(JSON.stringify(rtlUnsigned)).digest('base64')}` };
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  const page = await context.newPage();
  await page.route('**/assets/i18n-published/current.json', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ schemaVersion: 1, releaseId, manifestVersion: 'fixture-manifest', activeLanguages: ['en', 'fr', 'ar'], files: { fr: `releases/${releaseId}/fr.json`, ar: `releases/${rtlUnsigned.releaseId}/ar.json` } }) }));
  await page.route('**/assets/i18n-published/releases/**/fr.json', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(asset) }));
  await page.route('**/assets/i18n-published/releases/**/ar.json', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rtlAsset) }));
  await page.addInitScript(() => document.addEventListener('DOMContentLoaded', () => {
    const heading = document.createElement('h2');
    heading.id = 'fixture-heading';
    heading.textContent = location.pathname.endsWith('about.html') ? 'About Lake Group' : 'Welcome to Lake Group';
    document.body.prepend(heading);
  }, { once: true }));

  await page.goto(`${baseUrl}/index.html`, { waitUntil: 'domcontentloaded' });
  await page.locator('.lang-trigger').first().waitFor({ state: 'visible' });
  await page.waitForFunction(() => window.LakeI18n?.current === 'en' && document.querySelector('#fixture-heading'));
  await page.locator('.lang-trigger').first().click();
  await page.locator('.lang-menu [data-lang="fr"]').click();
  await page.waitForFunction(() => document.querySelector('#fixture-heading')?.textContent === 'Bienvenue Lake Group');
  await page.waitForFunction(() => localStorage.getItem('lake-lang') === 'fr');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.LakeI18n?.current === 'fr');
  await page.waitForFunction(() => document.querySelector('#fixture-heading')?.textContent === 'Bienvenue Lake Group');
  await page.goto(`${baseUrl}/about.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.LakeI18n?.current === 'fr' && document.querySelector('#fixture-heading')?.textContent === 'À propos Lake Group');
  await page.locator('.lang-trigger').first().click();
  await page.locator('.lang-menu [data-lang="ar"]').click();
  await page.waitForFunction(() => window.LakeI18n?.current === 'ar' && document.documentElement.dir === 'rtl');
  await page.waitForFunction(() => localStorage.getItem('lake-lang') === 'ar');
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
