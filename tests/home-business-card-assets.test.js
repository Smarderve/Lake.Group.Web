'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const requiredAssets = [
  'assets/images/lakeoil/current/lake-energies-station-approved.webp',
  'assets/images/lakegas/ops/lake-gas-lpg-filling-line.webp',
  'assets/images/laketrans/profile/lake-trans-truck-fleet.webp',
  'assets/images/gccp/lake-premix-batching-plant.webp',
  'assets/images/lakelubes/products/lake-lubes-power-eco-range.webp'
];

for (const asset of requiredAssets) {
  assert.ok(fs.existsSync(path.join(root, asset)), `missing approved business image: ${asset}`);
  assert.match(html, new RegExp(asset.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

const premixCard = html.match(/<a href="lake-premix-cement\.html" class="aramco-card[\s\S]*?<\/a>/)?.[0] || '';
assert.ok(premixCard, 'Premix business card is missing');
assert.doesNotMatch(premixCard, /Dubai|flags\/ae\.svg|UAE flag/i);
assert.match(premixCard, /flags\/tz\.svg/);

console.log('Homepage business card asset checks passed');
