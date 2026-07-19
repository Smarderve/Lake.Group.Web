#!/usr/bin/env node
/*
 * Idempotently injects PWA tags into every root HTML page:
 *   <head> - theme-color meta + manifest link (after </title>)
 *   <body> - <script src="assets/pwa.js" defer></script> (before final </body>)
 *
 * Makes targeted string insertions only; never reformats or rewrites
 * surrounding markup. Safe to re-run.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const MANIFEST_LINK = '<link rel="manifest" href="manifest.webmanifest">';
const THEME_META = '<meta name="theme-color" content="#0181BB">';
const PWA_SCRIPT = '<script src="assets/pwa.js" defer></script>';

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

  // --- head insertions, placed right after </title> ---
  const headAdditions = [];
  if (!html.includes('name="theme-color"')) headAdditions.push(THEME_META);
  if (!html.includes('rel="manifest"')) headAdditions.push(MANIFEST_LINK);

  if (headAdditions.length > 0) {
    const titleEnd = html.indexOf('</title>');
    if (titleEnd === -1) {
      console.error(`SKIP head (${file}): no </title> found`);
    } else {
      const insertAt = titleEnd + '</title>'.length;
      const insertion = '\n  ' + headAdditions.join('\n  ');
      html = html.slice(0, insertAt) + insertion + html.slice(insertAt);
      changes.push('head');
    }
  }

  // --- pwa.js before the LAST </body> ---
  if (!html.includes('assets/pwa.js')) {
    const bodyEnd = html.lastIndexOf('</body>');
    if (bodyEnd === -1) {
      console.error(`SKIP body (${file}): no </body> found`);
    } else {
      html = html.slice(0, bodyEnd) + PWA_SCRIPT + '\n' + html.slice(bodyEnd);
      changes.push('body');
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
