const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { parse } = require('parse5');

const dictionaries = JSON.parse(fs.readFileSync('assets/i18n-content.json', 'utf8'));
const masterEnglish = JSON.parse(fs.readFileSync('scripts/_master_en.json', 'utf8'));
const extractedEnglish = JSON.parse(fs.readFileSync('scripts/_extracted_en.json', 'utf8'));

test('Kiswahili dictionary covers homepage language keys and compiled content stays synchronized', () => {
  const html = parse(fs.readFileSync('index.html', 'utf8'));
  const keys = new Set();
  const visit = (node) => {
    for (const attribute of node.attrs || []) {
      if (['data-i18n', 'data-i18n-placeholder', 'data-i18n-title', 'data-i18n-alt', 'data-i18n-aria'].includes(attribute.name)) {
        keys.add(attribute.value);
      }
    }
    for (const child of node.childNodes || []) visit(child);
  };
  visit(html);

  const missing = [...keys].filter((key) => !dictionaries.en[key] || !dictionaries.sw[key]);
  assert.deepEqual(missing, [], 'every homepage translation key must have English source and Kiswahili content');

  const window = {};
  vm.runInNewContext(fs.readFileSync('assets/i18n-content.js', 'utf8'), { window });
  assert.equal(JSON.stringify(window.__LAKE_I18N_CONTENT__), JSON.stringify(dictionaries));
});

test('Kiswahili company facts match the English source without unsupported claims', () => {
  const sw = dictionaries.sw;
  assert.match(sw['index.20'], /Falme za Kiarabu/);
  assert.doesNotMatch(sw['index.20'], /Dubai/);
  assert.match(sw['index.20'], /10/);
  assert.match(sw['index.23'], /1,600\+/);
  assert.doesNotMatch(sw['index.48'], /5 bora/);
  assert.match(sw['index.48'], /nchi 10/);
  assert.doesNotMatch(sw['index.50'], /nchi 6/);
  assert.match(sw['index.55'], /30,000 m³/);
  assert.doesNotMatch(sw['index.55'], /Dar es Salaam/);
  assert.doesNotMatch(sw['index.57'], /nchi 5/);
  assert.match(sw['about.4'], /2006/);
  assert.match(sw['about.4'], /nchi 10/);
  assert.match(sw['about.4'], /10,000/);
  assert.match(sw['about.4'], /10\+/);
  assert.match(sw['about.9'], /nchi 10/);
  assert.match(sw['about.10'], /10,000/);
  assert.match(sw['about.10'], /mataifa 10/);
  assert.equal(sw['about.24'], 'Maadili Yetu ya Msingi');
  assert.match(sw['dashboard.13'], /maudhui ya tovuti.*CMS/i);
  assert.equal(masterEnglish['gallery.7'], '39 Photos');
  assert.equal(extractedEnglish.gallery['gallery.7'], '39 Photos');
  assert.equal(dictionaries.en['gallery.7'], '39 Photos');
  assert.equal(sw['gallery.7'], 'Picha 39');
  assert.equal(dictionaries.ar['gallery.7'], '39 صورة');
});
