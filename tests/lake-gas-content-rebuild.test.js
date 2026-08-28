const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const pagePath = path.join(__dirname, '..', 'lake-gas.html');

test('Lake Gas public page uses the approved source-backed information architecture', () => {
  const html = fs.readFileSync(pagePath, 'utf8');

  for (const text of [
    'Lake Gas Limited, established in 2014',
    'OUR COMPANIES BY COUNTRY',
    'MISSION, VISION &amp; VALUES',
    'LPG SUPPLY &amp; SOLUTIONS',
    '150,000+ rural residents',
    'INTEGRITY',
    'INNOVATION',
    'SUSTAINABILITY',
    'CUSTOMER FOCUS',
    'lake-gas-lpg-filling-line.webp'
  ]) {
    assert.match(html, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
  }

  for (const text of [
    'East Africa&#39;s trusted LPG bottling and distribution company',
    'Operations by Country',
    'Mission, Vision &amp; History',
    'LPG Bottling &amp; Distribution',
    'Our LPG Cylinders',
    'Quality</h4>',
    'Professionalism</h4>',
    'over two decades'
  ]) {
    assert.doesNotMatch(html, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});
