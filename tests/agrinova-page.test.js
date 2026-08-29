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
  const agro = desktop.match(/id="mm-pane-agro"[\s\S]*?<\/div><\/div>/)?.[0] || '';
  assert.match(agro, /agrinova-tech\.html/);
  assert.match(agro, /agrinova-tech\.png/);
  assert.match(mobile, /data-mm-cat="agro"[\s\S]*Agrinova Tech Limited/);
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
