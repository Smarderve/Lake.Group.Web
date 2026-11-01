'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
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
    const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
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

async function assertEnglish(page, label) {
  await page.waitForFunction(() => window.LakeI18n?.current === 'en' && !document.documentElement.classList.contains('lake-i18n-booting'));
  const state = await page.evaluate(() => ({
    lang: document.documentElement.lang,
    dir: document.documentElement.dir,
    current: window.LakeI18n.current,
    local: localStorage.getItem('lake-lang'),
    session: sessionStorage.getItem('lake-lang'),
    foreignLocaleMutations: window.__foreignLocaleMutations || [],
    visibleArabic: [...document.body.querySelectorAll('*')].some((el) => !el.children.length && el.checkVisibility?.({ checkVisibilityCSS: true }) && /[\u0600-\u06ff]/u.test(el.textContent || '')),
    visibleCjk: [...document.body.querySelectorAll('*')].some((el) => !el.children.length && el.checkVisibility?.({ checkVisibilityCSS: true }) && /[\u4e00-\u9fff]/u.test(el.textContent || '')),
  }));
  assert.deepEqual(state, { lang: 'en', dir: 'ltr', current: 'en', local: 'en', session: 'en', foreignLocaleMutations: [], visibleArabic: false, visibleCjk: false }, label);
}

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`stale Arabic, Chinese and Hindi preferences are overridden at ${viewport.width}px`, async () => {
    const context = await browser.newContext({ viewport, serviceWorkers: 'block' });
    await context.addInitScript(() => {
      window.__foreignLocaleMutations = [];
      new MutationObserver(() => {
        const root = document.documentElement;
        if (root.lang !== 'en' || root.dir !== 'ltr') window.__foreignLocaleMutations.push({ lang: root.lang, dir: root.dir });
      }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang', 'dir'] });
      localStorage.setItem('lake-lang', 'ar');
      sessionStorage.setItem('lake-lang', 'zh');
      document.cookie = 'lake-lang=hi; path=/';
    });
    const page = await context.newPage();
    await page.goto(`${baseUrl}/index.html?lang=ar`, { waitUntil: 'domcontentloaded' });
    await assertEnglish(page, 'stale locale must be replaced before the page resolves');

    await page.goto(`${baseUrl}/about.html`, { waitUntil: 'domcontentloaded' });
    await assertEnglish(page, 'direct internal page visit must remain English');
    await page.goBack({ waitUntil: 'domcontentloaded' });
    await assertEnglish(page, 'browser back must remain English');
    await page.goForward({ waitUntil: 'domcontentloaded' });
    await assertEnglish(page, 'browser forward must remain English');

    const hidden = await page.evaluate(() => ({
      desktop: getComputedStyle(document.querySelector('.lang-switcher')).display,
      mobile: getComputedStyle(document.querySelector('.mob-language-trigger')).display,
    }));
    assert.deepEqual(hidden, { desktop: 'none', mobile: 'none' }, 'both selectors remain hidden while disabled');
    await context.close();
  });
}
