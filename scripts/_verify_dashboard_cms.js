/* Verify dashboard.html CMS wiring:
 *  A) No API configured   — login note shown, login blocked with a clear error.
 *  B) API configured      — real POST /api/users/login, dashboard console loads,
 *                           KPI counts render, collection lists render.
 *  C) CRUD                — create (POST), edit (PATCH), delete (DELETE) with the
 *                           JWT Authorization header on every authed request.
 *  D) Session restore     — reload keeps the session from sessionStorage.
 * Run: node scripts/_verify_dashboard_cms.js
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { resolveStatic } = require('./_safe_static.js');

const ROOT = path.resolve(__dirname, '..');
const PORT = 8979;

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

/* ---- Mock Payload CMS ------------------------------------------------- */
const DB = {
  news: [
    { id: 1, title: 'Lake Gas Expands in Kenya', slug: 'lake-gas-kenya', status: 'published', category: 'LPG', date: '2026-01-15T00:00:00.000Z', excerpt: 'First mock article.' },
    { id: 2, title: 'New Terminal Opens in Dar', slug: 'new-terminal-dar', status: 'draft', category: 'Expansion', date: '2026-02-01T00:00:00.000Z', excerpt: 'Second mock article.' },
  ],
  leaders: [{ id: 11, name: 'Ally Edha Awadh', role: 'Founder & Chairman', slug: 'ally-edha-awadh', featured: true, sortOrder: 1 }],
  companies: [{ id: 21, name: 'Lake Oil', slug: 'lake-oil', division: 'energies', founded: '2006', sortOrder: 1 }],
  countries: [{ id: 31, name: 'Tanzania', code: 'TZ', isOperational: true, isHeadquarters: true }],
  media: [{ id: 41, filename: 'banner.jpg', alt: 'Test banner', url: '/media/banner.jpg' }],
};
const COUNTS = { news: 12, leaders: 7, companies: 18, countries: 10, media: 5 };
const MOCK_USER = { email: 'admin@lake.group', name: 'Admin' };
const MOCK_PW = 'secret123';

const recorded = { logins: [], creates: [], updates: [], deletes: [], authHeaders: [] };

function json(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => {
      try { resolve(JSON.parse(data)); } catch (e) { resolve({}); }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  const method = req.method || 'GET';

  if (urlPath === '/api/users/login' && method === 'POST') {
    const body = await readBody(req);
    recorded.logins.push(body);
    if (body.email === MOCK_USER.email && body.password === MOCK_PW) {
      return json(res, 200, { token: 'mock-jwt-token', user: MOCK_USER });
    }
    return json(res, 401, { errors: [{ message: 'The provided credentials are invalid.' }] });
  }

  if (urlPath.startsWith('/api/')) {
    const parts = urlPath.replace('/api/', '').split('/');
    const slug = parts[0];
    const id = parts[1];
    const auth = req.headers['authorization'] || '';
    if (auth) recorded.authHeaders.push(auth);

    if (method === 'GET' && !id) {
      const docs = DB[slug] || [];
      return json(res, 200, { docs, totalDocs: COUNTS[slug] || docs.length, page: 1, totalPages: 1 });
    }
    if (method === 'POST') {
      const body = await readBody(req);
      recorded.creates.push({ slug, body });
      return json(res, 200, { id: 999, ...body });
    }
    if (method === 'PATCH') {
      const body = await readBody(req);
      recorded.updates.push({ slug, id, body });
      return json(res, 200, { id: Number(id), ...body });
    }
    if (method === 'DELETE') {
      recorded.deletes.push({ slug, id });
      return json(res, 200, { id: Number(id) });
    }
    return json(res, 404, { errors: [{ message: 'Not found: ' + urlPath }] });
  }

  const rawPath = (req.url || '/').split('?')[0];
  const file = resolveStatic(ROOT, rawPath === '/' ? '/dashboard.html' : rawPath);
  if (!file) {
    res.writeHead(403);
    return res.end();
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end('not found');
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
});

let failures = 0;
function check(name, ok, detail) {
  if (ok) console.log(`  ✓ ${name}`);
  else { failures++; console.error(`  ✗ ${name} — ${detail || ''}`); }
}

(async () => {
  await new Promise((resolve) => server.listen(PORT, resolve));
  const browser = await chromium.launch();

  try {
    /* --- A) No API configured --- */
    console.log('A) No API configured');
    const pageA = await browser.newPage();
    const errsA = [];
    pageA.on('pageerror', (e) => errsA.push(String(e)));
    await pageA.goto(`http://localhost:${PORT}/dashboard.html`, { waitUntil: 'networkidle' });
    await pageA.waitForSelector('#login-panel', { timeout: 10000 });

    const noteVisible = await pageA.evaluate(() => {
      const n = document.getElementById('login-note');
      return n && !n.hidden && n.textContent.includes('CMS not configured');
    });
    check('login note shown when unconfigured', noteVisible, JSON.stringify(noteVisible));

    await pageA.fill('#login-email', 'admin@lake.group');
    await pageA.fill('#login-pw', 'secret123');
    await pageA.click('#login-btn');
    await pageA.waitForTimeout(200);
    const errText = await pageA.evaluate(() => document.getElementById('login-error').textContent);
    check('login blocked with config error', errText.includes('CMS endpoint not configured'), errText);
    check('no page errors (A)', errsA.length === 0, errsA.join(' | '));
    await pageA.close();

    /* --- B) API configured — login + console --- */
    console.log('B) Real login + console');
    const pageB = await browser.newPage();
    const errsB = [];
    pageB.on('pageerror', (e) => errsB.push(String(e)));
    await pageB.addInitScript((port) => {
      window.LAKE_CMS_API_URL = `http://localhost:${port}`;
    }, PORT);
    await pageB.goto(`http://localhost:${PORT}/dashboard.html`, { waitUntil: 'networkidle' });
    await pageB.waitForSelector('#login-panel', { timeout: 10000 });

    await pageB.fill('#login-email', 'admin@lake.group');
    await pageB.fill('#login-pw', 'wrong-password');
    await pageB.click('#login-btn');
    await pageB.waitForSelector('#login-error:not([hidden])', { timeout: 5000 });
    const badCreds = await pageB.evaluate(() => document.getElementById('login-error').textContent);
    check('bad credentials rejected', badCreds.includes('credentials are invalid'), badCreds);

    await pageB.fill('#login-pw', MOCK_PW);
    await pageB.click('#login-btn');
    await pageB.waitForSelector('#dashboard-panel[style*="block"]', { timeout: 8000 });
    await pageB.waitForSelector('.cms-nav-btn', { timeout: 8000 });
    await pageB.waitForSelector('#cms-kpis .kpi-no', { timeout: 8000 });

    const consoleState = await pageB.evaluate(() => ({
      name: document.getElementById('dash-name').textContent.trim(),
      kpis: Array.from(document.querySelectorAll('#cms-kpis .kpi-no')).map((e) => e.textContent.trim()),
      navCount: document.querySelectorAll('.cms-nav-btn').length,
      rows: document.querySelectorAll('#cms-table-wrap tbody tr').length,
      firstTitle: document.querySelector('.cms-row-title')?.textContent.trim() || '',
      loginHidden: document.getElementById('login-panel').style.display === 'none',
    }));
    check('login request was POSTed', recorded.logins.length >= 2, JSON.stringify(recorded.logins));
    check('dashboard visible after login', consoleState.loginHidden && consoleState.name === 'Admin', JSON.stringify(consoleState));
    check('KPI counts rendered', consoleState.kpis.length === 5 && consoleState.kpis[0] === '12', JSON.stringify(consoleState.kpis));
    check('collection nav rendered', consoleState.navCount === 5, `got ${consoleState.navCount}`);
    check('news rows rendered', consoleState.rows === 2 && consoleState.firstTitle.includes('Lake Gas'), JSON.stringify(consoleState));
    check('no page errors (B)', errsB.length === 0, errsB.join(' | '));
    await pageB.close();

    /* --- C) CRUD flows --- */
    console.log('C) CRUD via the REST API');
    const pageC = await browser.newPage();
    const errsC = [];
    pageC.on('pageerror', (e) => errsC.push(String(e)));
    await pageC.addInitScript((port) => {
      window.LAKE_CMS_API_URL = `http://localhost:${port}`;
    }, PORT);
    await pageC.goto(`http://localhost:${PORT}/dashboard.html`, { waitUntil: 'networkidle' });
    await pageC.waitForSelector('#login-panel', { timeout: 10000 });
    await pageC.fill('#login-email', MOCK_USER.email);
    await pageC.fill('#login-pw', MOCK_PW);
    await pageC.click('#login-btn');
    await pageC.waitForSelector('#cms-table-wrap tbody tr', { timeout: 8000 });

    // Create
    await pageC.click('#cms-new');
    await pageC.waitForSelector('#cms-editor:not([hidden])', { timeout: 5000 });
    await pageC.fill('input[name="title"]', 'Brand New Article');
    await pageC.fill('input[name="slug"]', 'brand-new-article');
    await pageC.selectOption('select[name="category"]', 'Events');
    await pageC.fill('input[name="date"]', '2026-03-01');
    await pageC.click('#cms-editor-form button[type="submit"]');
    await pageC.waitForTimeout(400);
    const created = recorded.creates[recorded.creates.length - 1];
    check('create POSTs to /api/news', created && created.slug === 'news' && created.body.title === 'Brand New Article', JSON.stringify(created));
    check('create carries title + slug', created && created.body.slug === 'brand-new-article' && created.body.category === 'Events', JSON.stringify(created && created.body));

    // Edit (first row, id 1)
    await pageC.waitForSelector('#cms-table-wrap tbody tr', { timeout: 8000 });
    await pageC.click('#cms-table-wrap tbody tr:first-child [data-act="edit"]');
    await pageC.waitForSelector('#cms-editor:not([hidden])', { timeout: 5000 });
    const prefill = await pageC.inputValue('input[name="title"]');
    await pageC.fill('input[name="title"]', 'Lake Gas Expands in Kenya (Updated)');
    await pageC.click('#cms-editor-form button[type="submit"]');
    await pageC.waitForTimeout(400);
    const updated = recorded.updates[recorded.updates.length - 1];
    check('edit opens prefilled', prefill.includes('Lake Gas'), prefill);
    check('edit PATCHes to /api/news/1', updated && updated.slug === 'news' && String(updated.id) === '1', JSON.stringify(updated));
    check('edit PATCH carries new title', updated && updated.body.title.includes('Updated'), JSON.stringify(updated && updated.body));

    // Delete
    pageC.once('dialog', (d) => d.accept());
    await pageC.click('#cms-table-wrap tbody tr:first-child [data-act="del"]');
    await pageC.waitForTimeout(400);
    const deleted = recorded.deletes[recorded.deletes.length - 1];
    check('delete DELETEs /api/news/1', deleted && deleted.slug === 'news' && String(deleted.id) === '1', JSON.stringify(deleted));

    // Authorization header present on authed calls
    const hasJwt = recorded.authHeaders.some((h) => h === 'JWT mock-jwt-token');
    check('JWT Authorization header sent', hasJwt, JSON.stringify(recorded.authHeaders.slice(0, 3)));
    check('no page errors (C)', errsC.length === 0, errsC.join(' | '));
    await pageC.close();

    /* --- D) Session restore --- */
    console.log('D) Session restore on reload');
    const pageD = await browser.newPage();
    const errsD = [];
    pageD.on('pageerror', (e) => errsD.push(String(e)));
    await pageD.addInitScript((port) => {
      window.LAKE_CMS_API_URL = `http://localhost:${port}`;
    }, PORT);
    await pageD.goto(`http://localhost:${PORT}/dashboard.html`, { waitUntil: 'networkidle' });
    await pageD.waitForSelector('#login-panel', { timeout: 10000 });
    await pageD.fill('#login-email', MOCK_USER.email);
    await pageD.fill('#login-pw', MOCK_PW);
    await pageD.click('#login-btn');
    await pageD.waitForSelector('#dashboard-panel[style*="block"]', { timeout: 8000 });
    await pageD.reload({ waitUntil: 'networkidle' });
    await pageD.waitForSelector('#dashboard-panel[style*="block"]', { timeout: 8000 });
    const restored = await pageD.evaluate(() => ({
      name: document.getElementById('dash-name').textContent.trim(),
      loginHidden: document.getElementById('login-panel').style.display === 'none',
    }));
    check('session restored after reload', restored.loginHidden && restored.name === 'Admin', JSON.stringify(restored));
    check('no page errors (D)', errsD.length === 0, errsD.join(' | '));
    await pageD.close();
  } finally {
    await browser.close();
    server.close();
  }

  if (failures) {
    console.error(`\n${failures} check(s) FAILED`);
    process.exit(1);
  }
  console.log('\nAll dashboard CMS wiring checks PASSED');
  process.exit(0);
})().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
