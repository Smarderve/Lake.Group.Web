#!/usr/bin/env node
/**
 * Mobile Horizontal Overflow Audit
 *
 * Launches headless Chromium at a 375px mobile viewport and checks that no page
 * causes horizontal scroll overflow (scrollWidth > viewport).
 *
 * Exits with code 1 if any page overflows.
 *
 * Usage:
 *   node scripts/_audit_overflow.js
 *   node scripts/_audit_overflow.js --pages index.html,about.html
 *   node scripts/_audit_overflow.js --viewport 375
 *
 * Requires: playwright (npm install --save-dev playwright && npx playwright install chromium)
 */

'use strict';

const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

/* ── CLI args ─────────────────────────────────────────────────────────── */
const args = process.argv.slice(2);
function flag(name, fallback) {
  const idx = args.indexOf('--' + name);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
}

const VIEWPORT_W = parseInt(flag('viewport', '375'), 10);
const VIEWPORT_H = parseInt(flag('height', '812'), 10);
const ROOT = path.join(__dirname, '..');

/* Key pages to audit for overflow */
const DEFAULT_PAGES = [
  'index.html', 'about.html', 'news.html', 'services.html',
  'contact.html', 'leadership.html', 'lake-oil.html', 'gallery.html',
];
const pageArg = flag('pages', '');
const PAGES = pageArg
  ? pageArg.split(',').map((s) => s.trim()).filter(Boolean)
  : DEFAULT_PAGES.filter((p) => fs.existsSync(path.join(ROOT, p)));

/* MIME types for the local server */
const MIME_TYPES = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff': 'font/woff',
  '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.webp': 'image/webp',
};

/* ── Lightweight HTTP server ──────────────────────────────────────────── */
function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const urlPath = req.url.split('?')[0];
      const filePath = path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath);
      try {
        const data = fs.readFileSync(filePath);
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
        res.end(data);
      } catch {
        res.writeHead(404);
        res.end('Not found');
      }
    });
    server.on('error', (e) => reject(new Error('Failed to start HTTP server: ' + e.message)));
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

/* ── Main ─────────────────────────────────────────────────────────────── */
(async () => {
  let server = null;
  let browser = null;

  try {
    server = await startServer();
    const PORT = server.address().port;
    const BASE_URL = 'http://127.0.0.1:' + PORT;

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: VIEWPORT_W, height: VIEWPORT_H },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });

    const results = [];
    let failed = false;

    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║     Mobile Horizontal Overflow Audit                    ║');
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log('║ Viewport: ' + VIEWPORT_W + 'px'.padEnd(46) + '║');
    console.log('║ Pages: ' + String(PAGES.length).padEnd(50) + '║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    for (const page of PAGES) {
      const tab = await context.newPage();
      try {
        await tab.goto(BASE_URL + '/' + page, { waitUntil: 'load', timeout: 20000 });
        /* Dismiss skeleton overlay */
        await tab.evaluate(() => {
          const skel = document.getElementById('lg-skel');
          if (skel) skel.remove();
          document.documentElement.classList.remove('lg-loading');
          document.documentElement.classList.add('lg-skel-done');
        });
        await tab.waitForTimeout(500);

        /* Scroll through to trigger lazy loading, then measure */
        await tab.evaluate(async () => {
          const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
          for (let y = 0; y <= document.body.scrollHeight; y += 800) {
            window.scrollTo(0, y);
            await sleep(50);
          }
          window.scrollTo(0, 0);
          await sleep(200);
        });

        const overflow = await tab.evaluate(() => {
          const sw = document.documentElement.scrollWidth;
          const vw = window.innerWidth;
          return { sw, vw, overflow: sw > vw + 2 };
        });

        const status = overflow.overflow ? '❌' : '✅';
        const detail = overflow.overflow
          ? `scrollWidth=${overflow.sw} > viewport=${overflow.vw}`
          : `scrollWidth=${overflow.sw} <= viewport=${overflow.vw}`;
        console.log(`  ${status} ${page}: ${detail}`);

        if (overflow.overflow) {
          failed = true;
          results.push({ page, sw: overflow.sw, vw: overflow.vw });
        }
      } catch (err) {
        console.log(`  ⚠️  ${page}: ERROR — ${err.message}`);
      } finally {
        await tab.close();
      }
    }

    console.log('\n── Summary ──────────────────────────────────────────────────');
    if (failed) {
      console.log(`  ❌ ${results.length} page(s) with horizontal overflow\n`);
      process.exitCode = 1;
    } else {
      console.log('  ✅ All pages pass — no horizontal overflow\n');
      process.exitCode = 0;
    }
  } finally {
    if (browser) { try { await browser.close(); } catch { /* ignore */ } }
    if (server && server.listening) { try { await new Promise((r) => server.close(r)); } catch { /* ignore */ } }
  }
})();
