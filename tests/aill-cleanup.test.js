'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const page = fs.readFileSync(path.join(__dirname, '..', 'aill.html'), 'utf8');

test('AILL is an operations page without leadership or gallery sections', () => {
  assert.doesNotMatch(page, /Mr\. Ally Edha Awadh|Founder &amp; Chairman, Lake Group|Managing Director, AILL|Chief Financial Officer, AILL/i);
  assert.doesNotMatch(page, /<h2[^>]*>Gallery<\/h2>|AILL \. African Inland Logistics gallery|Trusted by the Industry/i);
  assert.doesNotMatch(page, /href="leadership\.html"[^>]*class="fs-card"/i);
  assert.doesNotMatch(page, /Operations by Country/i);
  assert.doesNotMatch(page, /Why Customers Choose AILL|Our Commitment/i);
});

test('AILL retains source-backed operational cargo content and the corporate footer', () => {
  for (const value of ['Port handling', 'Warehousing', 'Sulphur', 'Copper', '201,000', '331,000', 'assets/images/logos/LAKE_GROUP_LOGO.png']) {
    assert.match(page, new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
  }
});
