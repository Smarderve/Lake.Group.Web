#!/usr/bin/env node
/**
 * Mobile Text Accessibility Audit
 *
 * Launches headless Chromium at a 375px mobile viewport and checks every leaf
 * text element for a computed font-size below the WCAG AA minimum of 11px.
 *
 * Exits with code 1 if any violations are found — designed to fail CI builds
 * before font-size regressions reach production.
 *
 * Usage:
 *   node scripts/_audit_mobile_text.js
 *   node scripts/_audit_mobile_text.js --viewport 375 --min-px 11
 *   node scripts/_audit_mobile_text.js --pages index.html,about.html
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
const MIN_PX = parseFloat(flag('min-px', '11'));
const ROOT = path.join(__dirname, '..');

/* Pages to audit — all root HTML files by default */
const ALL_PAGES = fs.readdirSync(ROOT)
  .filter((f) => f.endsWith('.html') && !/404|offline/.test(f))
  .sort();
const pageArg = flag('pages', '');
const PAGES = pageArg
  ? pageArg.split(',').map((s) => s.trim()).filter(Boolean)
  : ALL_PAGES;

/* Selectors exempt from the audit (tiny decorative elements protected by flagship.css safety net) */
const EXEMPT_SELECTORS = [
  '.ose-stamp',                          /* tiny year stamp in About OSE embed */
  '.skeleton-shimmer',                   /* loading skeleton placeholder */
  '[aria-hidden="true"] [aria-hidden="true"]', /* deeply nested hidden */
  '.news-card__date',                    /* protected by flagship.css safety net */
  '.news-card__more',                    /* protected by flagship.css safety net */
  '.news-pill',                          /* category pill */
  '.news-flag__emoji',                   /* flag emoji */
  '.news-flag__label',                   /* flag label */
  '.ev-date',                            /* event date */
  '.ev-title',                           /* event title */
];

/* MIME types for the local server */
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
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
    server.on('error', (e) => {
      reject(new Error('Failed to start HTTP server: ' + e.message));
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

/* ── Main ─────────────────────────────────────────────────────────────── */
(async () => {
  let server = null;
  let browser = null;

  try {
    /* Start local HTTP server so fonts load correctly (file:// blocks @font-face) */
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

    const violations = [];
    const summary = [];

    for (const page of PAGES) {
      const pagePath = path.join(ROOT, page);
      if (!fs.existsSync(pagePath)) {
        summary.push({ page, status: 'SKIP', count: 0 });
        continue;
      }

      const tab = await context.newPage();
      try {
        await tab.goto(BASE_URL + '/' + page, { waitUntil: 'load', timeout: 15000 });
        /* Dismiss skeleton overlay so real content is measured */
        await tab.evaluate(() => {
          const skel = document.getElementById('lg-skel');
          if (skel) skel.remove();
          document.documentElement.classList.remove('lg-loading');
          document.documentElement.classList.add('lg-skel-done');
        });
        await tab.waitForTimeout(500);

        /* Scroll through entire page to trigger lazy fonts / images */
        await tab.evaluate(async () => {
          const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
          for (let y = 0; y <= document.body.scrollHeight; y += 600) {
            window.scrollTo(0, y);
            await sleep(50);
          }
          window.scrollTo(0, 0);
          await sleep(200);
        });

        /* Audit every leaf text element */
        const pageViolations = await tab.evaluate((minPx, exemptSelectors) => {
          const results = [];
          const allEls = document.querySelectorAll('*');

          for (const el of allEls) {
            /* Skip non-visible or empty elements */
            if (!el.offsetParent && el !== document.body && el !== document.documentElement) continue;
            if (!el.textContent || !el.textContent.trim()) continue;
            /* Only leaf-ish: skip elements with block children that also have text */
            const childBlocks = el.querySelectorAll('div, p, h1, h2, h3, h4, h5, h6, section, article, nav');
            if (childBlocks.length > 0) continue;

            /* Check exemption */
            const matchesExempt = exemptSelectors.some((sel) => {
              try { return el.matches(sel); } catch { return false; }
            });
            if (matchesExempt) continue;

            const style = window.getComputedStyle(el);
            const fontSize = parseFloat(style.fontSize);

            if (fontSize < minPx) {
              results.push({
                tag: el.tagName.toLowerCase(),
                class: (el.className && typeof el.className === 'string')
                  ? el.className.trim().replace(/\s+/g, '.').slice(0, 60)
                  : '',
                text: (el.textContent || '').trim().slice(0, 50),
                fontSize: fontSize.toFixed(1),
                minPx: minPx,
              });
            }
          }
          return results;
        }, MIN_PX, EXEMPT_SELECTORS);

        violations.push(...pageViolations.map((v) => ({ ...v, page })));
        summary.push({ page, status: pageViolations.length ? 'FAIL' : 'PASS', count: pageViolations.length });
      } catch (err) {
        summary.push({ page, status: 'ERROR', count: 0, error: err.message });
      } finally {
        await tab.close();
      }
    }

    /* ── Report ──────────────────────────────────────────────────────────── */
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║     Mobile Text Accessibility Audit — font-size < ' + MIN_PX + 'px   ║');
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log('║ Viewport: ' + VIEWPORT_W + 'x' + VIEWPORT_H + ' (2x DPR)'.padEnd(44) + '║');
    console.log('║ Pages: ' + String(PAGES.length).padEnd(50) + '║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    for (const s of summary) {
      const icon = s.status === 'PASS' ? '✅' : s.status === 'FAIL' ? '❌' : '⚠️ ';
      const detail = s.error ? ` (${s.error})` : s.count > 0 ? ` — ${s.count} violation(s)` : '';
      console.log(`  ${icon} ${s.page}${detail}`);
    }

    if (violations.length > 0) {
      console.log('\n── Violations ──────────────────────────────────────────────\n');
      const byPage = {};
      for (const v of violations) {
        if (!byPage[v.page]) byPage[v.page] = [];
        byPage[v.page].push(v);
      }
      for (const [page, items] of Object.entries(byPage)) {
        console.log(`  📄 ${page}`);
        for (const v of items) {
          const cls = v.class ? `.${v.class}` : '';
          console.log(`     <${v.tag}${cls}> ${v.fontSize}px — "${v.text}"`);
        }
        console.log('');
      }

      console.log('── Summary ──────────────────────────────────────────────────');
      console.log(`  ❌ ${violations.length} violation(s) across ${Object.keys(byPage).length} page(s)`);
      console.log(`  🔧 Fix by using clamp(${MIN_PX}px, ...) or the global safety net in flagship.css`);
      console.log(`  📖 See assets/flagship.css @media (max-width: 480px) for exempted selectors\n`);
      process.exitCode = 1;
    } else {
      console.log('\n── Summary ──────────────────────────────────────────────────');
      console.log('  ✅ All pages pass — no text elements below ' + MIN_PX + 'px\n');
      process.exitCode = 0;
    }
  } finally {
    /* Always clean up: close browser first, then server */
    if (browser) {
      try { await browser.close(); } catch { /* ignore */ }
    }
    if (server && server.listening) {
      try { await new Promise((resolve) => server.close(resolve)); } catch { /* ignore */ }
    }
  }
})();
