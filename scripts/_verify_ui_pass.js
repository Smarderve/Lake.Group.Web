'use strict';
const fs = require('fs');
const ROOT = require('path').join(__dirname, '..');
const d = require(require('path').join(ROOT, 'assets', 'i18n-content.json'));

console.log('ar name/role:', d.ar['leadership.17'], '|', d.ar['leadership.18']);
console.log('hi name/role:', d.hi['leadership.17'], '|', d.hi['leadership.18']);
console.log('eastern digits in ar.117:', (d.ar['leadership.117'].match(/[٠-٩]+/g) || []).slice(0, 8));
console.log('CEO leftover ar roles:', ['leadership.18', 'leadership.27'].map((k) => k + '=' + d.ar[k]));

let htmlEm = 0;
for (const f of fs.readdirSync(ROOT).filter((x) => x.endsWith('.html'))) {
  htmlEm += (fs.readFileSync(require('path').join(ROOT, f), 'utf8').match(/\u2014/g) || []).length;
}
const i18nEm = ['en', 'fr', 'sw', 'hi', 'ar'].reduce(
  (n, l) => n + Object.values(d[l]).filter((v) => typeof v === 'string' && v.includes('\u2014')).length,
  0
);
console.log('emdash html=', htmlEm, 'i18n=', i18nEm);

const index = fs.readFileSync(require('path').join(ROOT, 'index.html'), 'utf8');
console.log('nav dir=ltr:', index.includes('site-nav" dir="ltr"') || index.includes("site-nav' dir='ltr'"));
console.log('globe spin:', index.includes('lang-globe-spin'));
console.log('footer social svg:', index.includes('footer-social') && index.includes('lg-ico'));
console.log('css ltr lock:', fs.readFileSync(require('path').join(ROOT, 'assets', 'flagship.css'), 'utf8').includes('direction: ltr !important'));
console.log('h1 wired:', fs.readFileSync(require('path').join(ROOT, 'leadership-dileep-kumar.html'), 'utf8').includes('data-i18n="leadership.17"'));
console.log('contact icons:', (fs.readFileSync(require('path').join(ROOT, 'contact.html'), 'utf8').match(/ct-ico lg-ico/g) || []).length);
