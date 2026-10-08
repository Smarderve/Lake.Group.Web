'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const ORIGIN = 'https://www.lakeoilgroup.com';
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const seoConfig = read('scripts/seo-config.mjs');
const home = read('index.html');
const vercel = JSON.parse(read('vercel.json'));
const iis = read('web.config');

assert.match(seoConfig, /OFFICIAL_SITE_URL = 'https:\/\/www\.lakeoilgroup\.com'/);
assert.match(seoConfig, /parsed\.origin !== OFFICIAL_SITE_URL/);
assert.match(home, new RegExp(`<link rel="canonical" href="${ORIGIN}/">`));
for (const property of [
  'og:type', 'og:site_name', 'og:title', 'og:description', 'og:url', 'og:image',
  'og:image:secure_url', 'og:image:type', 'og:image:width', 'og:image:height',
]) assert.match(home, new RegExp(`property="${property}"`));
for (const name of ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image']) {
  assert.match(home, new RegExp(`name="${name}"`));
}
assert.match(home, /<meta property="og:image" content="https:\/\/www\.lakeoilgroup\.com\/assets\/images\/social\/lake-group-og-v2\.jpg">/);
assert.match(home, /<meta property="og:image:secure_url" content="https:\/\/www\.lakeoilgroup\.com\/assets\/images\/social\/lake-group-og-v2\.jpg">/);
assert.match(home, /<meta name="twitter:card" content="summary_large_image">/);

for (const asset of [
  'favicon.ico',
  'assets/icons/pwa/icon-192.png',
  'assets/icons/pwa/icon-512.png',
  'assets/icons/pwa/apple-touch-icon.png',
  'assets/images/social/lake-group-og-v2.jpg',
]) assert.ok(fs.existsSync(path.join(ROOT, asset)), `${asset} is present`);

const redirectOnlyPages = new Set([
  '404.html', 'acfs.html', 'atl.html', 'lake-group-financial-dashboard.html',
  'lake-group-org-chart.html', 'la-home.html', 'la-projects.html', 'media-center.html',
  'ocean-galleria.html', 'offline.html',
]);
for (const file of fs.readdirSync(ROOT).filter((name) => name.endsWith('.html') && !redirectOnlyPages.has(name))) {
  const html = read(file);
  assert.match(html, /<link rel="icon" href="favicon\.ico\?v=/, `${file}: root favicon is declared`);
  assert.match(html, /<link rel="icon" href="assets\/icons\/pwa\/icon-192\.png\?v=/, `${file}: PNG favicon is declared`);
  assert.match(html, /<link rel="apple-touch-icon" href="assets\/icons\/pwa\/apple-touch-icon\.png\?v=/, `${file}: Apple touch icon is declared`);
  assert.match(html, /<link rel="manifest" href="manifest\.webmanifest"/, `${file}: manifest is declared`);
}

const redirects = new Map(vercel.redirects.map(({ source, destination }) => [source, destination]));
for (const [source, destination] of [
  ['/acfs.html', '/aficd.html'], ['/atl.html', '/assembly-tech.html'],
  ['/lubricants.html', '/lake-lubes.html'], ['/lakeoil/:path*', '/lake-oil.html'],
  ['/lakelubes/:path*', '/lake-lubes.html'], ['/acfs/:path*', '/aficd.html'],
  ['/lakegroup/contact.html', '/contact.html'],
]) assert.equal(redirects.get(source), destination, `${source} has a direct replacement`);
assert.match(iis, /Legacy Lake Lubes directory/);
assert.match(iis, /Legacy group corporate pages/);

console.log('SEO, social preview, favicon, and legacy-redirect checks passed.');
