#!/usr/bin/env node
/**
 * Replaces the Portuguese (pt) dictionary with Swahili (sw) in the i18n
 * content files.
 *
 * - Merges scripts/_sw_out_1.json ... _sw_out_4.json into one flat sw map.
 * - Fails loudly if the merged sw key set differs from the en key set.
 * - Reports strings whose embedded HTML tag names differ between en and sw.
 * - Rewrites assets/i18n-content.json as { en, fr, sw } (2-space indent,
 *   no trailing newline, mirroring the existing file).
 * - Regenerates assets/i18n-content.js as a single line:
 *     window.__LAKE_I18N_CONTENT__ = <json>;\n
 *   using ", " / ": " separators to mirror the existing file's format.
 *
 * Run from the repo root: node scripts/build_sw_lang.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const JSON_PATH = path.join(ROOT, 'assets', 'i18n-content.json');
const JS_PATH = path.join(ROOT, 'assets', 'i18n-content.js');

function fail(msg) {
  console.error('FATAL: ' + msg);
  process.exit(1);
}

// ---- load existing content -------------------------------------------------
const content = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
if (!content.en || !content.fr) fail('en/fr missing from i18n-content.json');

// ---- merge sw chunks -------------------------------------------------------
const sw = {};
for (let i = 1; i <= 4; i++) {
  const chunkPath = path.join(__dirname, `_sw_out_${i}.json`);
  const chunk = JSON.parse(fs.readFileSync(chunkPath, 'utf8'));
  for (const [k, v] of Object.entries(chunk)) {
    if (Object.prototype.hasOwnProperty.call(sw, k)) {
      fail(`duplicate key "${k}" in _sw_out_${i}.json`);
    }
    if (typeof v !== 'string') fail(`non-string value for "${k}" in _sw_out_${i}.json`);
    sw[k] = v;
  }
}

// ---- key-set check against en ----------------------------------------------
const enKeys = Object.keys(content.en);
const swKeySet = new Set(Object.keys(sw));
const missing = enKeys.filter((k) => !swKeySet.has(k));
const extra = Object.keys(sw).filter((k) => !Object.prototype.hasOwnProperty.call(content.en, k));
if (missing.length || extra.length) {
  if (missing.length) console.error('Missing in sw:', missing);
  if (extra.length) console.error('Extra in sw:', extra);
  fail(`sw key set differs from en (missing ${missing.length}, extra ${extra.length})`);
}
console.log(`sw keys merged: ${swKeySet.size} (matches en: ${enKeys.length})`);

// ---- HTML tag sanity check ---------------------------------------------------
function tagNames(str) {
  const names = [];
  const re = /<\/?\s*([a-zA-Z][a-zA-Z0-9-]*)/g;
  let m;
  while ((m = re.exec(str)) !== null) names.push(m[1].toLowerCase());
  return names.sort();
}

const tagMismatches = [];
for (const key of enKeys) {
  const enTags = tagNames(content.en[key]).join(',');
  const swTags = tagNames(sw[key]).join(',');
  if (enTags !== swTags) {
    tagMismatches.push({ key, en: enTags || '(none)', sw: swTags || '(none)' });
  }
}
if (tagMismatches.length) {
  console.warn(`HTML tag mismatches between en and sw: ${tagMismatches.length}`);
  for (const mm of tagMismatches) {
    console.warn(`  ${mm.key}: en=[${mm.en}] sw=[${mm.sw}]`);
  }
} else {
  console.log('HTML tag check: all en/sw strings have matching tag sets.');
}

// ---- write outputs -----------------------------------------------------------
// sw keys in en order, for stable diffs.
const swOrdered = {};
for (const k of enKeys) swOrdered[k] = sw[k];

const out = { en: content.en, fr: content.fr, sw: swOrdered };

// i18n-content.json: 2-space indent, no trailing newline (mirrors existing file).
fs.writeFileSync(JSON_PATH, JSON.stringify(out, null, 2), 'utf8');

// i18n-content.js: single line with ", " / ": " separators (mirrors existing file).
function serializeCompact(dict) {
  const langs = Object.keys(dict).map((lang) => {
    const entries = Object.keys(dict[lang]).map(
      (k) => JSON.stringify(k) + ': ' + JSON.stringify(dict[lang][k])
    );
    return JSON.stringify(lang) + ': {' + entries.join(', ') + '}';
  });
  return '{' + langs.join(', ') + '}';
}
fs.writeFileSync(JS_PATH, 'window.__LAKE_I18N_CONTENT__ = ' + serializeCompact(out) + ';\n', 'utf8');

console.log('Wrote', path.relative(ROOT, JSON_PATH), 'and', path.relative(ROOT, JS_PATH));
