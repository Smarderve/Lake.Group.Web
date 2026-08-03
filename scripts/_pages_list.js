#!/usr/bin/env node
/**
 * Enumerate all HTML pages in the project root suitable for Lighthouse testing.
 *
 * Usage:
 *   node scripts/_pages_list.js              # prints JSON array of URLs
 *   node scripts/_pages_list.js --serve-base http://localhost:3000
 *   node scripts/_pages_list.js --matrix     # outputs GitHub Actions matrix JSON (desktop only)
 *   node scripts/_pages_list.js --matrix --dual-viewport  # outputs matrix with desktop + mobile
 *
 * Excludes pages that won't run standalone (404, offline, news-article) and
 * leadership sub-pages that duplicate leadership.html content.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// Pages to exclude from Lighthouse audits (utility pages, duplicates, etc.)
const EXCLUDE = new Set([
  '404.html',
  'offline.html',
  'news-article.html',       // dynamically rendered, needs query params
  'dashboard.html',          // admin/dashboard page
  'lake-group-org-chart.html',
  'station-locator.html',    // heavy map interaction, not a content page
]);

// Leadership detail pages all share the same template — only test the index
const LEADERSHIP_DETAILS = [
  'leadership-ally-edha-awadh.html',
  'leadership-bibhuti-singh.html',
  'leadership-biji-lapat.html',
  'leadership-dileep-kumar.html',
  'leadership-juma-nuru.html',
  'leadership-mohammed-khalid.html',
  'leadership-sridhar-mani.html',
];

// Viewport presets for Lighthouse CI
const VIEWPORTS = {
  desktop: { preset: 'desktop', label: 'Desktop' },
  mobile:  { preset: 'mobile',  label: 'Mobile' },
};

function getPages() {
  const htmlFiles = fs.readdirSync(ROOT)
    .filter(f => f.endsWith('.html') && !f.startsWith('.') && !EXCLUDE.has(f) && !LEADERSHIP_DETAILS.includes(f))
    .sort();

  return htmlFiles.map(file => ({
    name: file.replace('.html', ''),
    file,
    url: `/${file}`,
  }));
}

// ---------- CLI ----------

const args = process.argv.slice(2);
const serveBase = (() => {
  const idx = args.indexOf('--serve-base');
  return idx !== -1 ? args[idx + 1] : 'http://localhost:3000';
})();

const matrixMode = args.includes('--matrix');
const dualViewport = args.includes('--dual-viewport');

const pages = getPages();

if (matrixMode) {
  let includes;
  if (dualViewport) {
    // 2D matrix: each page × each viewport
    includes = [];
    for (const p of pages) {
      for (const [vp, cfg] of Object.entries(VIEWPORTS)) {
        includes.push({
          page: p.name,
          file: p.file,
          url: `${serveBase}${p.url}`,
          viewport: vp,
          preset: cfg.preset,
          label: cfg.label,
        });
      }
    }
  } else {
    // Desktop only (backward compatible)
    includes = pages.map(p => ({
      page: p.name,
      file: p.file,
      url: `${serveBase}${p.url}`,
    }));
  }

  const matrix = { include: includes };
  console.log(JSON.stringify(matrix));
} else {
  // Pretty-print page list
  const output = pages.map(p => ({ ...p, url: `${serveBase}${p.url}` }));
  console.log(JSON.stringify(output, null, 2));
}
