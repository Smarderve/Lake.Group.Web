#!/usr/bin/env node
/*
 * Idempotently wires the offline knowledge assistant into every root HTML
 * page (pattern borrowed from add_seo_tags.js — targeted string insertions
 * only, never reformats surrounding markup, safe to re-run):
 *
 *   - <link rel="stylesheet" href="assets/assistant.css"> before </head>
 *   - three deferred scripts after the assets/site.js tag (i.e. after the
 *     i18n scripts, which precede site.js on every page), or before </body>
 *     on pages without site.js (404.html, offline.html):
 *       assets/vendor/flexsearch/flexsearch.bundle.min.js  (search engine)
 *       assets/assistant-kb.js                             (knowledge base)
 *       assets/assistant.js                                (assistant)
 *
 * Run from repo root: node scripts/add_assistant_tags.js
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const CSS_TAG = '<link rel="stylesheet" href="assets/assistant.css">';
const SCRIPT_TAGS = [
  '<script src="assets/vendor/flexsearch/flexsearch.bundle.min.js" defer></script>',
  '<script src="assets/assistant-kb.js" defer></script>',
  '<script src="assets/assistant.js" defer></script>',
];

const files = fs
  .readdirSync(ROOT)
  .filter((f) => f.endsWith('.html'))
  .sort();

let modified = 0;

for (const file of files) {
  const full = path.join(ROOT, file);
  let html = fs.readFileSync(full, 'utf8');
  const before = html;
  const changes = [];

  // --- stylesheet before </head> ---
  if (!html.includes('assets/assistant.css')) {
    const headEnd = html.indexOf('</head>');
    if (headEnd === -1) {
      console.error(`SKIP css (${file}): no </head> found`);
    } else {
      html = html.slice(0, headEnd) + '  ' + CSS_TAG + '\n' + html.slice(headEnd);
      changes.push('css');
    }
  }

  // --- scripts after site.js (else before </body>) ---
  if (!html.includes('assets/assistant.js')) {
    const insertion = '\n  ' + SCRIPT_TAGS.join('\n  ');
    const siteTag = html.match(/<script src="assets\/site\.js" defer><\/script>/);
    if (siteTag) {
      const at = siteTag.index + siteTag[0].length;
      html = html.slice(0, at) + insertion + html.slice(at);
      changes.push('scripts(after site.js)');
    } else {
      const bodyEnd = html.lastIndexOf('</body>');
      if (bodyEnd === -1) {
        console.error(`SKIP scripts (${file}): no site.js tag or </body>`);
      } else {
        html = html.slice(0, bodyEnd) + insertion.slice(1) + '\n' + html.slice(bodyEnd);
        changes.push('scripts(before </body>)');
      }
    }
  }

  if (html !== before) {
    fs.writeFileSync(full, html);
    modified++;
    console.log(`updated ${file} (${changes.join(', ')})`);
  } else {
    console.log(`ok      ${file} (already wired)`);
  }
}

console.log(`\n${modified}/${files.length} files modified`);
