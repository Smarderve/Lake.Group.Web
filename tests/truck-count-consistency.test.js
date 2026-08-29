'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const oldFleetValue = /(?:1,200|1200|1 200|1\.200|1\.2k)[+\s]*(?:trucks?|fleet|vehicles?|camions?|malori|magari|camiones?|caminh)/i;

test('the canonical Lake Group fleet count is 1,600+', () => {
  const seed = fs.readFileSync(path.join(root, 'backend/scripts/seed-metrics.js'), 'utf8');
  const i18n = JSON.parse(fs.readFileSync(path.join(root, 'assets/i18n-content.json'), 'utf8'));
  assert.match(seed, /key: 'trucks',[\s\S]*?value: '1,600\+'/);
  assert.match(i18n.en['fleet.4'], /1,600 purpose-built trucks/);
  assert.match(i18n.en['index.53'], /1,600\+ trucks/);
  for (const [language, content] of Object.entries(i18n)) {
    for (const [key, value] of Object.entries(content)) {
      if (typeof value === 'string') assert.doesNotMatch(value, oldFleetValue, `${language}.${key} uses an obsolete fleet value`);
    }
  }
});

test('truck counters animate to 1,600+ and public fallback text agrees', () => {
  for (const file of ['about.html', 'africa-network.html', 'fleet.html']) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    assert.match(html, /data-count="1600"[^>]*data-suffix="\+"/);
    assert.match(html, />1,600\+</);
  }
  const publicSources = ['assets/assistant-kb.js', 'assets/site.js', 'assets/news-data.js', 'llms.txt'];
  for (const file of publicSources) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    assert.doesNotMatch(source, oldFleetValue, `${file} retains an obsolete truck count`);
  }
});
