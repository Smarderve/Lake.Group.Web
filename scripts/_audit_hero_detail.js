'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const pages = [
  'aill.html', 'cross-country.html', 'lake-aviation.html', 'lake-buildings.html',
  'lake-cylinders.html', 'lake-plastics.html', 'ocean-galleria.html',
  'station-locator.html', 'lake-lubes.html', 'about.html', 'contact.html',
  'csr.html', 'dashboard.html', 'fleet.html', 'gallery.html', 'history.html',
  'investors.html', 'leadership.html', 'media-center.html', 'projects.html',
  'sustainability.html',
];

for (const f of pages) {
  const s = fs.readFileSync(path.join(ROOT, f), 'utf8');
  const heroIdx = s.indexOf('class="page-hero"');
  const chunk = s.slice(heroIdx, heroIdx + 600);
  console.log('\n==== ' + f + ' ====');
  console.log(chunk.replace(/\s+/g, ' ').slice(0, 450));
}

// list image dirs that might supply flat-page heroes
const candidates = [
  'assets/images/n-slider',
  'assets/images/banner',
  'assets/images/about',
  'assets/images/csr',
  'assets/images/gallery',
  'assets/images/fleet',
  'assets/images/leadership',
  'assets/images/contact',
];
console.log('\n=== IMAGE DIRS ===');
for (const d of candidates) {
  const full = path.join(ROOT, d);
  if (!fs.existsSync(full)) {
    console.log(d + ': MISSING');
    continue;
  }
  const files = fs.readdirSync(full).filter((x) => /\.(jpe?g|png|webp)$/i.test(x)).slice(0, 12);
  console.log(d + ': ' + files.join(', '));
}
