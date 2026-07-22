#!/usr/bin/env node
'use strict';
const fs = require('fs');
const SKIP = new Set([
  'fuel.html','lpg.html','lubricants.html','steel.html','concrete.html',
  'logistics.html','container-services.html','404.html','offline.html',
]);
const files = fs.readdirSync('.').filter((f) => f.endsWith('.html') && !SKIP.has(f)).sort();
const miss = [];
for (const f of files) {
  const h = fs.readFileSync(f, 'utf8');
  const checks = {
    desc: /name=["']description["']/.test(h),
    og: /og:title/.test(h),
    tw: /twitter:card/.test(h),
    can: /rel=["']canonical["']/.test(h),
    vp: /name=["']viewport["']/.test(h),
    cs: /charset=/i.test(h),
    pwa: /pwa\.js/.test(h),
  };
  const bad = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
  if (bad.length) miss.push(f + ': ' + bad.join(','));
}
console.log(miss.length ? miss.join('\n') : 'all public pages have core SEO+PWA');
console.log('pages checked', files.length);
