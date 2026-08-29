'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

const home = read('index.html');
const gallery = read('gallery.html');

assert.match(home, /assets\/images\/home\/verticals\/energies\.webp[^>]+fetchpriority="high"[^>]+loading="eager"/);
assert.doesNotMatch(home, /automotive-truck-lineup\.png/);
assert.ok(fs.statSync(path.join(ROOT, 'assets/images/home/verticals/automotive-truck-lineup.webp')).size < 250000);

const heroSlides = [...home.matchAll(/class="hero-slide(?: [^"]+)?"[\s\S]*?<img[^>]+>/g)].map((m) => m[0]);
assert.ok(heroSlides.length >= 6, 'Home hero slide set is present');
assert.equal(heroSlides.filter((slide) => /loading="eager"/.test(slide)).length, 1, 'only first Home hero is eager');
assert.ok(heroSlides.slice(1).every((slide) => /loading="lazy"/.test(slide)), 'remaining Home heroes are lazy');

const galleryImgs = [...gallery.matchAll(/<img\b[^>]*class="gallery-tile__img"[^>]*>/g)].map((m) => m[0]);
assert.ok(galleryImgs.length > 10, 'Gallery tile set is present');
assert.ok(galleryImgs.every((img) => /loading="lazy"/.test(img)), 'Gallery tiles are lazy');
const featuredGallery = gallery.match(/class="gal-slider__slide is-active"[\s\S]*?<img[^>]+>/)?.[0] || '';
assert.match(featuredGallery, /loading="eager"/);
assert.match(featuredGallery, /fetchpriority="high"/);
assert.equal((gallery.match(/<iframe\b/gi) || []).length, 0, 'Gallery has no eager embeds');

for (const page of ['lake-oil.html', 'lake-lubes.html']) {
  const source = read(page);
  assert.equal((source.match(/<iframe\b/gi) || []).length, 0, `${page} uses a click-to-load video facade`);
  assert.match(source, /youtube-facade/);
}

console.log('Performance sanity checks passed.');
