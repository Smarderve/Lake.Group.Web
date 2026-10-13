'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'globe-lab', 'entry.tsx'), 'utf8');

test('globe reveals once and holds the approved network instead of retracting it', () => {
  assert.match(source, /HOLD_AT_SECONDS=12/);
  assert.match(source, /Math\.min\(HOLD_AT_SECONDS,timeline\.current\+Math\.min\(delta,\.2\)\)/);
  assert.doesNotMatch(source, /%LOOP_SECONDS/);
  assert.doesNotMatch(source, /const retract=/);
  assert.doesNotMatch(source, /'retract'/);
});

test('globe keeps front-side labels and leaders available through drag recovery', () => {
  assert.match(source, /const attached=world\.clone\(\)\.normalize\(\)\.dot\(camera\.position\.clone\(\)\.normalize\(\)\)>\.08;/);
  assert.doesNotMatch(source, /attached=.*offset\.active/);
  assert.match(source, /leader\.style\.opacity=String\(attached\?\(window\.innerWidth<600\?\.72:\.65\):0\)/);
});
