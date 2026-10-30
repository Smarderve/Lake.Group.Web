'use strict';

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

/** Opens the language picker the way each breakpoint exposes it. */
async function selectLanguage(page, lang) {
  const inlineTrigger = page.locator('.lang-trigger:visible').first();
  if (await inlineTrigger.count()) {
    if ((await inlineTrigger.getAttribute('aria-expanded')) !== 'true') await inlineTrigger.click();
    await page.locator(`.lang-menu [data-lang="${lang}"]:visible`).first().click();
  } else {
    const drawerTrigger = page.locator('.mob-language-trigger').first();
    if (!(await drawerTrigger.isVisible())) {
      const navOpen = await page.evaluate(() => document.body.classList.contains('lg-nav-open'));
      if (!navOpen) await page.locator('#nav-toggle, .nav-toggle').first().click();
      await drawerTrigger.waitFor({ state: 'visible' });
    }
    const panel = page.locator('#mob-language-panel');
    if (!(await panel.isVisible())) await drawerTrigger.click();
    await panel.locator(`.mob-language-option[data-lang="${lang}"]`).first().click();
  }
  await page.waitForFunction((expected) => document.documentElement.lang === expected, lang);
  await page.waitForFunction(() => !document.querySelector('[data-lg-skeleton-overlay]'));
  await page.waitForTimeout(150);
}

async function openPage(pagePath, viewport = { width: 1440, height: 900 }) {
  const page = await browser.newPage({ viewport });
  await page.goto(`${baseUrl}/${pagePath}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.lang-menu', { state: 'attached' });
  await page.waitForFunction(() => !document.querySelector('[data-lg-skeleton-overlay]'));
  return page;
}

const firstFamily = (stack) => String(stack).split(',')[0].replace(/["']/g, '').trim();

test('language switching swaps Almarai, Hind and Jost live without a refresh', async () => {
  const page = await openPage('index.html');
  try {
    const read = () => page.evaluate(() => {
      const pick = (selector) => {
        const el = document.querySelector(selector);
        return el ? getComputedStyle(el).fontFamily.split(',')[0].replace(/["']/g, '').trim() : null;
      };
      return {
        lang: document.documentElement.lang,
        dir: document.documentElement.dir,
        body: pick('body'),
        heading: pick('h1, h2, .section-title'),
        nav: pick('.nav-links > li > a'),
        paragraph: pick('p'),
      };
    });

    const expected = {
      en: { family: 'Jost', dir: 'ltr' }, sw: { family: 'Jost', dir: 'ltr' },
      fr: { family: 'Jost', dir: 'ltr' }, es: { family: 'Jost', dir: 'ltr' },
      pt: { family: 'Jost', dir: 'ltr' }, zh: { family: 'Jost', dir: 'ltr' },
      ar: { family: 'Almarai', dir: 'rtl' }, hi: { family: 'Hind', dir: 'ltr' },
    };

    let state = await read();
    assert.equal(state.lang, 'en');
    assert.equal(state.body, 'Jost', 'English starts on Jost');

    for (const lang of ['ar', 'hi', 'en', 'sw', 'fr', 'es', 'pt', 'zh', 'ar', 'hi', 'en']) {
      await selectLanguage(page, lang);
      state = await read();
      const want = expected[lang];
      assert.equal(state.dir, want.dir, `${lang} keeps ${want.dir} direction`);
      for (const key of ['body', 'heading', 'nav', 'paragraph']) {
        assert.equal(state[key], want.family, `${lang} ${key} uses ${want.family} (got ${state[key]})`);
      }
      // Script fonts must never leak into the Latin-first locales.
      if (want.family === 'Jost') {
        for (const key of ['body', 'heading', 'nav']) {
          assert.ok(!/Almarai|Hind/.test(state[key]), `${lang} ${key} keeps the script fonts out (got ${state[key]})`);
        }
      }
    }

    await selectLanguage(page, 'ar');
    assert.equal(await page.evaluate(() => document.fonts.check('400 16px Almarai', 'العربية')), true, 'Almarai is loaded for Arabic text');
    await selectLanguage(page, 'hi');
    assert.equal(await page.evaluate(() => document.fonts.check('400 16px Hind', 'हिन्दी')), true, 'Hind is loaded for Devanagari text');
  } finally {
    await page.close();
  }
});

test('navigation, mega-menu, cards, forms, FAQs and footer follow the language font', async () => {
  const cases = [
    { pagePath: 'contact.html', selectors: ['h1', 'p', '.btn', '.nav-links > li > a', '.mm-pane', '.lang-menu', '#contact-name', '#contact-email', '#contact-phone', '#contact-subject', '#contact-message', '.site-footer', '.site-footer a'] },
    { pagePath: 'lake-oil.html', selectors: ['h1', 'p', '.btn', '.nav-links > li > a', '.svc-card__title', '.svc-card__desc', '.site-footer a'] },
    { pagePath: 'agrinova-tech.html', selectors: ['h1', '.ag-faq', '.btn', '.site-footer a'] },
    { pagePath: '404.html', selectors: ['h1', 'p', '.btn', '.nav-links > li > a', '.site-footer a'] },
  ];
  for (const { pagePath, selectors } of cases) {
    const page = await openPage(pagePath);
    try {
      for (const [lang, family] of [['ar', 'Almarai'], ['hi', 'Hind'], ['en', 'Jost']]) {
        await selectLanguage(page, lang);
        const found = await page.evaluate((sels) => sels.map((selector) => {
          const el = document.querySelector(selector);
          if (!el) return null;
          return { selector, family: getComputedStyle(el).fontFamily.split(',')[0].replace(/["']/g, '').trim() };
        }).filter(Boolean), selectors);
        assert.ok(found.length >= selectors.length - 1, `${pagePath} exposes the components under test`);
        for (const { selector, family: actual } of found) {
          assert.equal(actual, family, `${pagePath} [${lang}] ${selector} uses ${family}`);
        }
      }
    } finally {
      await page.close();
    }
  }
});

test('Arabic joins its letters and Hindi shapes its conjuncts in the selected face', async () => {
  const page = await openPage('index.html');
  try {
    await selectLanguage(page, 'ar');
    const arabic = await page.evaluate(() => {
      const ctx = document.createElement('canvas').getContext('2d');
      const width = (family, text) => { ctx.font = `400 40px ${family}`; return ctx.measureText(text).width; };
      return {
        sample: width('Almarai', 'العربية'),
        fallback: width('sans-serif', 'العربية'),
        ligature: width('Almarai', 'لا'),
        separate: width('Almarai', 'ل') + width('Almarai', 'ا'),
      };
    });
    assert.notEqual(Math.round(arabic.sample), Math.round(arabic.fallback), 'Arabic renders in Almarai metrics, not a system fallback');
    assert.ok(arabic.ligature < arabic.separate - 2, `lam-alef is shaped as one ligature (${arabic.ligature} < ${arabic.separate})`);

    await selectLanguage(page, 'hi');
    const hindi = await page.evaluate(() => {
      const ctx = document.createElement('canvas').getContext('2d');
      const width = (family, text) => { ctx.font = `400 40px ${family}`; return ctx.measureText(text).width; };
      return {
        sample: width('Hind', 'हिन्दी'),
        fallback: width('sans-serif', 'हिन्दी'),
        conjunct: width('Hind', 'क्ष'),
        separate: width('Hind', 'क्') + width('Hind', 'ष'),
      };
    });
    assert.notEqual(Math.round(hindi.sample), Math.round(hindi.fallback), 'Devanagari renders in Hind metrics, not a system fallback');
    assert.ok(hindi.conjunct < hindi.separate - 1, `क्ष is shaped as one conjunct (${hindi.conjunct} < ${hindi.separate})`);
  } finally {
    await page.close();
  }
});

test('Arabic and Hindi typography fit desktop and mobile layouts without overflow', async () => {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const page = await openPage('contact.html', viewport);
    try {
      for (const [lang, dir, family] of [['ar', 'rtl', 'Almarai'], ['hi', 'ltr', 'Hind']]) {
        await selectLanguage(page, lang);
        const state = await page.evaluate(() => {
          const overflowing = [...document.querySelectorAll('.nav-links a, .site-footer a, .btn, #contact-message-form input, #contact-message-form textarea')]
            .filter((el) => el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow !== 'visible')
            .map((el) => el.id || el.className || el.tagName);
          return {
            dir: document.documentElement.dir,
            body: getComputedStyle(document.body).fontFamily.split(',')[0].replace(/["']/g, '').trim(),
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            clipped: overflowing,
          };
        });
        const label = `${viewport.width}px [${lang}]`;
        assert.equal(state.dir, dir, `${label} direction is ${dir}`);
        assert.equal(state.body, family, `${label} body uses ${family}`);
        assert.ok(state.overflow <= 1, `${label} has no horizontal overflow: ${state.overflow}px`);
        assert.deepEqual(state.clipped, [], `${label} clips no text controls: ${state.clipped.join(', ')}`);
      }
    } finally {
      await page.close();
    }
  }
});
