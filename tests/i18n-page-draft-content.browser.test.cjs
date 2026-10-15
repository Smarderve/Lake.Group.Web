const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const defaultLocales = ['sw', 'hi', 'ar', 'zh', 'fr', 'es', 'pt'];
const defaultPages = ['index.html', 'contact.html', 'careers.html', 'csr.html', 'history.html', 'leadership.html', 'gallery.html', 'fleet.html', 'sustainability.html', 'cross-country.html', 'lake-oil.html'];
const locales = process.env.I18N_PAGE_LOCALES ? process.env.I18N_PAGE_LOCALES.split(',') : defaultLocales;
const pages = process.env.I18N_PAGE_FILTER ? process.env.I18N_PAGE_FILTER.split(',') : defaultPages;
const mime = new Map([['.css', 'text/css'], ['.html', 'text/html'], ['.js', 'text/javascript'], ['.json', 'application/json']]);
let server;
let browser;
let baseUrl;

test.before(async () => {
  server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
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

test('page draft assets render real page-specific body copy in every preview locale', async () => {
  const page = await browser.newPage({ viewport: { width: 1365, height: 900 }, serviceWorkers: 'block' });
  let checked = 0;
  let eligible = 0;
  for (const html of pages) {
    const slug = html.replace(/\.html$/, '');
    for (const locale of locales) {
      const draftPath = path.join(root, 'scripts', 'i18n-drafts', locale, `${html}.json`);
      if (!fs.existsSync(draftPath)) continue;
      const draft = JSON.parse(fs.readFileSync(draftPath, 'utf8'));
      const bodyRow = draft.translations.find((row) => row.mode === 'text' && row.selector && row.source.length >= 65 && !row.selector.includes('> nav') && row.translation !== row.source);
      if (!bodyRow) continue;
      eligible += 1;
      assert.equal(draft.status, 'DRAFT_PENDING_HUMAN_REVIEW');
      assert.equal(draft.releaseEligible, false);
      await page.goto(`${baseUrl}/${html}?lake-i18n-preview=1`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.LakeI18n?.available?.includes('pt'));
      await page.locator('.lang-trigger').first().click();
      await page.locator('.lang-menu').first().waitFor({ state: 'visible' });
      await page.locator(`.lang-menu [data-lang="${locale}"]`).first().click();
      await page.waitForFunction((code) => window.LakeI18n?.current === code, locale);
      try {
        await page.waitForFunction(({ selector, expected }) => document.querySelector(selector)?.textContent.trim() === expected,
          { selector: bodyRow.selector, expected: bodyRow.translation }, { timeout: 7000 });
      } catch (error) {
        const actual = await page.locator(bodyRow.selector).first().textContent().catch(() => '<selector missing>');
        console.error(`${slug}/${locale} mismatch; expected ${JSON.stringify(bodyRow.translation)}; actual ${JSON.stringify(actual)}`);
        throw error;
      }
      checked += 1;
      console.log(`${slug}/${locale}: rendered ${bodyRow.source.slice(0, 64)}…`);
    }
  }
  assert.ok(eligible > 0, 'selected pages contain page-specific draft body rows');
  assert.equal(checked, eligible, 'every available body draft rendered against the real page DOM');
  await page.close();
});
