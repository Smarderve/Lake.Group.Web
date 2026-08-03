#!/usr/bin/env node
/**
 * Comprehensive Accessibility Audit
 *
 * Runs accessibility checks on all HTML pages, producing a single pass/fail
 * report with contrast ratios and font sizes.
 *
 * Checks performed:
 *   1. WCAG AA contrast ratio (4.5:1 for normal text, 3:1 for large text)
 *   2. Minimum font sizes (11px for body text)
 *   3. Missing alt text on images
 *   4. Missing ARIA labels on interactive elements
 *
 * Usage:
 *   node scripts/_accessibility_audit.js
 *   node scripts/_accessibility_audit.js --pages index.html,about.html
 *   node scripts/_accessibility_audit.js --viewport 375
 *   node scripts/_accessibility_audit.js --json  # Output JSON report
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
function hasFlag(name) { return args.indexOf('--' + name) !== -1; }

const VIEWPORT_W = parseInt(flag('viewport', '1280'), 10);
const VIEWPORT_H = parseInt(flag('height', '800'), 10);
const MIN_PX = parseFloat(flag('min-px', '11'));
const JSON_OUTPUT = hasFlag('json');
const ROOT = path.join(__dirname, '..');

/* WCAG AA contrast thresholds */
const NORMAL_TEXT_RATIO = 4.5;
const LARGE_TEXT_RATIO = 3.0; /* 18px+ or 14px+ bold */
const LARGE_TEXT_MIN_PX = 18;
const LARGE_TEXT_BOLD_MIN_PX = 14;

/* Pages to audit */
const ALL_PAGES = fs.readdirSync(ROOT)
  .filter((f) => f.endsWith('.html') && !/404|offline/.test(f))
  .sort();
const pageArg = flag('pages', '');
const PAGES = pageArg
  ? pageArg.split(',').map((s) => s.trim()).filter(Boolean)
  : ALL_PAGES;

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

/* ── Main audit function ──────────────────────────────────────────────── */
async function auditPage(tab, pageName, baseUrl) {
  const results = {
    page: pageName,
    contrast: [],
    fontSize: [],
    missingAlt: [],
    missingAria: [],
    status: 'PASS',
  };

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
    
    /* Scroll to trigger lazy content */
    await tab.evaluate(async () => {
      for (let y = 0; y <= document.body.scrollHeight; y += 600) {
        window.scrollTo(0, y);
        await new Promise(r => setTimeout(r, 50));
      }
      window.scrollTo(0, 0);
      await new Promise(r => setTimeout(r, 300));
    });

    /* Run all checks in browser context */
    const auditData = await tab.evaluate((minPx, normalRatio, largeRatio, largePx, largeBoldPx) => {
      const data = { contrast: [], fontSize: [], missingAlt: [], missingAria: [] };
      
      /* 1. Check text elements for font size and contrast */
      const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, a, li, td, th, label, button, div');
      
      for (const el of textElements) {
        /* Skip non-visible or empty elements */
        if (!el.offsetParent && el !== document.body && el !== document.documentElement) continue;
        if (!el.textContent || !el.textContent.trim()) continue;
        /* Skip elements with block children */
        const childBlocks = el.querySelectorAll('div, p, h1, h2, h3, h4, h5, h6, section, article');
        if (childBlocks.length > 0) continue;
        /* Skip hidden elements */
        if (el.getAttribute('aria-hidden') === 'true') continue;

        const style = window.getComputedStyle(el);
        const fontSize = parseFloat(style.fontSize);
        const fontWeight = parseInt(style.fontWeight, 10) || 400;
        const color = style.color;
        const bgColor = style.backgroundColor;
        const text = (el.textContent || '').trim().slice(0, 40);

        /* Font size check */
        if (fontSize < minPx) {
          data.fontSize.push({
            tag: el.tagName.toLowerCase(),
            class: el.className ? el.className.toString().trim().replace(/\s+/g, '.').slice(0, 50) : '',
            text: text,
            fontSize: fontSize.toFixed(1),
            minPx: minPx,
          });
        }

        /* Contrast check */
        if (color && bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
          /* Parse colors from computed style */
          const fgMatch = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
          const bgMatch = bgColor.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
          
          if (fgMatch && bgMatch) {
            const fg = { r: parseInt(fgMatch[1]), g: parseInt(fgMatch[2]), b: parseInt(fgMatch[3]) };
            const bg = { r: parseInt(bgMatch[1]), g: parseInt(bgMatch[2]), b: parseInt(bgMatch[3]) };
            
            /* Skip white-on-white or black-on-black (likely transparent backgrounds) */
            if (fg.r === bg.r && fg.g === bg.g && fg.b === bg.b) continue;
            
            const ratio = (Math.max(0.2126 * fg.r/255 + 0.7152 * fg.g/255 + 0.0722 * fg.b/255 + 0.05,
                                      0.2126 * bg.r/255 + 0.7152 * bg.g/255 + 0.0722 * bg.b/255 + 0.05) +
                          0.05) /
                         (Math.min(0.2126 * fg.r/255 + 0.7152 * fg.g/255 + 0.0722 * fg.b/255 + 0.05,
                                   0.2126 * bg.r/255 + 0.7152 * bg.g/255 + 0.0722 * bg.b/255 + 0.05) +
                          0.05);
            
            const isLarge = fontSize >= largePx || (fontSize >= largeBoldPx && fontWeight >= 700);
            const requiredRatio = isLarge ? largeRatio : normalRatio;
            
            if (ratio < requiredRatio) {
              data.contrast.push({
                tag: el.tagName.toLowerCase(),
                class: el.className ? el.className.toString().trim().replace(/\s+/g, '.').slice(0, 50) : '',
                text: text,
                ratio: ratio.toFixed(2),
                required: requiredRatio.toFixed(1),
                fg: `rgb(${fg.r},${fg.g},${fg.b})`,
                bg: `rgb(${bg.r},${bg.g},${bg.b})`,
                fontSize: fontSize.toFixed(1),
                isLarge: isLarge,
              });
            }
          }
        }
      }

      /* 2. Check images for missing alt text */
      const images = document.querySelectorAll('img');
      for (const img of images) {
        if (!img.hasAttribute('alt') || (img.alt === '' && !img.getAttribute('role'))) {
          const src = img.getAttribute('src') || '';
          const srcShort = src.split('/').pop() || src.slice(0, 40);
          data.missingAlt.push({
            src: srcShort,
            parent: img.parentElement ? img.parentElement.tagName.toLowerCase() : '',
          });
        }
      }

      /* 3. Check interactive elements for missing ARIA labels */
      const interactiveElements = document.querySelectorAll('button, a[href], input, select, textarea');
      for (const el of interactiveElements) {
        const hasLabel = el.getAttribute('aria-label') || 
                        el.getAttribute('aria-labelledby') || 
                        el.textContent.trim() ||
                        el.getAttribute('title') ||
                        (el.tagName === 'INPUT' && el.getAttribute('placeholder'));
        
        if (!hasLabel) {
          data.missingAria.push({
            tag: el.tagName.toLowerCase(),
            type: el.getAttribute('type') || '',
            class: el.className ? el.className.toString().trim().replace(/\s+/g, '.').slice(0, 50) : '',
          });
        }
      }

      return data;
    }, MIN_PX, NORMAL_TEXT_RATIO, LARGE_TEXT_RATIO, LARGE_TEXT_MIN_PX, LARGE_TEXT_BOLD_MIN_PX);

    results.contrast = auditData.contrast;
    results.fontSize = auditData.fontSize;
    results.missingAlt = auditData.missingAlt;
    results.missingAria = auditData.missingAria;
    
    const hasIssues = results.contrast.length > 0 || 
                     results.fontSize.length > 0 || 
                     results.missingAlt.length > 0 ||
                     results.missingAria.length > 0;
    results.status = hasIssues ? 'FAIL' : 'PASS';

  } catch (err) {
    results.status = 'ERROR';
    results.error = err.message;
  }

  return results;
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
    });

    const allResults = [];
    const summary = [];

    for (const page of PAGES) {
      const tab = await context.newPage();
      try {
        const result = await auditPage(tab, page, BASE_URL);
        allResults.push(result);
        summary.push({ 
          page, 
          status: result.status, 
          contrast: result.contrast.length, 
          fontSize: result.fontSize.length,
          missingAlt: result.missingAlt.length,
          missingAria: result.missingAria.length,
        });
      } catch (err) {
        summary.push({ page, status: 'ERROR', contrast: 0, fontSize: 0, missingAlt: 0, missingAria: 0, error: err.message });
      } finally {
        await tab.close();
      }
    }

    /* ── Report ──────────────────────────────────────────────────────────── */
    if (JSON_OUTPUT) {
      const report = {
        timestamp: new Date().toISOString(),
        viewport: `${VIEWPORT_W}x${VIEWPORT_H}`,
        totalPages: PAGES.length,
        passed: summary.filter(s => s.status === 'PASS').length,
        failed: summary.filter(s => s.status === 'FAIL').length,
        errors: summary.filter(s => s.status === 'ERROR').length,
        summary,
        details: allResults,
      };
      console.log(JSON.stringify(report, null, 2));
      process.exitCode = summary.some(s => s.status === 'FAIL' || s.status === 'ERROR') ? 1 : 0;
      return;
    }

    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║        Comprehensive Accessibility Audit Report             ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log('║ Viewport: ' + `${VIEWPORT_W}x${VIEWPORT_H}`.padEnd(49) + '║');
    console.log('║ WCAG AA: Contrast ' + NORMAL_TEXT_RATIO + ':1 (normal) / ' + LARGE_TEXT_RATIO + ':1 (large)'.padEnd(33) + '║');
    console.log('║ Min font-size: ' + MIN_PX + 'px'.padEnd(44) + '║');
    console.log('║ Pages: ' + String(PAGES.length).padEnd(52) + '║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    for (const s of summary) {
      const icon = s.status === 'PASS' ? '✅' : s.status === 'FAIL' ? '❌' : '⚠️ ';
      const issues = [];
      if (s.contrast > 0) issues.push(`${s.contrast} contrast`);
      if (s.fontSize > 0) issues.push(`${s.fontSize} font-size`);
      if (s.missingAlt > 0) issues.push(`${s.missingAlt} missing alt`);
      if (s.missingAria > 0) issues.push(`${s.missingAria} missing ARIA`);
      const detail = issues.length > 0 ? ` — ${issues.join(', ')}` : '';
      console.log(`  ${icon} ${s.page}${detail}`);
    }

    /* Detailed violations */
    const pagesWithIssues = allResults.filter(r => r.status === 'FAIL');
    if (pagesWithIssues.length > 0) {
      console.log('\n── Detailed Violations ───────────────────────────────────────\n');
      
      for (const result of pagesWithIssues) {
        console.log(`  📄 ${result.page}`);
        
        if (result.contrast.length > 0) {
          console.log(`    🔲 Contrast violations (${result.contrast.length}):`);
          for (const v of result.contrast.slice(0, 5)) {
            console.log(`       <${v.tag}> ${v.ratio}:1 (need ${v.required}:1) — "${v.text}"`);
          }
          if (result.contrast.length > 5) {
            console.log(`       ... and ${result.contrast.length - 5} more`);
          }
        }
        
        if (result.fontSize.length > 0) {
          console.log(`    📏 Font-size violations (${result.fontSize.length}):`);
          for (const v of result.fontSize.slice(0, 5)) {
            console.log(`       <${v.tag}> ${v.fontSize}px (min ${v.minPx}px) — "${v.text}"`);
          }
          if (result.fontSize.length > 5) {
            console.log(`       ... and ${result.fontSize.length - 5} more`);
          }
        }
        
        if (result.missingAlt.length > 0) {
          console.log(`    🖼️  Missing alt text (${result.missingAlt.length}):`);
          for (const v of result.missingAlt.slice(0, 5)) {
            console.log(`       <img src="${v.src}"> in <${v.parent}>`);
          }
          if (result.missingAlt.length > 5) {
            console.log(`       ... and ${result.missingAlt.length - 5} more`);
          }
        }
        
        if (result.missingAria.length > 0) {
          console.log(`    ♿ Missing ARIA labels (${result.missingAria.length}):`);
          for (const v of result.missingAria.slice(0, 5)) {
            console.log(`       <${v.tag}${v.type ? ' type="' + v.type + '"' : ''}>`);
          }
          if (result.missingAria.length > 5) {
            console.log(`       ... and ${result.missingAria.length - 5} more`);
          }
        }
        
        console.log('');
      }
    }

    /* Summary */
    const passed = summary.filter(s => s.status === 'PASS').length;
    const failed = summary.filter(s => s.status === 'FAIL').length;
    const errors = summary.filter(s => s.status === 'ERROR').length;
    
    const totalContrast = allResults.reduce((sum, r) => sum + r.contrast.length, 0);
    const totalFontSize = allResults.reduce((sum, r) => sum + r.fontSize.length, 0);
    const totalMissingAlt = allResults.reduce((sum, r) => sum + r.missingAlt.length, 0);
    const totalMissingAria = allResults.reduce((sum, r) => sum + r.missingAria.length, 0);

    console.log('── Summary ────────────────────────────────────────────────────');
    console.log(`  ✅ Passed: ${passed}/${PAGES.length} pages`);
    if (failed > 0) console.log(`  ❌ Failed: ${failed} pages`);
    if (errors > 0) console.log(`  ⚠️  Errors: ${errors} pages`);
    console.log('');
    console.log(`  📊 Total violations: ${totalContrast + totalFontSize + totalMissingAlt + totalMissingAria}`);
    if (totalContrast > 0) console.log(`     🔲 Contrast: ${totalContrast}`);
    if (totalFontSize > 0) console.log(`     📏 Font-size: ${totalFontSize}`);
    if (totalMissingAlt > 0) console.log(`     🖼️  Missing alt: ${totalMissingAlt}`);
    if (totalMissingAria > 0) console.log(`     ♿ Missing ARIA: ${totalMissingAria}`);
    console.log('');

    process.exitCode = (failed > 0 || errors > 0) ? 1 : 0;

  } finally {
    if (browser) { try { await browser.close(); } catch { /* ignore */ } }
    if (server && server.listening) { try { await new Promise(r => server.close(r)); } catch { /* ignore */ } }
  }
})();
