#!/usr/bin/env node
/*
 * Idempotently normalizes Open Graph / Twitter card tags on root HTML pages:
 *   - og:image + twitter:image → absolute https://www.lakeoilgroup.com/assets/images/logos/LAKE_GROUP_LOGO.png
 *   - ensures og:title, og:description, og:type, og:url, og:site_name
 *   - ensures twitter:card=summary_large_image + twitter:image
 *
 * Skips redirect stubs (fuel.html, etc.) and utility pages (404/offline).
 * Safe to re-run. Run from repo root: node scripts/add_og_meta.js
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BASE = 'https://www.lakeoilgroup.com/';
const OG_IMAGE = BASE + 'assets/images/logos/LAKE_GROUP_LOGO.png';

const SKIP = new Set([
  '404.html',
  'offline.html',
  'fuel.html',
  'lpg.html',
  'lubricants.html',
  'steel.html',
  'concrete.html',
  'logistics.html',
  'container-services.html',
]);

function pageUrl(file) {
  return file === 'index.html' ? BASE : BASE + file;
}

function decodeEntities(s) {
  return String(s)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function escapeAttr(s) {
  return decodeEntities(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

/** Read content= from a meta tag matching property= or name=. Handles apostrophes in values. */
function getMetaContent(html, attrName, attrValue) {
  const re = new RegExp(
    `<meta\\b[^>]*\\b${attrName}=["']${attrValue}["'][^>]*>|<meta\\b[^>]*\\b${attrName}=["']${attrValue}["'][^>]*>`,
    'i'
  );
  // Broader: find meta tags that contain the attr, then parse content=
  const tagRe = new RegExp(`<meta\\b[^>]*\\b${attrName}=["']${attrValue}["'][^>]*>`, 'i');
  const m = html.match(tagRe);
  if (!m) {
    // content may appear before property/name
    const rev = new RegExp(
      `<meta\\b[^>]*\\bcontent=(["'])([\\s\\S]*?)\\1[^>]*\\b${attrName}=["']${attrValue}["'][^>]*>`,
      'i'
    );
    const m2 = html.match(rev);
    return m2 ? m2[2] : '';
  }
  const contentRe = /\bcontent=(["'])([\s\S]*?)\1/i;
  const c = m[0].match(contentRe);
  return c ? c[2] : '';
}

function upsertMeta(html, attrName, attrValue, content) {
  const tag =
    attrName === 'property'
      ? `<meta property="${attrValue}" content="${content}">`
      : `<meta name="${attrValue}" content="${content}">`;

  const re = new RegExp(`<meta\\b[^>]*\\b${attrName}=["']${attrValue}["'][^>]*>`, 'i');
  if (re.test(html)) {
    return html.replace(re, tag);
  }

  const descRe = /<meta\s+name=["']description["'][^>]*>/i;
  if (descRe.test(html)) {
    return html.replace(descRe, (m) => m + '\n  ' + tag);
  }
  const titleEnd = html.indexOf('</title>');
  if (titleEnd !== -1) {
    return html.slice(0, titleEnd + 8) + '\n  ' + tag + html.slice(titleEnd + 8);
  }
  const headEnd = html.indexOf('</head>');
  if (headEnd !== -1) {
    return html.slice(0, headEnd) + '  ' + tag + '\n' + html.slice(headEnd);
  }
  return html;
}

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

  const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
  const pageTitle = titleMatch ? decodeEntities(titleMatch[1].trim()) : 'Lake Group';
  const desc =
    getMetaContent(html, 'name', 'description') ||
    'Lake Group — energy, logistics and industrial conglomerate across East and Central Africa.';

  // Prefer existing og:* when non-empty; fall back to title/description.
  // If prior run truncated on apostrophe, prefer the longer description meta.
  let ogTitle = getMetaContent(html, 'property', 'og:title') || pageTitle;
  let ogDesc = getMetaContent(html, 'property', 'og:description') || desc;
  // Repair prior truncations (apostrophe cut content= parsing) without
  // overwriting intentional shorter social blurbs.
  if (desc && ogDesc && ogDesc.length < 40 && desc.length > ogDesc.length) {
    ogDesc = desc;
  }
  if (!ogDesc) ogDesc = desc;
  if (pageTitle && /&amp;amp;/.test(ogTitle)) ogTitle = pageTitle;
  ogTitle = decodeEntities(ogTitle);
  ogDesc = decodeEntities(ogDesc);

  html = upsertMeta(html, 'property', 'og:title', escapeAttr(ogTitle));
  html = upsertMeta(html, 'property', 'og:description', escapeAttr(ogDesc));
  html = upsertMeta(html, 'property', 'og:image', OG_IMAGE);
  html = upsertMeta(html, 'property', 'og:type', 'website');
  html = upsertMeta(html, 'property', 'og:url', pageUrl(file));
  html = upsertMeta(html, 'property', 'og:site_name', 'Lake Group');
  html = upsertMeta(html, 'name', 'twitter:card', 'summary_large_image');
  html = upsertMeta(html, 'name', 'twitter:image', OG_IMAGE);
  html = upsertMeta(html, 'name', 'twitter:title', escapeAttr(ogTitle));
  html = upsertMeta(html, 'name', 'twitter:description', escapeAttr(ogDesc));

  html = html.replace(
    /content=["']assets\/images\/og-cover\.jpg["']/g,
    `content="${OG_IMAGE}"`
  );

  if (html !== before) {
    fs.writeFileSync(full, html);
    modified++;
    console.log(`updated ${file}`);
  } else {
    console.log(`ok      ${file}`);
  }
}

console.log(`\n${modified}/${files.length} files modified`);
console.log('OG image:', OG_IMAGE);
