const fs = require('fs');
const c = require('../assets/i18n-content.json');
const langs = ['en', 'fr', 'sw', 'hi', 'ar'];
const need = [];
for (let i = 1; i <= 18; i++) {
  const n = String(i).padStart(2, '0');
  need.push('index.action.i' + n + '.t', 'index.action.i' + n + '.s');
}
need.push(
  'index.action.lead', 'index.action.all', 'index.action.oil', 'index.action.gas',
  'index.action.industry', 'index.action.logistics', 'index.action.prev',
  'index.action.next', 'index.action.filters',
  'gallery.6', 'gallery.9', 'gallery.10', 'gallery.11', 'gallery.12',
  'gallery.13', 'gallery.14', 'gallery.54'
);

let miss = 0;
let counts = 0;
for (const lang of langs) {
  for (const k of need) {
    if (!c[lang][k]) {
      console.log('MISS', lang, k);
      miss++;
    }
  }
  for (const k of ['gallery.6', 'gallery.9', 'gallery.10', 'gallery.11', 'gallery.12', 'gallery.13', 'gallery.14', 'gallery.54', 'gallery.55']) {
    const v = c[lang][k] || '';
    if (/\(\s*\d|\b39\b/.test(v)) {
      console.log('COUNT', lang, k, v);
      counts++;
    }
  }
}

const still = ['gas1.jpg', 'gas2.jpg', 'gas3.jpg', 'gas4.jpg', 'gas5.jpg'].filter((g) =>
  fs.existsSync('assets/images/lakegas/products/' + g)
);
const htmlGas = ['gallery.html', 'lake-gas.html', 'index.html'].filter((f) =>
  fs.readFileSync(f, 'utf8').includes('lakegas/products/gas')
);
const index = fs.readFileSync('index.html', 'utf8');
const gallery = fs.readFileSync('gallery.html', 'utf8');

console.log({
  miss,
  counts,
  still,
  htmlGas,
  hasCounter: /data-action-count|action-count/.test(index),
  galleryCounts: /g-count|All \(/.test(gallery),
  coverflowLazy: /action-tile[\s\S]*?loading="lazy"/.test(index) || index.includes('loading="lazy" decoding="async" width="640"')
});

if (miss || counts || still.length || htmlGas.length) {
  process.exit(1);
}
console.log('ALL GOOD');
