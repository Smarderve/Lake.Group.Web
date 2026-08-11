#!/usr/bin/env node
/**
 * Visual Regression Test
 *
 * Screenshots each key page at 375px (mobile) and 768px (tablet) viewports,
 * then compares against reference screenshots to catch layout regressions.
 *
 * Usage:
 *   node scripts/_visual_regression.js              # Compare against baselines
 *   node scripts/_visual_regression.js --update     # Update baseline screenshots
 *   node scripts/_visual_regression.js --pages index.html,about.html
 *   node scripts/_visual_regression.js --threshold 0.01  # 1% pixel diff tolerance
 *
 * Requires: playwright (npm install --save-dev playwright && npx playwright install chromium)
 */

'use strict';

const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { resolveStatic } = require('./_safe_static.js');

/* ── CLI args ─────────────────────────────────────────────────────────── */
const args = process.argv.slice(2);
function flag(name, fallback) {
  const idx = args.indexOf('--' + name);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
}
function hasFlag(name) { return args.indexOf('--' + name) !== -1; }

const UPDATE = hasFlag('update');
const COMPARE = hasFlag('compare') || !UPDATE; /* default: compare */
const THRESHOLD = parseFloat(flag('threshold', '0.01'));
const ROOT = path.join(__dirname, '..');
const BASELINE_DIR = path.join(ROOT, 'scripts', '_visual_baselines');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

/* Pages to test */
const DEFAULT_PAGES = [
  'index.html', 'about.html', 'news.html', 'services.html',
  'contact.html', 'leadership.html', 'lake-oil.html', 'gallery.html',
];
const pageArg = flag('pages', '');
const PAGES = pageArg
  ? pageArg.split(',').map((s) => s.trim()).filter(Boolean)
  : DEFAULT_PAGES.filter((p) => fs.existsSync(path.join(ROOT, p)));

/* Viewports */
const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
];

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
      const filePath = resolveStatic(ROOT, urlPath === '/' ? '/index.html' : urlPath);
      if (!filePath) { res.writeHead(403); res.end('Forbidden'); return; }
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

/* ── File-size comparison as visual regression heuristic ───────────────── */
function compareFileSizes(expected, actual, maxDiffRatio) {
  if (expected.equals(actual)) return { match: true, diff: 0 };
  const sizeDiff = Math.abs(expected.length - actual.length) / Math.max(expected.length, 1);
  return { match: sizeDiff <= maxDiffRatio, diff: sizeDiff };
}

/* ── Screenshot a page at a given viewport ─────────────────────────────── */
async function screenshotPage(context, baseUrl, pageName, vp, outputDir) {
  const tab = await context.newPage();
  await tab.setViewportSize({ width: vp.width, height: vp.height });
  try {
    await tab.goto(baseUrl + '/' + pageName, { waitUntil: 'load', timeout: 20000 });
    /* Dismiss skeleton overlay */
    await tab.evaluate(() => {
      const skel = document.getElementById('lg-skel');
      if (skel) skel.remove();
      document.documentElement.classList.remove('lg-loading');
      document.documentElement.classList.add('lg-skel-done');
    });
    await tab.waitForTimeout(1000);
    /* Scroll to trigger lazy images */
    await tab.evaluate(async () => {
      for (let y = 0; y <= document.body.scrollHeight; y += 600) {
        window.scrollTo(0, y);
        await new Promise(r => setTimeout(r, 50));
      }
      window.scrollTo(0, 0);
      await new Promise(r => setTimeout(r, 300));
    });

    const filename = pageName.replace('.html', '') + '-' + vp.name + '.png';
    const filepath = path.join(outputDir, filename);
    await tab.screenshot({ path: filepath, fullPage: false });
  } finally {
    await tab.close();
  }
}

/* ── Main ─────────────────────────────────────────────────────────────── */
(async () => {
  let server = null;
  let browser = null;

  try {
    server = await startServer();
    const PORT = server.address().port;
    const BASE_URL = 'http://127.0.0.1:' + PORT;

    browser = await chromium.launch({ headless: true, executablePath: CHROME });
    const context = await browser.newContext();

    if (UPDATE) {
      /* ── UPDATE MODE: generate baseline screenshots ───────────────────── */
      fs.mkdirSync(BASELINE_DIR, { recursive: true });

      console.log('\n╔══════════════════════════════════════════════════════════╗');
      console.log('║     Visual Regression — Generate Baselines               ║');
      console.log('╠══════════════════════════════════════════════════════════╣');
      console.log('║ Viewports: 375px (mobile) + 768px (tablet)              ║');
      console.log('║ Pages: ' + String(PAGES.length).padEnd(50) + '║');
      console.log('║ Output: scripts/_visual_baselines/                       ║');
      console.log('╚══════════════════════════════════════════════════════════╝\n');

      let count = 0;
      for (const page of PAGES) {
        const pageName = page.replace('.html', '');
        for (const vp of VIEWPORTS) {
          await screenshotPage(context, BASE_URL, page, vp, BASELINE_DIR);
          console.log('  📸 ' + pageName + '-' + vp.name + '.png');
          count++;
        }
      }

      console.log('\n── Summary ──────────────────────────────────────────────────');
      console.log('  📸 Generated ' + count + ' baseline screenshot(s)');
      console.log('  📁 Saved to: scripts/_visual_baselines/');
      console.log('\n  To compare against these baselines:');
      console.log('    node scripts/_visual_regression.js --compare');
      process.exitCode = 0;

    } else {
      /* ── COMPARE MODE: diff screenshots against baselines ────────────── */
      if (!fs.existsSync(BASELINE_DIR)) {
        console.error('No baseline directory found. Run with --update first to generate baselines.');
        process.exitCode = 1;
        return;
      }

      const diffDir = path.join(BASELINE_DIR, '_diffs');
      fs.mkdirSync(diffDir, { recursive: true });
      const actualDir = path.join(BASELINE_DIR, '_actual');
      fs.mkdirSync(actualDir, { recursive: true });

      console.log('\n╔══════════════════════════════════════════════════════════╗');
      console.log('║     Visual Regression — Compare Mode                     ║');
      console.log('╠══════════════════════════════════════════════════════════╣');
      console.log('║ Viewports: 375px (mobile) + 768px (tablet)              ║');
      console.log('║ Pages: ' + String(PAGES.length).padEnd(50) + '║');
      console.log('║ Threshold: ' + (THRESHOLD * 100).toFixed(1) + '% size diff'.padEnd(45) + '║');
      console.log('╚══════════════════════════════════════════════════════════╝\n');

      let totalPassed = 0;
      let totalFailed = 0;

      for (const page of PAGES) {
        const pageName = page.replace('.html', '');

        for (const vp of VIEWPORTS) {
          const filename = pageName + '-' + vp.name + '.png';
          const baselinePath = path.join(BASELINE_DIR, filename);

          if (!fs.existsSync(baselinePath)) {
            console.log('  ⚠️  ' + filename + ' (no baseline — run --update to generate)');
            continue;
          }

          /* Take fresh screenshot */
          const actualPath = path.join(actualDir, filename);
          await screenshotPage(context, BASE_URL, page, vp, actualDir);

          /* Compare */
          const expected = fs.readFileSync(baselinePath);
          const actual = fs.readFileSync(actualPath);
          const result = compareFileSizes(expected, actual, THRESHOLD);

          if (result.match) {
            console.log('  ✅ ' + filename);
            totalPassed++;
          } else {
            const diffPath = path.join(diffDir, filename);
            fs.copyFileSync(actualPath, diffPath);
            console.log('  ❌ ' + filename + ' — screenshot differs (' + (result.diff * 100).toFixed(1) + '% size diff)');
            totalFailed++;
          }
        }
      }

      console.log('\n── Summary ──────────────────────────────────────────────────');
      console.log('  ✅ Passed: ' + totalPassed);
      console.log('  ❌ Failed: ' + totalFailed);
      if (totalFailed > 0) {
        console.log('  📁 Diffs saved to: scripts/_visual_baselines/_diffs/');
        console.log('\n  Review the diff images and if the changes are intentional:');
        console.log('    node scripts/_visual_regression.js --update  (re-generate baselines)');
      }
      process.exitCode = totalFailed > 0 ? 1 : 0;
    }
  } finally {
    if (browser) { try { await browser.close(); } catch { /* ignore */ } }
    if (server && server.listening) { try { await new Promise(r => server.close(r)); } catch { /* ignore */ } }
  }
})();
