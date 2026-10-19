'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'globe-lab', 'entry.tsx'), 'utf8');

test('globe reveals, holds, and retracts on a continuous repeating cycle', () => {
  assert.match(source, /HOLD_AT_SECONDS=12/);
  assert.match(source, /CYCLE_SECONDS=18, RETRACT_START_SECONDS=15, RETRACT_END_SECONDS=17/);
  assert.match(source, /\(timeline\.current\+Math\.min\(delta,\.2\)\)%CYCLE_SECONDS/);
  assert.match(source, /THREE\.MathUtils\.smoothstep\(elapsed,RETRACT_START_SECONDS,RETRACT_END_SECONDS\)/);
  assert.match(source, /const phase=.*'retract'/);
  assert.match(source, /y:FINAL_ROTATION\+travel\*\(Math\.PI\*2\)/);
});

test('globe labels localize in place without changing geography or remounting', () => {
  assert.match(source, /const PLACE_NAMES:Record<string,Record<Locale,string>>/);
  assert.match(source, /ar:'جمهورية الكونغو الديمقراطية'/);
  assert.match(source, /document\.addEventListener\('lake-i18n-applied',applyNames\)/);
  assert.match(source, /labelRefs\.current\[place\.id\]/);
  assert.match(source, /lat:-6\.7924, lng:39\.2083/);
});

test('globe keeps front-side labels and leaders available through drag recovery', () => {
  assert.match(source, /const attached=world\.clone\(\)\.normalize\(\)\.dot\(camera\.position\.clone\(\)\.normalize\(\)\)>\.08;/);
  assert.doesNotMatch(source, /attached=.*offset\.active/);
  assert.match(source, /leader\.style\.opacity=String\(attached\?\(window\.innerWidth<600\?\.72:\.65\):0\)/);
});
