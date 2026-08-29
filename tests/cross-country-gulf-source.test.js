const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const read = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');

test('Cross Country retains only source-backed company and project facts', () => {
  const page = read('cross-country.html');
  for (const text of ['2021', 'Commercial', 'Retail', 'Hospitality', 'Mixed-Use', 'Lake Avenue', 'Kingsway Development', 'Oysterbay', 'Ocean Galleria', 'UN Road Development', 'Town Development Project']) assert.match(page, new RegExp(text, 'i'));
  for (const text of ['75,000', 'Carrefour', '300+ guest rooms', 'Looking Ahead']) assert.doesNotMatch(page, new RegExp(text, 'i'));
});

test('Gulf Aggregates uses source-backed history and removes unsupported KPIs', () => {
  const page = read('gulf-aggregates.html');
  for (const text of ['2018', '2019', 'Lugoba', 'Quarrying', 'Crushing', 'Screening', 'Aggregate Handling', 'Gulf Concrete and Cement Products', 'Safety First', 'Sustainability', 'Customer Focus']) assert.match(page, new RegExp(text, 'i'));
  for (const text of ['30K', '250T/hr', '2 Crushing Plants']) assert.doesNotMatch(page, new RegExp(text, 'i'));
});
