'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'lake-lubes.html'), 'utf8');

for (const phrase of [
  'established in 2016',
  'fully integrated Lube Oil Blending Plant',
  '4.2 million litres',
  '54,000 litres per day',
  'Mission, Vision &amp; Core Values',
  'Quality Excellence',
  'Operational Excellence',
  'Self-Reliance',
  'National Development',
  'Company Objectives',
  'Watch Lake Lubes in Action'
]) assert.match(html, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

assert.doesNotMatch(html, /�/);
assert.doesNotMatch(html, /Mission, Vision &amp; History/);
assert.doesNotMatch(html, />History<\/h3>/);
assert.doesNotMatch(html, /Customer Satisfaction|People &amp; Teamwork/);
assert.equal((html.match(/class="val-mini-tile"/g) || []).length, 4);
assert.match(html, /youtube-nocookie\.com\/embed\/LjmQvb-jQJk\?rel=0/);
assert.match(html, /class="fs-video lubes-video"/);
assert.match(html, /target="_blank"[^>]*>watch Lake Lubes in Action on YouTube/);
assert.equal((html.match(/mdi:account-(?:tie|cash-outline)/g) || []).length, 0);

console.log('Lake Lubes content and media checks passed');
