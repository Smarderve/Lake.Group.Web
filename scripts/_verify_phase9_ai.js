/**
 * Phase 9 · AI / Corporate Knowledge verification.
 *
 * Serves the repo root over HTTP with a stub of the two Phase 9 endpoints
 * (/api/public/knowledge/facts and /api/public/assistant/unanswered, built
 * from the REAL seed data), then drives the assistant widget in headless
 * Chrome and asserts:
 *   A) approved-fact answers carry a citation line + source link
 *   B) unanswered questions are POSTed to the content-gap tracker
 *   C) with no backend, the assistant still answers from the build-time KB
 *      and the page never breaks (silent fallback)
 *
 * Usage:  node scripts/_verify_phase9_ai.js
 * Exit 0 on success, 1 on failure.
 */
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { resolveStatic } = require('./_safe_static.js');

const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ROOT = path.join(__dirname, '..');
const PORT = 8797;

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
const receivedQuestions = [];

function startServer() {
  return new Promise((resolve) => {
    server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
      const apiRes = (status, body) => {
        res.writeHead(status, { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' });
        res.end(JSON.stringify(body));
      };
      if (url.pathname.startsWith('/api/public/')) {
        if (url.pathname === '/api/public/knowledge/facts') {
          // Facts built from the REAL Phase 8/9 seed data.
          return apiRes(200, {
            facts: [
              { id: 'metric:employees', type: 'metric', text: 'Employees: 30,000+ (employees)', source: 'Lake Group HR fact sheet', verification: 'VERIFIED', url: '/about.html', title: 'About Lake Group' },
              { id: 'countries', type: 'countries', text: 'Lake Group operates across 10 countries: Kenya, South Africa, Tanzania and more.', source: 'Lake Group official website (operations map)', verification: 'VERIFIED', url: '/africa-network.html', title: 'Operations Map' },
              { id: 'company:lake-oil', type: 'company', text: 'Lake Oil — Top 5 petroleum distributor in Tanzania.', source: 'Lake Group official website (company registry)', verification: 'VERIFIED', url: '/lake-oil.html', title: 'Lake Oil' },
            ],
            generatedAt: new Date().toISOString(),
          });
        }
        if (url.pathname === '/api/public/assistant/unanswered' && req.method === 'POST') {
          let body = '';
          req.on('data', (c) => { body += c; });
          req.on('end', () => {
            try { receivedQuestions.push(JSON.parse(body)); } catch (e) { receivedQuestions.push({ raw: body }); }
            apiRes(201, { ok: true });
          });
          return;
        }
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

/** Ask the assistant a question and return the last bot message's shape. */
async function ask(page, question) {
  await page.evaluate(() => {
    const launcher = document.querySelector('.la-launcher');
    if (launcher && document.querySelector('.la-panel').hidden) launcher.click();
  });
  await page.waitForSelector('.la-input', { state: 'visible' });
  await page.fill('.la-input', question);
  await page.press('.la-input', 'Enter');
  await page.waitForTimeout(700); // typing delay (260ms) + render
  return page.evaluate(() => {
    const msgs = document.querySelectorAll('.la-msg.la-bot');
    const last = msgs[msgs.length - 1];
    if (!last) return null;
    return {
      text: last.querySelector('p') ? last.querySelector('p').textContent.trim() : null,
      cite: last.querySelector('.la-cite') ? last.querySelector('.la-cite').textContent.trim() : null,
      link: last.querySelector('.la-link') ? last.querySelector('.la-link').getAttribute('href') : null,
    };
  });
}

async function main() {
  await startServer();
  const browser = await chromium.launch({ headless: true, executablePath: CHROME, args: ['--no-sandbox'] });

  let fail = 0;
  const errors = [];
  try {
    /* ---- Context 1: backend configured ---- */
    const context = await browser.newContext({ serviceWorkers: 'block' });
    await context.addInitScript(() => {
      window.LAKE_API_BASE = 'http://127.0.0.1:8797';
    });
    const page = await context.newPage();
    page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(900); // let the facts fetch land

    let r = await ask(page, 'how many employees does lake group have');
    const empOk = r && r.text && r.text.includes('30,000+') && r.cite && r.cite.includes('Source:') && r.link === '/about.html';
    console.log(`${empOk ? 'PASS' : 'FAIL'} fact answer w/ citation (text="${(r && r.text || '').slice(0, 60)}", cite="${(r && r.cite || '').slice(0, 50)}", link="${r && r.link}")`);
    if (!empOk) fail = 1;

    r = await ask(page, 'which countries do you operate in');
    const ctryOk = r && r.text && r.text.includes('Tanzania') && r.link === '/africa-network.html';
    console.log(`${ctryOk ? 'PASS' : 'FAIL'} countries fact (text="${(r && r.text || '').slice(0, 60)}", link="${r && r.link}")`);
    if (!ctryOk) fail = 1;

    /* Off-domain question → the relevance gate must say "no approved answer"
       (not improvise a companies list) AND log it to the content-gap tracker. */
    const nr = await ask(page, 'what is lake group revenue');
    await page.waitForTimeout(400);
    const logged = receivedQuestions.filter((q) => q.question && q.question.includes('revenue'));
    const noInventOk = !!nr && !!nr.text && nr.text.includes('find that');
    const logOk = logged.length === 1 && logged[0].language === 'en' && logged[0].page === '/index.html';
    console.log(`${noInventOk ? 'PASS' : 'FAIL'} off-domain question → no invented answer (reply="${(nr && nr.text || '').slice(0, 50)}")`);
    if (!noInventOk) fail = 1;
    console.log(`${logOk ? 'PASS' : 'FAIL'} unanswered question tracked (${JSON.stringify(logged[0] || null)})`);
    if (!logOk) fail = 1;

    await context.close();

    /* ---- Context 2: no backend (LAKE_API_BASE unset) ---- */
    const ctx2 = await browser.newContext({ serviceWorkers: 'block' });
    const page2 = await ctx2.newPage();
    page2.on('pageerror', (err) => errors.push('pageerror(ctx2): ' + err.message));
    await page2.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page2.waitForTimeout(700);
    r = await ask(page2, 'how many employees does lake group have');
    // Offline: answers from the build-time KB — must exist, never crash.
    const offlineOk = !!r && !!r.text && r.text.length > 0 && !r.cite;
    console.log(`${offlineOk ? 'PASS' : 'FAIL'} no-backend fallback answers from KB (text="${(r && r.text || '').slice(0, 70)}")`);
    if (!offlineOk) fail = 1;

    await ctx2.close();
  } catch (e) {
    console.log('FATAL:', e.message);
    fail = 1;
  } finally {
    if (errors.length) {
      console.log('Page errors observed:');
      errors.slice(0, 6).forEach((e) => console.log('  ' + e));
    }
    await browser.close();
    await stopServer();
  }
  console.log(fail ? 'RESULT: FAIL' : 'RESULT: PASS');
  process.exit(fail);
}

main();
