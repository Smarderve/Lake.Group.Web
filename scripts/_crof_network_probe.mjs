/* One-off QA probe (client-handover crof.ai investigation).
 * Spawns its own local web server, loads production pages in a clean headless
 * browser session, and records every network request host + failures + errors.
 * Run: node scripts/_crof_network_probe.mjs
 */
import { createRequire } from 'module';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(new URL('../package.json', import.meta.url));
const { chromium } = require('playwright');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PORT = 8793;
const BASE = `http://127.0.0.1:${PORT}/`;

const PAGES = [
  'index.html', 'about.html', 'history.html', 'careers.html', 'contact.html',
  'gallery.html', 'lake-oil.html', 'aficd.html', 'station-locator.html',
  'leadership.html', 'our-story.html', 'csr.html', 'sustainability.html',
];

const hosts = new Map();
const perPageHosts = {};
const failures = [];
const consoleErrors = [];

function recordHost(u, page) {
  try {
    const h = new URL(u).host;
    hosts.set(h, (hosts.get(h) || 0) + 1);
    perPageHosts[page] = perPageHosts[page] || new Map();
    const m = perPageHosts[page];
    m.set(h, (m.get(h) || 0) + 1);
  } catch { /* non-http scheme */ }
}

// --- spawn threaded server -------------------------------------------------
const server = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], {
  cwd: ROOT,
  stdio: 'ignore',
});
await new Promise((res) => setTimeout(res, 2500));

const browser = await chromium.launch({ headless: true });
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  page.on('request', (r) => recordHost(r.url(), 'shared'));
  page.on('requestfailed', (r) => {
    failures.push(`${r.url()} :: ${r.failure()?.errorText || 'failed'}`);
    recordHost(r.url(), 'shared');
  });
  page.on('response', (r) => { if (r.status() >= 400) failures.push(`${r.url()} :: HTTP ${r.status()}`); });
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 240)); });

  for (const p of PAGES) {
    const t0 = Date.now();
    try {
      await page.goto(BASE + p, { waitUntil: 'commit', timeout: 30000 });
      await page.waitForLoadState('domcontentloaded', { timeout: 20000 }).catch(() => {});
      await page.evaluate(async () => {
        const step = Math.floor(window.innerHeight * 0.8);
        for (let y = 0; y <= document.body.scrollHeight; y += step) {
          window.scrollTo(0, y);
          await new Promise((res) => setTimeout(res, 70));
        }
        window.scrollTo(0, 0);
      }).catch(() => {});
      await page.waitForTimeout(2500);
      console.log(`ok   ${p} (${Date.now() - t0}ms, ${perPageHosts[p === PAGES[0] ? 'shared' : 'shared'] ? '' : ''}${(perPageHosts.shared?.size) || 0} hosts so far)`);
    } catch (e) {
      failures.push(`${p} :: NAVIGATION ${e.message.slice(0, 120)}`);
      console.log(`FAIL ${p} (${Date.now() - t0}ms) ${e.message.slice(0, 90)}`);
    }
  }
} finally {
  await browser.close();
  server.kill();
}

console.log('\n=== ALL HOSTS CONTACTED (cumulative) ===');
for (const [h, c] of [...hosts.entries()].sort()) console.log(`${String(c).padStart(5)}  ${h}`);

const local = new Set([`127.0.0.1:${PORT}`, `localhost:${PORT}`]);
console.log('\n=== NON-LOCAL (EXTERNAL) HOSTS ===');
const ext = [...hosts.keys()].filter((h) => !local.has(h));
if (!ext.length) console.log('(none)');
for (const h of ext.sort()) console.log(`${String(hosts.get(h)).padStart(5)}  ${h}`);

console.log('\n=== CROF CHECK ===');
const crof = [...hosts.keys()].filter((h) => /crof/i.test(h));
console.log(crof.length ? `CROF HOST CONTACTED: ${crof.join(', ')}` : 'No host matching /crof/i was contacted.');

console.log(`\n=== FAILURES (${failures.length}) ===`);
for (const f of failures.slice(0, 50)) console.log(f);
console.log(`\n=== CONSOLE ERRORS (${consoleErrors.length}, deduped top 25) ===`);
for (const e of [...new Set(consoleErrors)].slice(0, 25)) console.log(e);
