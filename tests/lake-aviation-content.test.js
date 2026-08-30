const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const page = fs.readFileSync(path.join(__dirname, '..', 'lake-aviation.html'), 'utf8');
const seed = fs.readFileSync(path.join(__dirname, '..', 'backend', 'scripts', 'content-seed-data.js'), 'utf8');
const kbBuilder = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'build_assistant_kb.js'), 'utf8');

test('Lake Aviation page reflects the approved company write-up', () => {
  for (const fragment of [
    'established in 2020',
    'Kilimanjaro International Airport (JRO)',
    'Julius Nyerere International Airport (DAR)',
    'Abeid Amani Karume International Airport (ZNZ)',
    'Entebbe International Airport (EBB)',
    'Lake Oil Uganda',
    'Mission, Vision &amp; Values',
    'international aviation standards while delivering quality aviation fuel',
    'leading and preferred aviation fuel supplier across East Africa',
    'Dedication',
    'Cohesiveness',
  ]) assert.ok(page.includes(fragment), `missing approved fragment: ${fragment}`);
});

test('Lake Aviation retains operating-location facts without a country-card or products section', () => {
  assert.doesNotMatch(page, /<h3[^>]*>\s*Operations by Country\s*<\/h3>|<span class="eyebrow">\s*04\s*<\/span>\s*<h2>\s*Products Offered\s*<\/h2>|<h3>\s*Our Products\s*<\/h3>/i);
  assert.match(page, /Operating Locations/);
  assert.equal(page.includes('>History</h3>'), false);
  assert.equal(page.includes('Mission, Vision &amp; History'), false);
});

test('Lake Aviation gallery uses an editorial responsive grid of genuine operational images', () => {
  assert.match(page, /class="co-gal lake-aviation-gallery"/);
  assert.match(page, /\.lake-aviation-gallery \.co-gal__item--feat\{grid-column:1\/\-1;aspect-ratio:16\/7/);
  assert.match(page, /\.lake-aviation-gallery \.co-gal__item--portrait/);
  assert.equal((page.match(/assets\/images\/lake-aviation\/(ops|gallery)\//g) || []).length >= 10, true, 'page references approved aviation imagery');
});

test('canonical seed and assistant builder carry the approved Uganda footprint', () => {
  assert.ok(seed.includes('Established in 2020 as part of Lake Energies'));
  assert.ok(kbBuilder.includes("id: 'lakeaviation'"));
  assert.ok(kbBuilder.includes('Entebbe International Airport (EBB)'));
});
