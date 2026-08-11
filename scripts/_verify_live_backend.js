/**
 * LIVE end-to-end verification — Phases 8 + 9 against the REAL backend.
 *
 * Requires the real stack running: PostgreSQL + `PORT=4000 npm run start` in
 * backend/ (migrations + seeds applied). Serves the repo root statically on
 * port 8796 and drives headless Chrome against the live API at
 * http://127.0.0.1:4000 — no stubs, no fake DB.
 *
 *   A) metrics  — index.html stats hydrate from /api/public/metrics/:key
 *   B) entities — services/leadership hydrate from live /api/public/*
 *   C) news     — window.LAKE_NEWS populated from live /api/public/news
 *   D) map      — africa-network markers built from live /api/public/map
 *   E) AI       — assistant answers from live knowledge facts with citation
 *   F) gaps     — an unanswered question is recorded in the REAL database
 *
 * Usage:  node scripts/_verify_live_backend.js
 * Exit 0 on success, 1 on failure.
 */
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { resolveStatic } = require('./_safe_static.js');
const { execSync } = require('child_process');

const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ROOT = path.join(__dirname, '..');
const PORT = 8796;
const API = 'http://127.0.0.1:4000';
const BACKEND = path.join(ROOT, 'backend');

/** Live AnalyticsEvent counts straight from PostgreSQL (real DB check). */
function dbEventCounts() {
  const out = execSync('node scripts/_analytics-count.mjs', { cwd: BACKEND, encoding: 'utf8' });
  return JSON.parse(out.trim());
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.webp': 'image/webp',
};

let server;
function startServer() {
  return new Promise((resolve) => {
    server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
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
function stopServer() { return new Promise((resolve) => server.close(resolve)); }

async function liveGet(pathname) {
  try {
    const res = await fetch(API + pathname);
    return { status: res.status, json: await res.json().catch(() => null) };
  } catch (e) {
    return { status: 0, json: null };
  }
}

async function ask(page, question) {
  await page.evaluate(() => {
    const launcher = document.querySelector('.la-launcher');
    if (launcher && document.querySelector('.la-panel').hidden) launcher.click();
  });
  await page.waitForSelector('.la-input', { state: 'visible' });
  await page.fill('.la-input', question);
  await page.press('.la-input', 'Enter');
  await page.waitForTimeout(800);
  return page.evaluate(() => {
    const msgs = document.querySelectorAll('.la-msg.la-bot');
    const last = msgs[msgs.length - 1];
    if (!last) return null;
    return {
      text: last.querySelector('p') ? last.querySelector('p').textContent.trim() : null,
      cite: last.querySelector('.la-cite') ? last.querySelector('.la-cite').textContent.trim() : null,
    };
  });
}

async function main() {
  await startServer();
  const browser = await chromium.launch({ headless: true, executablePath: CHROME, args: ['--no-sandbox'] });
  let fail = 0;
  const errors = [];
  try {
    // Baseline: the live API is really there and really has data.
    const health = await liveGet('/health');
    const comps = await liveGet('/api/public/companies');
    const news = await liveGet('/api/public/news');
    const facts = await liveGet('/api/public/knowledge/facts');
    const map = await liveGet('/api/public/map');
    const companyCount = (comps.json && (comps.json.company || comps.json.companies || []).length) || 0;
    const newsCount = (news.json && news.json.news || []).length || 0;
    const factsCount = (facts.json && facts.json.facts || []).length || 0;
    const mapFacilities = ((map.json && map.json.countries) || []).flatMap((c) =>
      (c.regions || []).flatMap((r) => (r.locations || []).flatMap((l) => l.facilities || []))).length;

    console.log(`LIVE API: health=${health && health.json && health.json.db} companies=${companyCount} news=${newsCount} facts=${factsCount} map-facilities=${mapFacilities}`);
    const apiOk = health && health.json && health.json.db === 'up' && companyCount >= 18 && newsCount >= 41 && factsCount >= 100 && mapFacilities >= 29;
    console.log(`${apiOk ? 'PASS' : 'FAIL'} live API baseline (real PostgreSQL)`);
    if (!apiOk) fail = 1;

    const context = await browser.newContext({ serviceWorkers: 'block' });
    await context.addInitScript((api) => { window.LAKE_API_BASE = api; }, API);
    const page = await context.newPage();
    page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));

    /* A) Metrics on the homepage (data-metric-key hydration). */
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    const metricText = await page.evaluate(() => {
      const el = document.querySelector('[data-metric-key="employees"]');
      return el ? el.textContent.trim() : null;
    });
    const metricOk = metricText && metricText.includes('30,000');
    console.log(`${metricOk ? 'PASS' : 'FAIL'} index.html employees metric from live API ("${metricText}")`);
    if (!metricOk) fail = 1;

    /* B) Companies directory (services.html). */
    await page.goto(`http://127.0.0.1:${PORT}/services.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    const services = await page.evaluate(() => {
      const rows = document.querySelectorAll('[data-hydrate="companies"] [data-entity-key]');
      const row = document.querySelector('[data-entity-key="lake-oil"]');
      const d = row && row.querySelector('[data-entity-field="description"]');
      const n = row && row.querySelector('[data-entity-field="name"]');
      return { count: rows.length, name: n ? n.textContent.trim() : null, desc: d ? d.textContent.trim() : null };
    });
    const lakeOil = (comps.json.company || comps.json.companies || []).find((c) => c.slug === 'lake-oil');
    const svcOk = services.count === companyCount && services.name === 'Lake Oil' && services.desc === lakeOil.description;
    console.log(`${svcOk ? 'PASS' : 'FAIL'} services.html ${services.count}/${companyCount} companies hydrated (lake-oil desc matches live API)`);
    if (!svcOk) fail = 1;

    /* C) News retarget. */
    await page.goto(`http://127.0.0.1:${PORT}/news.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    const newsState = await page.evaluate(() => ({ count: (window.LAKE_NEWS || []).length }));
    const newsOk = newsState.count === newsCount;
    console.log(`${newsOk ? 'PASS' : 'FAIL'} news.html LAKE_NEWS=${newsState.count} from live /api/public/news`);
    if (!newsOk) fail = 1;

    /* D) Map retarget. */
    await page.goto(`http://127.0.0.1:${PORT}/africa-network.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    const mapState = await page.evaluate(() => ({ assets: (window.__LAKE_MAP_ASSETS__ || []).length }));
    const mapOk = mapState.assets === mapFacilities;
    console.log(`${mapOk ? 'PASS' : 'FAIL'} africa-network map assets=${mapState.assets} from live /api/public/map`);
    if (!mapOk) fail = 1;

    /* E) AI — approved-fact answer with citation from the LIVE facts. */
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    const r = await ask(page, 'how many employees does lake group have');
    const factOk = r && r.text && r.text.includes('30,000') && r.cite && r.cite.includes('Source:');
    console.log(`${factOk ? 'PASS' : 'FAIL'} assistant fact answer w/ citation (cite="${(r && r.cite || '').slice(0, 40)}")`);
    if (!factOk) fail = 1;

    /* F) No-invention guard — off-domain question must NOT be improvised. */
    const nr = await ask(page, 'what is lake group revenue');
    const honestOk = nr && nr.text && nr.text.includes('find that');
    console.log(`${honestOk ? 'PASS' : 'FAIL'} assistant refuses to invent (reply="${(nr && nr.text || '').slice(0, 45)}")`);
    if (!honestOk) fail = 1;

    /* G) Phase 10 — analytics events land in the REAL database. */
    const before = dbEventCounts();
    await page.goto(`http://127.0.0.1:${PORT}/services.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200); // PAGE_VIEW beacon
    await ask(page, 'how many trucks does lake group have'); // CHAT_QUESTION
    await ask(page, 'what is the share price'); // CHAT_NO_MATCH
    await page.waitForTimeout(600);
    const after = dbEventCounts();
    const pvGrew = (after.PAGE_VIEW || 0) > (before.PAGE_VIEW || 0);
    const chatGrew = (after.CHAT_QUESTION || 0) > (before.CHAT_QUESTION || 0);
    const nomatchGrew = (after.CHAT_NO_MATCH || 0) > (before.CHAT_NO_MATCH || 0);
    console.log(`LIVE analytics: page_views ${before.PAGE_VIEW || 0}→${after.PAGE_VIEW || 0}, chat ${before.CHAT_QUESTION || 0}→${after.CHAT_QUESTION || 0}, no_match ${before.CHAT_NO_MATCH || 0}→${after.CHAT_NO_MATCH || 0}`);
    const analyticsOk = pvGrew && chatGrew && nomatchGrew;
    console.log(`${analyticsOk ? 'PASS' : 'FAIL'} analytics events recorded in real PostgreSQL`);
    if (!analyticsOk) fail = 1;

    await context.close();
  } catch (e) {
    console.log('FATAL:', e.message);
    fail = 1;
  } finally {
    if (errors.length) { console.log('Page errors:'); errors.slice(0, 6).forEach((e) => console.log('  ' + e)); }
    await browser.close();
    await stopServer();
  }
  console.log(fail ? 'RESULT: FAIL' : 'RESULT: PASS');
  process.exit(fail);
}

main();
