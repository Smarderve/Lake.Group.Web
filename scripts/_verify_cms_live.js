/* Live verification of the running Lake Group CMS + news-api.js loader.
 *
 * Requires (run in order, from repo root):
 *   1. backend: npm run db:start      (embedded Postgres on :5432)
 *   2. backend: npm run migrate && seed
 *   3. backend: npm run dev           (CMS on the port printed in /tmp/lake-cms.log)
 *
 * Then:  node scripts/_verify_cms_live.js <CMS_PORT>
 *
 * A) Admin UI — visits /admin, completes the Payload "Create First User"
 *    flow with a throwaway account, and asserts the dashboard renders.
 * B) news.html + news-api.js — serves the static site on :8977, injects
 *    window.LAKE_NEWS_API_URL = <CMS>, and asserts article cards render
 *    from the live CMS API (not the bundled dataset).
 * C) Fallback path — news.html with no API URL keeps using bundled data.
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const CMS_PORT = process.argv[2] || '51985';
const CMS_URL = `http://localhost:${CMS_PORT}`;
const STATIC_PORT = 8977;
const ROOT = path.resolve(__dirname, '..');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  let file = path.join(ROOT, urlPath === '/' ? 'news.html' : urlPath);
  if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
});

let failures = 0;
function check(name, ok, detail) {
  if (ok) {
    console.log(`  ✓ ${name}`);
  } else {
    failures++;
    console.error(`  ✗ ${name} — ${detail || ''}`);
  }
}

(async () => {
  await new Promise((resolve) => server.listen(STATIC_PORT, resolve));
  const browser = await chromium.launch();

  try {
    /* --------------------------- A) Admin UI --------------------------- */
    console.log(`A) Admin UI — ${CMS_URL}/admin`);
    const adminPage = await browser.newPage();
    const adminErrors = [];
    adminPage.on('pageerror', (e) => adminErrors.push(String(e)));
    await adminPage.goto(`${CMS_URL}/admin`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await adminPage.waitForTimeout(4000);

    const bodyText = await adminPage.evaluate(() => document.body.innerText || '');
    const hasFirstUserForm = /create.*first.*user|first.*user|create account/i.test(bodyText);
    check('admin shows first-user (or login) screen', hasFirstUserForm, bodyText.slice(0, 120).replace(/\n/g, ' '));

    if (hasFirstUserForm) {
      // Payload's create-first-user form: email + password (+ optional name).
      // Override via env so the throwaway credentials never have to live in code.
      const email = process.env.CMS_ADMIN_EMAIL || 'freebuff-admin@lakegroup.test';
      const password = process.env.CMS_ADMIN_PASSWORD || 'LakeGroupTest!2026';
      const inputs = adminPage.locator('input');
      const count = await inputs.count();
      for (let i = 0; i < count; i++) {
        const type = await inputs.nth(i).getAttribute('type');
        if (type === 'email') await inputs.nth(i).fill(email);
        else if (type === 'password') await inputs.nth(i).fill(password);
        else if (type === 'text') await inputs.nth(i).fill('Freebuff Admin');
      }
      const submit = adminPage.locator('button[type="submit"], button:has-text("Create"), button:has-text("Submit")').first();
      await submit.click({ timeout: 10000 }).catch(() => {});
      // Wait for the dashboard shell (Payload admin nav renders).
      await adminPage.waitForSelector('nav, header, .nav, [class*="nav"]', { timeout: 30000 }).catch(() => {});
      await adminPage.waitForTimeout(3000);
      const after = await adminPage.evaluate(() => document.body.innerText || '');
      const dashboardLoaded = /dashboard|collections|content|news|media|logout|account/i.test(after) && !/create.*first.*user/i.test(after);
      check('first user created, dashboard rendered', dashboardLoaded, after.slice(0, 160).replace(/\n/g, ' '));
      check('no page errors (admin)', adminErrors.length === 0, adminErrors.join(' | '));
    }
    await adminPage.close();

    /* -------------------- B) news.html → live CMS API ------------------ */
    console.log('B) news.html + news-api.js → live CMS API');
    const pageB = await browser.newPage();
    const apiRequests = [];
    pageB.on('request', (r) => {
      if (r.url().includes('/api/news')) apiRequests.push(r.url());
    });
    await pageB.addInitScript((cms) => { window.LAKE_NEWS_API_URL = cms; }, CMS_URL);
    const errorsB = [];
    pageB.on('pageerror', (e) => errorsB.push(String(e)));
    await pageB.goto(`http://localhost:${STATIC_PORT}/news.html`, { waitUntil: 'networkidle', timeout: 60000 });
    await pageB.waitForSelector('.news-card', { timeout: 15000 }).catch(() => {});

    const stateB = await pageB.evaluate(() => ({
      featured: document.querySelector('.news-featured__title')?.textContent?.trim() || '',
      cards: document.querySelectorAll('.news-card').length,
      sourceLen: window.LAKE_NEWS ? window.LAKE_NEWS.length : 0,
      firstCardTitle: document.querySelector('.news-card__title')?.textContent?.trim() || '',
    }));

    check('news.html requested /api/news from the CMS', apiRequests.length > 0, 'no /api/news request seen');
    check('cards rendered from live API', stateB.cards > 0, `got ${stateB.cards}`);
    check('LAKE_NEWS replaced by CMS data (41 seeded docs)', stateB.sourceLen === 41, `got ${stateB.sourceLen}`);
    check('featured article from CMS', stateB.featured.length > 0, `got "${stateB.featured}"`);
    check('no page errors (API path)', errorsB.length === 0, errorsB.join(' | '));
    await pageB.close();

    /* ------------------ C) Fallback: bundled data only ----------------- */
    console.log('C) Fallback path (no API configured)');
    const pageC = await browser.newPage();
    const errorsC = [];
    pageC.on('pageerror', (e) => errorsC.push(String(e)));
    await pageC.goto(`http://localhost:${STATIC_PORT}/news.html`, { waitUntil: 'networkidle', timeout: 60000 });
    await pageC.waitForSelector('.news-card', { timeout: 15000 }).catch(() => {});
    const stateC = await pageC.evaluate(() => ({
      cards: document.querySelectorAll('.news-card').length,
      sourceLen: window.LAKE_NEWS ? window.LAKE_NEWS.length : 0,
    }));
    check('bundled fallback renders cards', stateC.cards > 0, `got ${stateC.cards}`);
    check('bundled dataset intact', stateC.sourceLen > 20, `got ${stateC.sourceLen}`);
    check('no page errors (fallback path)', errorsC.length === 0, errorsC.join(' | '));
    await pageC.close();
  } finally {
    await browser.close();
    server.close();
  }

  if (failures) {
    console.error(`\n${failures} check(s) FAILED`);
    process.exit(1);
  }
  console.log('\nAll live CMS checks PASSED');
  process.exit(0);
})().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
