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

test('Arabic and Persian numerals normalize before protected-number comparison', () => {
  const locales = ['sw', 'hi', 'ar', 'zh', 'fr', 'es', 'pt'];
  const dictionaries = { en: { count: '500+ stations, 12.5 percent' } };
  for (const locale of locales) dictionaries[locale] = { count: '500+ stations, 12.5 percent' };
  dictionaries.ar.count = '٥٠٠+ محطة، ١٢٫٥ بالمئة';
  dictionaries.hi.count = '۵۰۰+ स्टेशन, ۱۲.۵ प्रतिशत';
  dictionaries.fr.count = '500+ stations, 12,5 percent';
  dictionaries.es.count = '500+ estaciones, 12,5 por ciento';
  dictionaries.pt.count = '500+ postos, 12,5 por cento';
  const report = validateDictionaries(dictionaries);
  assert.deepEqual(report.issues.filter((issue) => issue.type === 'numbers'), []);
});

test('localized thousands and decimal separators compare as the same numbers', () => {
  const dictionaries = { en: { count: '50,000 units and 12.5 percent' } };
  dictionaries.sw = { ...dictionaries.en }; dictionaries.hi = { ...dictionaries.en };
  dictionaries.ar = { ...dictionaries.en }; dictionaries.zh = { ...dictionaries.en };
  dictionaries.fr = { count: '50 000 unités et 12,5 pour cent' };
  dictionaries.es = { count: '50.000 unidades y 12,5 por ciento' };
  dictionaries.pt = { count: '50.000 unidades e 12,5 por cento' };
  assert.deepEqual(validateDictionaries(dictionaries).issues.filter((issue) => issue.type === 'numbers'), []);
});

test('empty English placeholders do not count as missing visitor translations', () => {
  const dictionaries = { en: { empty: '', visible: 'Gallery' } };
  for (const locale of ['sw', 'hi', 'ar', 'zh', 'fr', 'es', 'pt']) dictionaries[locale] = { empty: '', visible: 'Gallery' };
  const report = validateDictionaries(dictionaries);
  assert.deepEqual(report.issues, []);
  assert.equal(report.summary.sw.required, 1);
  assert.equal(report.summary.sw.translated, 1);
});
