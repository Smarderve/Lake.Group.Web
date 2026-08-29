const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('Agrinova page is source-backed and uses supplied local assets', () => {
  const page = read('agrinova-tech.html');
  for (const value of [
    'AGRINOVA TECH LIMITED', 'Powering the future of agriculture', '45–240 HP',
    'Eicher Tractors', 'YTO Tractors', 'Irrigation', 'Harvesting', 'After sales support',
    'Financing', 'Pugu Road', 'Kibaha, Tanzania', '+255 748 518 111',
    'assets/images/agrinova/centre-pivot.webp', 'assets/images/agrinova/tractor.webp',
    'assets/images/agrinova/combine.webp', 'assets/images/logos/companies/agrinova-tech.png'
  ]) assert.match(page, new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
  for (const forbidden of ['XX+', 'Lorem ipsum', 'Profile coming soon', 'placeholder company text']) {
    assert.ok(!page.toLowerCase().includes(forbidden.toLowerCase()), `${forbidden} must not be published`);
  }
});

test('Agrinova uses the real desktop logo and text-only mobile navigation', () => {
  const desktop = read('scripts/templates/nav.html');
  const mobile = read('scripts/templates/mobile_nav.html');
  const automotive = desktop.match(/id="mm-pane-automotive"[\s\S]*?<\/div><\/div>/)?.[0] || '';
  assert.match(automotive, /agrinova-tech\.html/);
  assert.match(automotive, /agrinova-tech\.png/);
  assert.match(desktop, /id="mm-pane-agro"[^>]*><div class="mm-companies"><a href="lake-agro\.html"[^>]*><img[^>]*lake-agro\.png[^>]*><\/a><\/div><\/div>/);
  assert.match(mobile, /data-mm-cat="automotive"[\s\S]*Agrinova Tech Limited/);
  assert.match(mobile, /data-mm-cat="agro">Agro Processing Sector<\/div><div class="mob-sector-companies"><a href="lake-agro\.html">Lake Agro<\/a><\/div>/);
  assert.doesNotMatch(mobile, /<img[^>]*agrinova/i);
});

test('Agrinova logo loop and assets are present', () => {
  assert.match(read('assets/components/logo-loop-mount.js'), /agrinova-tech\.png/);
  for (const file of [
    'assets/images/logos/companies/agrinova-tech.png',
    'assets/images/agrinova/centre-pivot.webp',
    'assets/images/agrinova/tractor.webp',
    'assets/images/agrinova/combine.webp'
  ]) assert.ok(fs.existsSync(path.join(root, file)), `${file} exists`);
});

test('Agrinova uses scoped readable typography, footer, and loading colors', () => {
  const page = read('agrinova-tech.html');
  assert.match(page, /--agrinova-green-dark/);
  assert.match(page, /font-size:clamp\(3rem,4\.4vw,3\.9rem\)/);
  assert.match(page, /footer\.site-footer\{background:#0d2f21!important/);
  assert.match(page, /html\.lg-loading::before\{[^}]*rgba\(18,61,44/);
  assert.doesNotMatch(page, /background:#013f5c;pointer-events:none/);
  assert.match(page, /\.ag-vision h2\{text-transform:none;font-size:clamp\(1\.35rem,2\.2vw,2rem\)/);
  assert.match(page, /#contact-agrinova\{background:#3a7a5e;color:#f4f8f0/);
  assert.match(page, /body\.co-theme-agro \[data-lg-skeleton-block="media"\]\{background:rgba\(74,126,89,.58\)/);
  assert.doesNotMatch(page, /body\.co-theme-agro \[data-lg-skeleton-block="media"\]\{background:rgba\(5,153,211/);
});

test('Agrinova does not publish a quote form', () => {
  const page = read('agrinova-tech.html');
  assert.doesNotMatch(page, /id="quote-form"|Find the right equipment for your farm|class="ag-quote"/i);
});
