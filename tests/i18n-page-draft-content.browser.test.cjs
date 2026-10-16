const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const defaultLocales = ['sw', 'hi', 'ar', 'zh', 'fr', 'es', 'pt'];
const defaultPages = fs.readdirSync(root).filter((file) => file.endsWith('.html')).sort();
const publicRedirects = new Map(JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8')).redirects
  .filter((entry) => entry.source.startsWith('/') && entry.source.endsWith('.html') && entry.destination.startsWith('/') && entry.destination.endsWith('.html'))
  .map((entry) => [entry.source.slice(1), entry.destination.slice(1)]));
const locales = process.env.I18N_PAGE_LOCALES ? process.env.I18N_PAGE_LOCALES.split(',') : defaultLocales;
const pages = process.env.I18N_PAGE_FILTER ? process.env.I18N_PAGE_FILTER.split(',') : defaultPages;
const mime = new Map([['.css', 'text/css'], ['.html', 'text/html'], ['.js', 'text/javascript'], ['.json', 'application/json']]);
let server;
let browser;
let baseUrl;

test.before(async () => {
  server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
    const redirect = publicRedirects.get(pathname.slice(1));
    if (redirect) { res.writeHead(308, { location: `/${redirect}` }).end(); return; }
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

test('static page drafts render visible translated copy on all 41 pages in all seven target locales', async () => {
  const page = await browser.newPage({ viewport: { width: 1365, height: 900 }, serviceWorkers: 'block' });
  await page.addInitScript(() => Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false }));
  let checked = 0;
  const sharedDrafts = Object.fromEntries(locales.map((locale) => [locale, JSON.parse(fs.readFileSync(path.join(root, 'scripts', 'i18n-drafts', locale, 'shared-ui.json'), 'utf8'))]));
  const select = async (code) => {
    await page.evaluate((selected) => {
      const root = [...document.querySelectorAll('.lang-switcher')].find((item) => item.querySelector('.lang-trigger')?.getClientRects().length);
      if (!root) throw new Error('Visible language selector missing');
      if (!root.classList.contains('is-open')) root.querySelector('.lang-trigger').click();
      const button = root.querySelector(`.lang-btn[data-lang="${selected}"]`);
      if (!button || button.disabled) throw new Error(`Locale is not available: ${selected}`);
      button.click();
    }, code);
    await page.waitForFunction((selected) => window.LakeI18n?.current === selected, code);
  };
  for (const html of pages) {
    const slug = html.replace(/\.html$/, '');
    const resolvedHtml = publicRedirects.get(html) || html;
    const drafts = Object.fromEntries(locales.map((locale) => {
      const draftPath = path.join(root, 'scripts', 'i18n-drafts', locale, `${resolvedHtml}.json`);
      assert.equal(fs.existsSync(draftPath), true, `${slug}/${locale} has a static page file`);
      const draft = JSON.parse(fs.readFileSync(draftPath, 'utf8'));
      assert.equal(draft.status, 'DRAFT_PENDING_HUMAN_REVIEW');
      assert.equal(draft.releaseEligible, false);
      return [locale, draft];
    }));
    const offline = resolvedHtml === 'offline.html';
    await page.goto(`${baseUrl}/${offline ? 'index.html' : html}`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.LakeI18n?.available?.includes('pt'));
    await select('en');
    for (const locale of locales) {
      if (offline) {
        await page.goto(`${baseUrl}/offline.html`, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => window.LakeI18n?.current === 'en');
      }
      const candidates = drafts[locale].translations
        .filter((row) => row.mode === 'text' && row.selector && !row.selector.includes('> nav') && !row.selector.includes('lang-switcher') && !/skip to main content/i.test(row.source) && row.translation !== row.source)
        .sort((left, right) => right.source.length - left.source.length);
      const sharedRows = sharedDrafts[locale].translations.filter((row) => row.key && row.translation !== row.source)
        .map((row) => ({ ...row, mode: 'text', selector: `[data-i18n="${row.key}"]` }));
      const sourceRow = await page.evaluate((rows) => {
        const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
        for (const row of rows) {
          const node = document.querySelector(row.selector);
          if (node && node.getClientRects().length && normalize(node.textContent) === normalize(row.source)) return row;
        }
        return null;
      }, [...candidates, ...sharedRows]);
      assert.ok(sourceRow, `${slug}/${locale} has visible English source copy`);
      if (offline) {
        await page.goto(`${baseUrl}/index.html`, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => window.LakeI18n?.available?.includes('pt'));
        await select(locale);
        await page.goto(`${baseUrl}/offline.html`, { waitUntil: 'domcontentloaded' });
      } else await select(locale);
      await page.waitForFunction(({ selector, expected }) => document.querySelector(selector)?.textContent.trim() === expected,
        { selector: sourceRow.selector, expected: sourceRow.translation }, { timeout: 7000 });
      assert.equal(await page.locator(sourceRow.selector).first().isVisible(), true, `${slug}/${locale} translated copy is visible`);
      checked += 1;
      console.log(`${slug}/${locale}: rendered ${sourceRow.source.slice(0, 64)}…`);
      if (offline) {
        await page.goto(`${baseUrl}/index.html`, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => window.LakeI18n?.available?.includes('pt'));
      }
      await select('en');
      if (offline) {
        await page.goto(`${baseUrl}/offline.html`, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => window.LakeI18n?.current === 'en');
      }
      await page.waitForFunction(({ selector, source }) => document.querySelector(selector)?.textContent.trim() === source,
        { selector: sourceRow.selector, source: sourceRow.source });
    }
  }
  assert.equal(checked, pages.length * locales.length, 'every selected page and target-locale combination rendered');
  await page.close();
});
