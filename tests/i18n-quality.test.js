const test = require('node:test');
const assert = require('node:assert/strict');
const { validateDictionaries } = require('../scripts/i18n-quality.mjs');

test('quality checks catch missing keys, changed facts, URLs, placeholders, and markup', () => {
  const locales = ['sw', 'hi', 'ar', 'zh', 'fr', 'es', 'pt'];
  const dictionaries = { en: { fact: '10,000+ people at https://lake.example/{count} <strong>today</strong>', blank: 'Contact us' } };
  for (const locale of locales) dictionaries[locale] = { fact: '30,000+ people at https://wrong.example/%s <em>today</em>' };
  const report = validateDictionaries(dictionaries);
  const types = report.issues.filter((item) => item.locale === 'sw').map((item) => item.type);
  for (const type of ['numbers', 'urls', 'placeholders', 'tags', 'verified-employee-count', 'missing']) assert.ok(types.includes(type), `${type} must be flagged`);
  assert.equal(report.benchmarkStatus, 'pending');
  assert.equal(report.qualityClaim, 'not-verified');
});
