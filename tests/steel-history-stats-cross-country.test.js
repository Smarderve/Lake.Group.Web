const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('Lake Steel uses only the approved legal name and supported capacity facts', () => {
  const steel = read('lake-steel.html');
  assert.match(steel, /Lake Steel &amp; Allied Products Limited/);
  assert.match(steel, /60,000/);
  assert.match(steel, /25T\/hr/);
  for (const unsupported of ['100K', '100,000', '600°C', '50%+', 'FIRST IN TANZANIA']) {
    assert.doesNotMatch(steel, new RegExp(unsupported.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
  }
});

test('public History timeline ends at 2026 and retains verified 2026 entries', () => {
  const history = read('history.html');
  const years = [...history.matchAll(/class="history-year">(\d{4})</g)].map((match) => Number(match[1]));
  assert.ok(years.length > 0);
  assert.ok(Math.max(...years) <= 2026);
  assert.match(history, /Lake Aviation Tanzania/);
  assert.match(history, /Gulf Aggregates \(T\) Ltd/);
  assert.match(history, /Upcoming · 2026/);
});

test('Home presents 250+ fuel stations without an Across Africa keyfact', () => {
  const home = read('index.html');
  assert.match(home, /data-metric-key="stations">250\+<\/span>/);
  assert.doesNotMatch(home, /data-metric-key="network_locations"/);
  assert.doesNotMatch(home, /data-i18n="stat\.acrossAfrica"/);
  assert.doesNotMatch(home, /data-metric-key="stations">154<\/span>/);
});

test('approved Cross Country visual is used on Cross Country and Home Real Estate', () => {
  const asset = 'assets/images/cross-country/cross-country-hero.webp';
  const homeStyles = read('assets/home-redesign.css');
  assert.ok(fs.existsSync(path.join(root, asset)));
  assert.match(read('cross-country.html'), new RegExp(asset.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(read('index.html'), new RegExp(asset.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.doesNotMatch(read('cross-country.html'), /cross-country-hq\.webp/);
  assert.doesNotMatch(read('index.html'), /cross-country-hq\.webp/);
  assert.match(homeStyles, /cross-country-hero\.webp"\]\s*\{\s*object-position:\s*55% center/);
  assert.match(read('cross-country.html'), /hero-media\{background-position:55% center\}/);
});

test('retired companies remain absent from navigation while AFICD remains', () => {
  const home = read('index.html');
  assert.doesNotMatch(home, /ocean-galleria\.html/i);
  assert.doesNotMatch(home, /acfs\.html/i);
  assert.match(home, /aficd\.html/i);
});
