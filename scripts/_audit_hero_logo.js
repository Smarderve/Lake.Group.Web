'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const htmls = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html'));

console.log('=== HERO AUDIT ===');
for (const f of htmls) {
  const s = fs.readFileSync(path.join(ROOT, f), 'utf8');
  const hasPageHero = /class="page-hero"/.test(s);
  const hasHero = /class="hero"/.test(s) && !hasPageHero;
  if (!hasPageHero && !/class="hero"/.test(s)) continue;
  const hasMedia = /hero-media|page-hero-photo|class="hero-photo"/.test(s);
  const bgs = [];
  const re = /background-image:\s*url\(['"]?([^'")\s]+)['"]?\)/g;
  let m;
  while ((m = re.exec(s))) {
    if (/images|banner|slider|photo|n-slider|lakesteel|laketrans|gccp|aficd/i.test(m[1])) {
      bgs.push(m[1]);
    }
  }
  const inline = (s.match(/class="nav-logo"[\s\S]{0,200}?style="height:(\d+)px/) || [])[1] || '-';
  const opacity = (s.match(/\.page-hero\s+\.hero-media\{[^}]*opacity:([0-9.]+)/) || [])[1]
    || (s.match(/\.page-hero-photo[^}]*opacity:\s*([0-9.]+)/) || [])[1]
    || '-';
  console.log(
    [
      f,
      hasPageHero ? 'page-hero' : 'hero',
      hasMedia ? 'HAS_MEDIA' : 'FLAT',
      'opacity=' + opacity,
      'logoInline=' + inline,
      (bgs.slice(0, 2).join(' ; ') || 'no-photo-url'),
    ].join(' | ')
  );
}

console.log('\n=== LOGO CSS RULES (assets) ===');
for (const rel of ['assets/tokens.css', 'assets/theme.css', 'assets/flagship.css']) {
  const lines = fs.readFileSync(path.join(ROOT, rel), 'utf8').split(/\r?\n/);
  lines.forEach((line, i) => {
    if (/nav-logo|nav-logo-height|nav-logo-h\b/.test(line)) {
      console.log(rel + ':' + (i + 1) + ': ' + line.trim());
    }
  });
}

console.log('\n=== INLINE LOGO HEIGHT COUNT ===');
let count = 0;
for (const f of htmls) {
  const s = fs.readFileSync(path.join(ROOT, f), 'utf8');
  const n = (s.match(/nav-logo[\s\S]{0,120}?style="height:\d+px/g) || []).length;
  if (n) {
    count += n;
    console.log(f + ': ' + n);
  }
}
console.log('total pages with inline: ' + count);
