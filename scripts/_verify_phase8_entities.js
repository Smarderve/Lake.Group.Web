/**
 * Verification of the published static release while the backend is unavailable.
 *
 * Serves the repository release with no live API. The active site is static;
 * retired dynamic routes are intentionally not treated as delivery contracts.
 *
 * Usage:  node scripts/_verify_phase8_entities.js
 * Exit 0 on success, 1 on failure.
 */
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { resolveStatic } = require('./_safe_static.js');

const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ROOT = path.join(__dirname, '..');
const PORT = 8798;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.webp': 'image/webp',
};

let server;
let apiUp = true;
let apiRequests = 0;
function setApiUp(up) { apiUp = up; }

async function buildStub() {
  const { CONTENT_SEED } = await import(
    'file:///' + path.join(ROOT, 'backend', 'scripts', 'content-seed-data.js').replace(/\\/g, '/')
  );
  const st = CONTENT_SEED.facilities[0];
  return {
    facilities: [{ name: st.name, address: 'Dar es Salaam', meta: st.meta }],
  };
}

function startServer(stub) {
  return new Promise((resolve) => {
    server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
      const apiRes = (status, body) => {
        res.writeHead(status, { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' });
        res.end(JSON.stringify(body));
      };
      if (url.pathname.startsWith('/api/public/')) {
        if (req.method === 'GET') apiRequests += 1;
        if (!apiUp) return apiRes(503, { error: { code: 'SERVICE_UNAVAILABLE' } });
        if (url.pathname === '/api/public/map') return apiRes(200, stub.map);
        const entity = url.pathname.slice('/api/public/'.length);
        if (stub[entity] !== undefined) return apiRes(200, { [entity]: stub[entity] });
        return apiRes(404, { error: { code: 'NOT_FOUND' } });
      }
      const filePath = resolveStatic(ROOT, url.pathname === '/' ? '/index.html' : url.pathname);
      if (!filePath) { res.writeHead(403); res.end(); return; }
      fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404); res.end('not found'); return; }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
        res.end(data);
      });
    });
    server.listen(PORT, '127.0.0.1', () => resolve());
  });
}

function stopServer() {
  return new Promise((resolve) => server.close(resolve));
}

/* The active static delivery contract retains station locator hydration. */
const CASES = [
  ['station-locator.html', null, 'name', (s) => s.facilities[0].name],
];

async function main() {
  const stub = await buildStub();
  await startServer(stub);
  const launchOptions = { headless: true, args: ['--no-sandbox'] };
  if (fs.existsSync(CHROME)) launchOptions.executablePath = CHROME;
  const browser = await chromium.launch(launchOptions);
  const context = await browser.newContext({ serviceWorkers: 'block' });
  await context.addInitScript(() => {
    const mq = window.matchMedia.bind(window);
    window.matchMedia = (q) => {
      const m = mq(q);
      if (String(q).toLowerCase().includes('prefers-reduced-motion')) {
        return { matches: true, media: q, addEventListener: () => {}, removeEventListener: () => {} };
      }
      return m;
    };
  });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push('console.error: ' + msg.text()); });
  page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));
  page.on('response', (res) => { if (res.status() >= 400 && !res.url().includes('/api/public/')) errors.push('HTTP ' + res.status() + ' ' + res.url()); });

  let fail = 0;
  try {
    for (const [pageFile, rowKey, field, expectFn] of CASES) {
      await page.goto(`http://127.0.0.1:${PORT}/${pageFile}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(700);
      const actual = await page.evaluate(({ rowKey, field }) => {
        const row = rowKey
          ? document.querySelector('[data-entity-key="' + rowKey + '"]')
          : document.querySelector('[data-hydrate] [data-entity-key]');
        if (!row) return null;
        const el = field === 'caption' ? row.querySelector('.gallery-tile__text') : row.querySelector('[data-entity-field="' + field + '"]');
        return el ? el.textContent.trim() : null;
      }, { rowKey, field });
      const expected = expectFn(stub);
      const ok = actual === expected;
      console.log(`${ok ? 'PASS' : 'FAIL'} ${pageFile} [${field}] served="${actual}" expected="${expected}"`);
      if (!ok) fail = 1;
    }

    const deliveryIndependent = apiRequests === 0;
    console.log(`${deliveryIndependent ? 'PASS' : 'FAIL'} public content made ${apiRequests} live API requests`);
    if (!deliveryIndependent) fail = 1;
  } catch (e) {
    console.log('FATAL:', e.message);
    fail = 1;
  } finally {
    if (errors.length) {
      console.log('Console errors observed:');
      errors.slice(0, 8).forEach((e) => console.log('  ' + e));
    }
    await browser.close();
    await stopServer();
  }
  console.log(fail ? 'RESULT: FAIL' : 'RESULT: PASS');
  process.exit(fail);
}

main();
