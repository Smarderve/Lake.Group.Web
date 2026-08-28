const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const lakeOil = fs.readFileSync(path.join(__dirname, '..', 'lake-oil.html'), 'utf8');

test('Lake Oil keeps the original YouTube video and permits its nested player frame', () => {
  assert.match(lakeOil, /Watch Lake Oil in Action/);
  assert.match(lakeOil, /youtube-nocookie\.com\/embed\/nrnAJL_2FD4/);
  assert.match(lakeOil, /frame-src[^>]*https:\/\/www\.google\.com/);
});
