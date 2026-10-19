const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const locales = ['en', 'sw', 'hi', 'ar', 'zh', 'fr', 'es', 'pt'];
const dictionary = JSON.parse(fs.readFileSync(path.join(root, 'assets/i18n-content.json'), 'utf8'));
const homepage = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

test('homepage action gallery has localized captions and preserved company names in all locales', () => {
  const titleKeys = [...homepage.matchAll(/tKey:\s*"(index\.action\.gallery\.[^"]+\.title)"/g)].map((match) => match[1]);
  const subtitleKeys = [...homepage.matchAll(/sKey:\s*"(index\.action\.gallery\.[^"]+\.subtitle)"/g)].map((match) => match[1]);
  assert.equal(titleKeys.length, 17);
  assert.equal(new Set(titleKeys).size, 17);
  assert.equal(subtitleKeys.length, 17);
  assert.equal(new Set(subtitleKeys).size, 17);

  for (const key of [...titleKeys, ...subtitleKeys]) {
    for (const locale of locales) assert.ok(dictionary[locale]?.[key], `${locale} is missing ${key}`);
  }
  for (const key of titleKeys) {
    const source = dictionary.en[key];
    for (const locale of locales.slice(1)) assert.equal(dictionary[locale][key], source, `${locale} changed protected gallery name ${source}`);
  }
  for (const key of subtitleKeys) {
    const source = dictionary.en[key];
    for (const locale of locales.slice(1)) assert.notEqual(dictionary[locale][key], source, `${locale} left gallery description untranslated: ${source}`);
  }
});
