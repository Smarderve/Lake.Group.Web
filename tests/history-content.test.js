'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'history.html'), 'utf8');

for (const phrase of [
  'Lake Oil Ltd', 'AFICD &amp; AILL', 'Sun Fuel SARL', 'Lake Gas Ltd',
  'Lake Lubes Ltd', 'Lake Steel &amp; Allied Products Ltd', 'Lake Aviation',
  'Lake Oil LDA', 'Gulf Premix Ltd', 'Cross Country Developer Ltd',
  'Gulf Aggregates (T) Ltd', 'Ocean Galleria', 'Lake Agro Ltd',
  '2026', 'Upcoming', '2027', 'Planned'
]) assert.match(html, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

for (const phrase of [
  'Logistics &amp; First Regional Steps', 'GCCP Ready-Mix Concrete',
  'East African Footprint Grows', 'Lubricants &amp; Composite Cylinders',
  'Tanga LPG Terminal', 'Recognition &amp; LPG Expansion',
  '30,000+ employees', '>Today<'
]) assert.doesNotMatch(html, new RegExp(phrase, 'i'));

assert.match(html, /background-image:url\('assets\/images\/laketrans\/profile\/fleet-lineup\.jpg'\)/);
assert.match(html, /class="fs-section-sm hx-cta-yellow"/);
assert.match(html, /Join our team or partner with Lake Group as we continue building across Africa\./);
assert.equal((html.match(/class="history-year-group"/g) || []).length, 14);
assert.equal((html.match(/class="history-event"/g) || []).length, 24);

console.log('History timeline content checks passed');
