/* One-off QA probe (client-handover crof.ai investigation).
 * Loads production pages from the local server in a clean headless session,
 * records every network request host + failures + console errors.
 * Run: node scripts/_crof_network_probe.mjs   (server must be on :8791)
 */
import { createRequire } from 'module';
const require = createRequire(new URL('../package.json', import.meta.url));
const { chromium } = require('playwright');

const BASE = 'http://127.0.0.1:8791/';
const PAGES = [
  'index.html', 'about.html', 'history.html', 'careers.html', 'contact.html',
  'gallery.html', 'lake-oil.html', 'aficd.html', 'station-locator.html',
  'leadership.html', 'our-story.html', 'csr.html', 'sustainability.html',
];

const hosts = new Map(); // host -> count
const failures = [];
const consoleErrors = [];

function recordHost(u) {
  try {
    const h = new URL(u).host;
    hosts.set(h, (hosts.get(h) || 0) + 1);
  } catch { /* non-http scheme */ }
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

page.on('request', (r) => recordHost(r.url()));
page.on('requestfailed', (r) => {
  failures.push(`${r.url()} :: ${r.failure()?.errorText || 'failed'}`);
  recordHost(r.url());
});
page.on('response', (r) => { if (r.status() >= 400) failures.push(`${r.url()} :: HTTP ${r.status()}`); });
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300)); });

for (const p of PAGES) {
  const t0 = Date.now();
  try {
    await page.goto(BASE + p, { waitUntil: 'domcontentloaded', timeout: 20000 });
    // Scroll to bottom so lazy sections (globe, images, maps) activate.
    await page.evaluate(async () => {
      const step = Math.floor(window.innerHeight * 0.8);
      for (let y = 0; y <= document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((res) => setTimeout(res, 80));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(2500); // globe boot, fetches, beacon
    console.log(`ok   ${p} (${Date.now() - t0}ms)`);
  } catch (e) {
    failures.push(`${p} :: NAVIGATION ${e.message.slice(0, 120)}`);
    console.log(`FAIL ${p} (${Date.now() - t0}ms) ${e.message.slice(0, 80)}`);
  }
}

await browser.close();

console.log('=== EXTERNAL + LOCAL HOSTS CONTACTED ===');
for (const [h, c] of [...hosts.entries()].sort()) console.log(`${String(c).padStart(5)}  ${h}`);

const local = new Set(['127.0.0.1:8791', 'localhost:8791']);
console.log('\n=== NON-LOCAL HOSTS ===');
for (const [h, c] of [...hosts.entries()].sort()) if (!local.has(h)) console.log(`${String(c).padStart(5)}  ${h}`);

console.log('\n=== CROF CHECK ===');
const crof = [...hosts.keys()].filter((h) => /crof/i.test(h));
console.log(crof.length ? `CROF HOST CONTACTED: ${crof.join(', ')}` : 'No host matching /crof/i was contacted.');

console.log(`\n=== FAILURES (${failures.length}) ===`);
for (const f of failures.slice(0, 40)) console.log(f);
console.log(`\n=== CONSOLE ERRORS (${consoleErrors.length}) ===`);
for (const e of [...new Set(consoleErrors)].slice(0, 30)) console.log(e);
