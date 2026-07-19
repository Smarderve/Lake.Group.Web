#!/usr/bin/env node
/**
 * Add/replace ?v=N on design CSS/JS links and ensure tokens.css is linked
 * explicitly before theme/flagship (not only via @import).
 *
 * Usage: node scripts/bust_asset_cache.js [version]
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const VERSION = String(process.argv[2] || '41');
const V = '?v=' + VERSION;

const ASSET_RE =
  /(href|src)=(["'])(assets\/(?:tokens|theme|flagship|flagship-motion|motion|assistant|site|pwa|i18n|i18n-content)\.(?:css|js))(?:\?[^"']*)?\2/g;

function ensureTokensLink(html) {
  if (/href=["']assets\/tokens\.css/.test(html)) return html;

  // Prefer inserting immediately before flagship or theme stylesheet.
  const beforeFlagship = html.replace(
    /(<link\s+rel=["']stylesheet["']\s+href=["']assets\/flagship\.css[^"']*["'][^>]*>)/i,
    '<link rel="stylesheet" href="assets/tokens.css' + V + '">\n$1'
  );
  if (beforeFlagship !== html) return beforeFlagship;

  const beforeTheme = html.replace(
    /(<link\s+rel=["']stylesheet["']\s+href=["']assets\/theme\.css[^"']*["'][^>]*>)/i,
    '<link rel="stylesheet" href="assets/tokens.css' + V + '">\n$1'
  );
  return beforeTheme;
}

function stripConflictingRootRemap(html) {
  // Interior pages redefine --navy/--amber on :root in a way that fights
  // tokens.css / flagship chrome once cascade order or @import timing shifts.
  // Variants differ (--navy3 present/absent; about.html drops navy entirely).
  return html
    .replace(
      /:root\{--amber:var\(--gold-deep\);--amber2:var\(--gold\);--amber3:var\(--gold\);(?:--navy:var\(--ink\);--navy2:var\(--ink-3\);(?:--navy3:var\(--ink-3\);)?)?--bone:var\(--paper-2\);--bone2:var\(--paper-2\)\}\s*/g,
      ''
    );
}

function main() {
  const files = fs
    .readdirSync(ROOT)
    .filter((f) => f.endsWith('.html'))
    .sort();

  let changed = 0;
  for (const fn of files) {
    const fp = path.join(ROOT, fn);
    let html = fs.readFileSync(fp, 'utf8');
    const orig = html;

    html = stripConflictingRootRemap(html);
    html = html.replace(ASSET_RE, (_, attr, q, asset) => attr + '=' + q + asset + V + q);
    html = ensureTokensLink(html);

    // Inline @import in <style> blocks (home)
    html = html.replace(
      /@import\s+url\(["']assets\/tokens\.css(?:\?[^"']*)?["']\)/g,
      '@import url("assets/tokens.css' + V + '")'
    );

    if (html !== orig) {
      fs.writeFileSync(fp, html, 'utf8');
      changed += 1;
      console.log('updated', fn);
    }
  }
  console.log('Done. version=' + VERSION + ' filesChanged=' + changed);
}

main();
