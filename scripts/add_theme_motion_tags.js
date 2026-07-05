#!/usr/bin/env node
/*
 * Idempotently injects the shared design/motion layer into every root page:
 *   <head>  — <link rel="stylesheet" href="assets/theme.css"> just before
 *             </head>, i.e. AFTER the page's inline <style> block so the
 *             theme layer wins cascade ties.
 *   <body>  — <script src="assets/motion.js" defer></script> before the
 *             final </body> (deferred, so it executes after site.js).
 *
 * Makes targeted string insertions only; never reformats or rewrites
 * surrounding markup. Safe to re-run.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const THEME_LINK = '<link rel="stylesheet" href="assets/theme.css">';
const MOTION_SCRIPT = '<script src="assets/motion.js" defer></script>';

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

  if (!html.includes('assets/theme.css')) {
    const headEnd = html.indexOf('</head>');
    if (headEnd === -1) {
      console.error(`SKIP head (${file}): no </head> found`);
    } else {
      html = html.slice(0, headEnd) + THEME_LINK + '\n' + html.slice(headEnd);
      changes.push('theme.css');
    }
  }

  if (!html.includes('assets/motion.js')) {
    const bodyEnd = html.lastIndexOf('</body>');
    if (bodyEnd === -1) {
      console.error(`SKIP body (${file}): no </body> found`);
    } else {
      html = html.slice(0, bodyEnd) + MOTION_SCRIPT + '\n' + html.slice(bodyEnd);
      changes.push('motion.js');
    }
  }

  if (html !== before) {
    fs.writeFileSync(full, html);
    modified++;
    console.log(`updated ${file} (${changes.join(', ')})`);
  } else {
    console.log(`ok      ${file} (already tagged)`);
  }
}

console.log(`\n${modified}/${files.length} files modified`);
