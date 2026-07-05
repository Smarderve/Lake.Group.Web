#!/usr/bin/env node
/*
 * One-shot performance pass over the root HTML pages. Idempotent.
 *
 * 1. <img> tags: add loading="lazy" decoding="async" to below-the-fold
 *    images. Skipped: nav/footer/finale logos (LAKE_GROUP_LOGO), the
 *    above-the-fold hero photo grid on index.html, cinematic story-scene
 *    photos (would pop in mid-animation), and empty-src placeholders.
 *    Images that already have loading="lazy" just gain decoding="async".
 *
 * 2. <script src=...>: add `defer` to the end-of-body site scripts
 *    (i18n-content.js, i18n.js, site.js, news-data.js, news.js). Defer
 *    preserves document order for external scripts, so the
 *    i18n-content -> i18n -> site chain is safe. our-story.html is
 *    excluded: it has an inline `window.LakeI18n.init()` that must run
 *    after i18n.js, and inline scripts can't be deferred. The Leaflet
 *    trio on africa-network.html is also left alone for the same reason
 *    (an inline script right after it uses the map globals).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const DEFER_SRCS = [
  'assets/i18n-content.js',
  'assets/i18n.js',
  'assets/site.js',
  'assets/news-data.js',
  'assets/news.js',
];
const NO_DEFER_PAGES = new Set(['our-story.html']);

const SKIP_IMG_CLASSES = /(?:ose-photo|photo-slot|start-logo|experience-3d)/;

const files = fs
  .readdirSync(ROOT)
  .filter((f) => f.endsWith('.html') && f !== 'offline.html')
  .sort();

for (const file of files) {
  const full = path.join(ROOT, file);
  let html = fs.readFileSync(full, 'utf8');
  const before = html;
  let lazyAdded = 0;
  let decodingAdded = 0;
  let deferAdded = 0;

  // Identify the above-the-fold hero photo grid on index.html so its
  // images are excluded from lazy-loading. Match the markup (`<div
  // class=...`), not the identically-named CSS rule in <style>.
  let heroZone = [-1, -1];
  if (file === 'index.html') {
    const start = html.indexOf('<div class="hero-photo-grid">');
    if (start !== -1) {
      const end = html.indexOf('</div>', start);
      heroZone = [start, end === -1 ? start : end];
    }
  }

  html = html.replace(/<img\b[^>]*>/g, (tag, offset) => {
    if (offset >= heroZone[0] && offset <= heroZone[1]) return tag;
    if (tag.includes('LAKE_GROUP_LOGO')) return tag;
    if (SKIP_IMG_CLASSES.test(tag)) return tag;
    if (/src=""/.test(tag)) return tag;

    let out = tag;
    if (!/\bloading=/.test(out)) {
      out = out.replace(/>$/, ' loading="lazy">');
      lazyAdded++;
    }
    if (!/\bdecoding=/.test(out) && /loading="lazy"/.test(out)) {
      out = out.replace(/>$/, ' decoding="async">');
      decodingAdded++;
    }
    return out;
  });

  if (!NO_DEFER_PAGES.has(file)) {
    for (const src of DEFER_SRCS) {
      const plain = `<script src="${src}"></script>`;
      const deferred = `<script src="${src}" defer></script>`;
      if (html.includes(plain)) {
        html = html.split(plain).join(deferred);
        deferAdded++;
      }
    }
  }

  if (html !== before) {
    fs.writeFileSync(full, html);
    console.log(
      `updated ${file}: +lazy=${lazyAdded} +decoding=${decodingAdded} +defer=${deferAdded}`
    );
  } else {
    console.log(`ok      ${file}`);
  }
}
