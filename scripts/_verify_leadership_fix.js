'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'i18n-content.json'), 'utf8'));

const pages = [
  'leadership.html',
  'leadership-juma-nuru.html',
  'leadership-mohammed-khalid.html',
  'leadership-ally-edha-awadh.html',
  'leadership-bibhuti-singh.html',
  'leadership-dileep-kumar.html',
  'leadership-sridhar-mani.html'
];

let ok = true;
for (const p of pages) {
  const h = fs.readFileSync(path.join(ROOT, p), 'utf8');
  const hasPair = h.includes('data-lang-suggest') && h.includes('lang-pair-selected');
  const hasPwa = h.includes('manifest.webmanifest') && h.includes('pwa.js');
  const hasSeo = h.includes('og:title') && h.includes('rel="canonical"');
  const hasI18n = h.includes('i18n-content.js') && h.includes('i18n.js');
  const keys = [...h.matchAll(/data-i18n="(leadership\.[^"]+)"/g)].map((m) => m[1]);
  const missing = [];
  for (const k of new Set(keys)) {
    for (const lang of ['en', 'fr', 'sw', 'hi', 'ar']) {
      if (!data[lang][k] || !String(data[lang][k]).trim()) missing.push(lang + ':' + k);
    }
  }
  console.log(p, {
    hasPair,
    hasPwa,
    hasSeo,
    hasI18n,
    leadershipKeys: new Set(keys).size,
    missing: missing.length ? missing.slice(0, 8) : 'none'
  });
  if (!hasPair || !hasPwa || !hasSeo || !hasI18n || missing.length) ok = false;
}

// Sample Hindi strings for screenshot content
console.log('\nHI samples:');
['leadership.75', 'leadership.52', 'leadership.53', 'leadership.57', 'leadership.141'].forEach((k) => {
  console.log(k, '=>', data.hi[k]);
});

// Border check
const css = fs.readFileSync(path.join(ROOT, 'assets', 'flagship.css'), 'utf8');
const langMenu = css.match(/\.lang-menu \{[\s\S]*?\n\}/);
const navDd = css.match(/\.nav-dropdown \{[\s\S]*?\n\.nav-dropdown a/);
console.log('\nlang-menu has border:0?', /border:\s*0/.test(langMenu ? langMenu[0] : ''));
console.log('nav-dropdown has border:0?', /border:\s*0/.test(navDd ? navDd[0] : ''));
console.log(ok ? '\nVERIFY OK' : '\nVERIFY FAILED');
process.exit(ok ? 0 : 1);
