/**
 * Phase 8 · Task 8.1 verification — metrics hydration on the public site.
 *
 * Serves the repo root over HTTP with a stub /api/public/metrics/:key that
 * mirrors the backend's PUBLISHED-only contract, then loads each wired page
 * in headless Chrome and asserts:
 *   A) with the API up  → data-metric-key elements hydrate to served values
 *   B) with the API down (server stopped) → static markup is untouched
 *     (graceful fallback — the blueprint's "preserve visual behavior" rule)
 *
 * Usage:  node scripts/_verify_phase8_metrics.js
 * Exit 0 on success, 1 on failure.
 */
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { resolveStatic } = require('./_safe_static.js');

const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ROOT = path.join(__dirname, '..');
const PORT = 8799;

const STUB = {
  employees: '30,000+',
  trucks: '1,600+',
  stations: '152',
  countries: '10',
  nationalities: '21',
  subsidiaries: '18+',
};

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
};

let server;
let apiUp = true;
function setApiUp(up) { apiUp = up; }
function startServer() {
  return new Promise((resolve) => {
    server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
      if (url.pathname.startsWith('/api/public/')) {
        if (!apiUp) {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: { code: 'SERVICE_UNAVAILABLE' } }));
          return;
        }
      }
      if (url.pathname.startsWith('/api/public/metrics/')) {
        const key = decodeURIComponent(url.pathname.split('/').pop());
        if (STUB[key]) {
          res.writeHead(200, { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ metric: { key, label: key, value: STUB[key] } }));
          return;
        }
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 'NOT_FOUND' } }));
        return;
      }
      if (url.pathname === '/api/public/map') {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 'NOT_FOUND' } }));
        return;
      }
      // static file
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

const CASES = [
  { page: 'index.html', key: 'employees', expect: '30,000+' },
  { page: 'index.html', key: 'countries', expect: '10' },
  { page: 'about.html', key: 'trucks', expect: '1,600+' },
  { page: 'about.html', key: 'countries', expect: '10' },
  { page: 'our-story.html', key: 'stations', expect: '152' },
  { page: 'our-story.html', key: 'countries', expect: '10' },
  { page: 'africa-network.html', key: 'trucks', expect: '1,600+' },
];

async function main() {
  await startServer();
  const browser = await chromium.launch({ headless: true, executablePath: CHROME, args: ['--no-sandbox'] });
  // Block the site's service worker: it precaches + runtime-caches API
  // responses and would mask the real API-down fallback behaviour.
  const context = await browser.newContext({ serviceWorkers: 'block' });
  // Point the loader at the stub AND disable counter animation (reduced
  // motion paints counters instantly, removing the 1.6 s count-up race).
  await context.addInitScript(() => {
    window.LAKE_METRICS_API = 'http://127.0.0.1:8799';
  });
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
  page.on('requestfailed', (req) => errors.push('requestfailed: ' + req.url() + ' ' + (req.failure() && req.failure().errorText)));
  page.on('response', (res) => { if (res.status() >= 400) errors.push('HTTP ' + res.status() + ': ' + res.url()); });
  page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));

  let fail = 0;
  try {
    for (const c of CASES) {
      const url = `http://127.0.0.1:${PORT}/${c.page}`;
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      // give the 4s-timeout loader a moment to resolve
      await page.waitForTimeout(600);
      const text = await page.evaluate((key) => {
        const el = document.querySelector('[data-metric-key="' + key + '"]');
        return el ? el.textContent.trim() : null;
      }, c.key);
      const ok = text === c.expect;
      console.log(`${ok ? 'PASS' : 'FAIL'} ${c.page} [${c.key}] served="${text}" expected="${c.expect}"`);
      if (!ok) fail = 1;
    }

    // Fallback test: take the API down (static files stay up), then reload a
    // page — every stat must keep its static markup (preserve visual
    // behavior) and the loader must not throw or leave counters broken.
    setApiUp(false);
    await page.goto(`http://127.0.0.1:${PORT}/about.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    const staticVals = await page.evaluate(() => {
      const get = (k) => {
        const el = document.querySelector('[data-metric-key="' + k + '"]');
        return el ? el.textContent.trim() : null;
      };
      return { employees: get('employees'), trucks: get('trucks'), countries: get('countries') };
    });
    const fallbackOk =
      staticVals.employees === '30,000+' &&
      staticVals.trucks === '1,600+' &&
      staticVals.countries === '8';
    console.log(`${fallbackOk ? 'PASS' : 'FAIL'} fallback: API down → static kept (${JSON.stringify(staticVals)})`);
    if (!fallbackOk) fail = 1;
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
