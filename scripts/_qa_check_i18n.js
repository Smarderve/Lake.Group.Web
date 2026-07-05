#!/usr/bin/env node
// QA: every data-i18n / data-i18n-attr key on every page resolves in en/fr/sw.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const dict = JSON.parse(fs.readFileSync(path.join(root, 'assets/i18n-content.json'), 'utf8'));
const langs = Object.keys(dict);
console.log('Languages:', langs.join(', '), '| key counts:', langs.map(l => Object.keys(dict[l]).length).join('/'));

const pages = fs.readdirSync(root).filter(f => f.endsWith('.html'));
const missing = [];
const used = new Set();
for (const page of pages) {
  const html = fs.readFileSync(path.join(root, page), 'utf8');
  const keys = new Set();
  for (const m of html.matchAll(/data-i18n\s*=\s*["']([^"']+)["']/g)) keys.add(m[1]);
  for (const m of html.matchAll(/data-i18n-(?:placeholder|aria|title|alt|content)\s*=\s*["']([^"']+)["']/g)) keys.add(m[1]);
  for (const m of html.matchAll(/data-i18n-attr\s*=\s*["']([^"']+)["']/g)) {
    // format may be "attr:key" or "attr:key;attr2:key2" or just key list — handle both
    for (const part of m[1].split(';')) {
      const bits = part.split(':');
      keys.add((bits[1] || bits[0]).trim());
    }
  }
  for (const k of keys) {
    used.add(k);
    for (const l of langs) {
      if (!(k in dict[l])) missing.push(`${page}: key "${k}" missing in ${l}`);
    }
  }
}
if (missing.length) {
  console.log('MISSING (' + missing.length + '):');
  missing.slice(0, 60).forEach(x => console.log('  ' + x));
  if (missing.length > 60) console.log('  ...and ' + (missing.length - 60) + ' more');
  process.exit(1);
}
console.log('OK: all page keys resolve in all languages. Used keys:', used.size);
// orphans: keys in dict not used on any page (informational)
const orphans = Object.keys(dict.en).filter(k => !used.has(k));
console.log('Dict-only keys (not in page data-i18n, may be used by JS):', orphans.length);
fs.writeFileSync(path.join(root, 'scripts/_qa_i18n_orphans.txt'), orphans.join('\n'));
