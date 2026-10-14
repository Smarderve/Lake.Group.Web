const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const crypto = require('node:crypto');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const draftPath = path.join(root, 'scripts', 'i18n-drafts', 'sw', 'index.html.json');
const manifestPath = path.join(root, 'scripts', '.generated', 'i18n-translation-manifest.json');
let server;
let browser;
let baseUrl;
let pointer;
let asset;

const mime = new Map([
  ['.css', 'text/css'], ['.html', 'text/html'], ['.js', 'text/javascript'],
  ['.json', 'application/json'], ['.svg', 'image/svg+xml'], ['.webp', 'image/webp'],
  ['.png', 'image/png'], ['.jpg', 'image/jpeg'], ['.jpeg', 'image/jpeg'],
  ['.woff2', 'font/woff2'], ['.webmanifest', 'application/manifest+json'],
]);

test.before(async () => {
  const draft = JSON.parse(fs.readFileSync(draftPath, 'utf8'));
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.equal(draft.status, 'DRAFT_PENDING_HUMAN_REVIEW');
  assert.equal(draft.reviewEvidence, null);
  assert.equal(draft.releaseEligible, false);
  const sources = new Map(manifest.entries.filter((entry) => entry.page === draft.page).map((entry) => [entry.id, entry]));
  assert.equal(draft.translations.length, draft.candidateCount);
  for (const row of draft.translations) assert.equal(sources.get(row.id)?.sourceHash, row.sourceHash, `stale draft row ${row.id}`);

  const releaseId = crypto.createHash('sha256').update(JSON.stringify(draft.translations.map(({ id, sourceHash }) => [id, sourceHash]))).digest('hex').slice(0, 24);
  const pages = { [draft.page]: draft.translations.map(({ id, selector, mode, attribute, source, sourceHash, translation }) => ({ id, selector, mode, attribute, source, sourceHash, translation })) };
  const unsigned = { schemaVersion: 1, releaseId, manifestVersion: draft.sourceManifestDigest, language: draft.locale, pages };
  asset = { ...unsigned, integrity: `sha256-${crypto.createHash('sha256').update(JSON.stringify(unsigned)).digest('base64')}` };
  pointer = { schemaVersion: 1, releaseId, manifestVersion: draft.sourceManifestDigest, activeLanguages: ['en', 'sw'], files: { sw: `releases/${releaseId}/sw.json` } };

  server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
    if (pathname === '/assets/i18n-published/current.json') {
      res.writeHead(200, { 'content-type': 'application/json', 'x-lake-i18n-state': 'local-ai-draft-preview-only' }).end(JSON.stringify(pointer));
      return;
    }
    if (pathname === `/assets/i18n-published/${pointer.files.sw}`) {
      res.writeHead(200, { 'content-type': 'application/json', 'x-lake-i18n-state': 'local-ai-draft-preview-only' }).end(JSON.stringify(asset));
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

test('real homepage uses source-controlled Kiswahili draft content in a local-only preview', async () => {
  const output = path.join(root, 'docs', 'qa', 'i18n-draft-preview');
  fs.mkdirSync(output, { recursive: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  const page = await context.newPage();
  await page.addInitScript(() => document.addEventListener('DOMContentLoaded', () => {
    const badge = document.createElement('aside');
    badge.textContent = 'KISWAHILI AI DRAFT PREVIEW — NOT REVIEWED OR PUBLISHED';
    badge.setAttribute('aria-label', badge.textContent);
    Object.assign(badge.style, { position: 'fixed', top: '8px', left: '8px', zIndex: '2147483647', background: '#8a2d00', color: '#fff', padding: '7px 10px', font: '600 12px sans-serif', borderRadius: '4px', pointerEvents: 'none' });
    document.body.append(badge);
  }, { once: true }));

  await page.goto(`${baseUrl}/index.html`, { waitUntil: 'domcontentloaded' });
  await page.locator('.lang-trigger').first().click();
  const swOption = page.locator('.lang-menu [data-lang="sw"]').first();
  await swOption.waitFor({ state: 'visible' });
  await page.waitForFunction(() => !document.querySelector('.lang-menu [data-lang="sw"]')?.disabled);
  await swOption.click();
  await page.waitForFunction(() => window.LakeI18n?.current === 'sw');
  await page.getByText('Nishati', { exact: true }).first().waitFor({ state: 'visible' });
  await page.waitForFunction(() => window.LakeI18n?.t('hero.sub', 'sw') === 'Tunaipa Afrika Mashariki nishati kwa miongo miwili.');
  const translatedHero = await page.locator('[data-i18n="hero.sub"]').textContent();
  assert.equal(translatedHero, 'Tunaipa Afrika Mashariki nishati kwa miongo miwili.', JSON.stringify(await page.evaluate(() => ({ current: window.LakeI18n?.current, stored: localStorage.getItem('lake-lang'), dictionaryValue: window.__LAKE_I18N_CONTENT__?.sw?.['hero.sub'], translatedValue: window.LakeI18n?.t('hero.sub', 'sw') }))));
  assert.match(await page.locator('.site-footer').innerText(), /Historia|Uongozi|Kazi/i);
  await page.waitForTimeout(1600);
  await page.screenshot({ path: path.join(output, 'kiswahili-homepage-desktop-draft.png') });
  assert.equal(await page.evaluate(() => localStorage.getItem('lake-lang')), 'sw');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.LakeI18n?.current === 'sw');
  await page.getByText('Nishati', { exact: true }).first().waitFor({ state: 'visible' });
  await context.close();

  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const mobile = await mobileContext.newPage();
  await mobile.addInitScript(() => document.addEventListener('DOMContentLoaded', () => {
    const badge = document.createElement('aside');
    badge.textContent = 'KISWAHILI AI DRAFT PREVIEW — NOT REVIEWED OR PUBLISHED';
    Object.assign(badge.style, { position: 'fixed', top: '8px', left: '8px', zIndex: '2147483647', background: '#8a2d00', color: '#fff', padding: '7px 10px', font: '600 12px sans-serif', borderRadius: '4px', pointerEvents: 'none' });
    document.body.append(badge);
  }, { once: true }));
  await mobile.goto(`${baseUrl}/index.html`, { waitUntil: 'domcontentloaded' });
  await mobile.locator('#nav-toggle').click();
  await mobile.locator('.mob-language-trigger').click();
  await mobile.locator('#mob-language-panel [data-lang="sw"]').click();
  await mobile.waitForFunction(() => window.LakeI18n?.current === 'sw');
  await mobile.waitForFunction(() => document.querySelector('[data-i18n=\"hero.sub\"]')?.textContent === 'Tunaipa Afrika Mashariki nishati kwa miongo miwili.');
  await mobile.locator('#nav-toggle').click();
  await mobile.waitForTimeout(1600);
  assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await mobile.screenshot({ path: path.join(output, 'kiswahili-homepage-mobile-draft.png') });
  await mobileContext.close();
});
