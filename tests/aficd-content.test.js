const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const pagePath = path.join(__dirname, '..', 'aficd.html');
const page = fs.readFileSync(pagePath, 'utf8');

test('AFICD page uses the approved source-backed structure', () => {
  const required = [
    'African Inland Container Depot (AFICD)',
    'Connecting Port Operations with Inland Logistics',
    'Inland Container Depot (ICD)',
    'Container Freight Station (CFS)',
    'Empty Container Depot (ECD)',
    'DPW Tanzania',
    'ADANI/KEAGTL Tanzania',
    '14,000 sq. metre',
    'four reach stackers',
    '800–900 TEUs',
    '365 days a year',
    'round the clock',
    'Mission, Vision &amp; Values',
    'To provide safe, efficient and timely storage and logistics solutions',
    'To be Africa\'s leading inland container depot',
    'Customer Focus',
    'Operational Excellence',
    'AFICD — Connecting the Port to the Inland Supply Chain.'
  ];

  for (const phrase of required) assert.match(page, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('AFICD removes superseded sections and uses image-led capabilities', () => {
  for (const phrase of [
    'OUR DEPOT LOCATIONS',
    'MISSION, VISION &amp; HISTORY',
    'DEPOT &amp; HANDLING SERVICES',
    '<h2>Gallery</h2>',
    'CONTAINER DEPOT &amp; FREIGHT SERVICES'
  ]) assert.doesNotMatch(page, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));

  assert.equal((page.match(/class="aficd-solution"/g) || []).length, 6);
  const operationImages = [...page.matchAll(/assets\/images\/aficd\/operations\/([^"']+)/g)].map((match) => match[1]);
  assert.ok(new Set(operationImages).size >= 6, 'expected the compact source-backed AFICD operational image set');
  assert.match(page, /aficd-truck-loading\.jpeg/);
  assert.match(page, /class="aficd-intro-facts"/);
  assert.doesNotMatch(page, /class="aficd-glance fs-on-dark"/);
});

test('AFICD page has no malformed replacement characters', () => {
  assert.doesNotMatch(page, /[�]/);
  assert.doesNotMatch(page, /[âÃÂ]/);
});
