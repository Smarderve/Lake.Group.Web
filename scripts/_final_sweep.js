#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..');

function read(p) {
  return fs.readFileSync(path.join(ROOT, p), 'utf8');
}

// Re-sync nav from templates to heal any corrupted mega-menu cells
execFileSync('node', [path.join(ROOT, 'scripts', 'normalize_nav.js')], { stdio: 'inherit', cwd: ROOT });

// Ensure services directory rows still correct after normalize
let services = read('services.html');
if (!/href="atl\.html" class="div-row"/.test(services)) {
  // directory section should have div-row; if missing, leave (normalize only touches chrome)
}
// Fix em dashes if reintroduced
services = services.replace(/—/g, '-');
fs.writeFileSync(path.join(ROOT, 'services.html'), services);

// Final external href audit (destination links only)
const remaining = [];
const corruptedNav = [];
for (const f of fs.readdirSync(ROOT).filter((x) => x.endsWith('.html'))) {
  const s = read(f);
  if (/href="https:\/\/atl-tz\.com"|href="https:\/\/lakeagro\.com/.test(s)) remaining.push(f);
  const nav = s.match(/<nav class="site-nav"[\s\S]*?<\/nav>/);
  if (nav && /class="div-row"/.test(nav[0])) corruptedNav.push(f);
}

const mount = read('assets/components/logo-loop-mount.js');
const logos = [...mount.matchAll(/src: '([^']+\.png)'/g)].map((m) => m[1]);
const missing = logos.filter((p) => !fs.existsSync(path.join(ROOT, p)));

const j = JSON.parse(read('assets/i18n-content.json'));
console.log(
  JSON.stringify(
    {
      remainingExternal: remaining,
      corruptedNav,
      missingLogos: missing,
      logoCount: logos.length,
      agroTheme: /body\.co-theme-agro\s*\{/.test(read('lake-agro.html')),
      marqueeInset: /inset 0 2px 0 var\(--color-yellow-accent\)/.test(read('index.html')),
      arHero: j.ar['hero.eyebrow'],
      aboutBadge: j.ar['about.badge'],
      darLatinAr: /\bDar es Salaam\b/.test(JSON.stringify(j.ar)),
      darLatinHi: /\bDar es Salaam\b/.test(JSON.stringify(j.hi))
    },
    null,
    2
  )
);
