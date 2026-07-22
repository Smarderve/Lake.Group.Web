#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');

let h = fs.readFileSync('gallery.html', 'utf8');
let n = 0;
for (let i = 2; i <= 9; i++) {
  const jpg = `assets/images/n-slider/${i}.jpg`;
  const webp = `assets/images/n-slider/${i}.webp`;
  if (!fs.existsSync(webp)) continue;
  if (h.includes(`srcset="${webp}"`)) continue;
  const needle = `<img src="${jpg}"`;
  let idx = 0;
  while ((idx = h.indexOf(needle, idx)) !== -1) {
    // skip if already inside picture
    const before = h.slice(Math.max(0, idx - 40), idx);
    if (before.includes('<picture')) {
      idx += needle.length;
      continue;
    }
    const end = h.indexOf('>', idx);
    if (end === -1) break;
    const tag = h.slice(idx, end + 1);
    const attrs = tag.slice(('<img src="' + jpg + '"').length, -1);
    const picture = `<picture><source srcset="${webp}" type="image/webp"><img src="${jpg}"${attrs}></picture>`;
    h = h.slice(0, idx) + picture + h.slice(end + 1);
    n++;
    idx = idx + picture.length;
  }
}
if (fs.existsSync('assets/images/n-slider/3.webp')) {
  h = h.replace(
    /background-image:url\(['"]assets\/images\/n-slider\/3\.jpg['"]\)/g,
    'background-image:image-set(url("assets/images/n-slider/3.webp") type("image/webp"), url("assets/images/n-slider/3.jpg") type("image/jpeg"))'
  );
}
fs.writeFileSync('gallery.html', h);
console.log('gallery picture wraps', n);
