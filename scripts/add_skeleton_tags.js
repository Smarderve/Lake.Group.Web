#!/usr/bin/env node
/*
 * Idempotently wires the sitewide skeleton loader into every root HTML page:
 *   - class="lg-loading" on <html> (keeps first paint consistent)
 *   - <link rel="stylesheet" href="assets/skeleton.css?v=1"> before </head>
 *   - <script src="assets/skeleton.js?v=1"></script> early after <body>
 *     (not defer — mounts overlay ASAP)
 *
 * Targeted string insertions only; safe to re-run.
 * Run from repo root: node scripts/add_skeleton_tags.js
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CSS_HREF = 'assets/skeleton.css?v=3';
const JS_SRC = 'assets/skeleton.js?v=3';
const CSS_TAG = `<link rel="stylesheet" href="${CSS_HREF}">`;
const JS_TAG = `<script src="${JS_SRC}"></script>`;
// Tiny early veil so heavy <head> pages (index) don't flash content before skeleton.css.
const CRITICAL =
  '<style id="lg-skel-critical">html.lg-loading{overflow:hidden}html.lg-loading::before{content:"";position:fixed;inset:0;z-index:99989;background:#013f5c;pointer-events:none}html.lg-skel-done::before{display:none}.nav-logo img,.site-nav .nav-logo img{height:var(--nav-logo-height,48px)!important;width:auto!important;max-width:min(220px,55vw)!important;max-height:var(--nav-logo-height,48px)!important;object-fit:contain}</style>';

// Utility pages — skip (no chrome to skeleton).
const SKIP = new Set([
  '404.html',
  'offline.html',
]);

const files = fs
  .readdirSync(ROOT)
  .filter((f) => f.endsWith('.html'))
  .sort();

let modified = 0;

for (const file of files) {
  if (SKIP.has(file)) {
    console.log(`skip    ${file}`);
    continue;
  }

  const full = path.join(ROOT, file);
  let html = fs.readFileSync(full, 'utf8');
  const before = html;
  const changes = [];

  // --- lg-loading class on <html> ---
  const htmlOpen = html.match(/<html\b[^>]*>/i)?.[0] || '';
  if (htmlOpen && !/\blg-loading\b/.test(htmlOpen)) {
    const next = html.replace(/<html(\s[^>]*)?>/i, (m, attrs) => {
      attrs = attrs || '';
      if (/\bclass="/i.test(attrs)) {
        return m.replace(/\bclass="/i, 'class="lg-loading ');
      }
      return `<html class="lg-loading"${attrs}>`;
    });
    if (next !== html) {
      html = next;
      changes.push('html-class');
    }
  }

  // --- critical early style (right after <head>) ---
  if (!html.includes('id="lg-skel-critical"')) {
    const headOpen = html.match(/<head\b[^>]*>/i);
    if (headOpen) {
      const at = headOpen.index + headOpen[0].length;
      html = html.slice(0, at) + '\n  ' + CRITICAL + html.slice(at);
      changes.push('critical');
    }
  }

  // --- stylesheet before </head> ---
  if (!html.includes('assets/skeleton.css')) {
    const headEnd = html.indexOf('</head>');
    if (headEnd === -1) {
      console.error(`SKIP css (${file}): no </head>`);
    } else {
      html = html.slice(0, headEnd) + '  ' + CSS_TAG + '\n' + html.slice(headEnd);
      changes.push('css');
    }
  }

  // --- non-deferred script right after <body...> ---
  if (!html.includes('assets/skeleton.js')) {
    const bodyOpen = html.match(/<body\b[^>]*>/i);
    if (!bodyOpen) {
      console.error(`SKIP js (${file}): no <body>`);
    } else {
      const at = bodyOpen.index + bodyOpen[0].length;
      html = html.slice(0, at) + '\n  ' + JS_TAG + html.slice(at);
      changes.push('js');
    }
  }

  if (html !== before) {
    fs.writeFileSync(full, html);
    modified++;
    console.log(`updated ${file} (${changes.join(', ')})`);
  } else {
    console.log(`ok      ${file}`);
  }
}

console.log(`\n${modified}/${files.length} files modified`);
