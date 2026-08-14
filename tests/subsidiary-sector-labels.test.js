'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const KEYS = [
  'nav.dd.energies',
  'nav.dd.manufacturing',
  'nav.dd.logisticsCos',
  'nav.dd.realEstate',
  'nav.dd.agro',
];
const EXPECTED = {
  en: ['Energies Sector', 'Manufacturing Sector', 'Logistics Sector', 'Real Estate Sector', 'Agro Processing Sector'],
  fr: ['Secteur énergétique', 'Secteur manufacturier', 'Secteur logistique', 'Secteur immobilier', 'Secteur agroalimentaire'],
  sw: ['Sekta ya Nishati', 'Sekta ya Uzalishaji', 'Sekta ya Usafirishaji', 'Sekta ya Mali Isiyohamishika', 'Sekta ya Usindikaji wa Kilimo'],
  pt: ['Setor de Energia', 'Setor de Fabrico', 'Setor de Logística', 'Setor Imobiliário', 'Setor de Agroprocessamento'],
  es: ['Sector energético', 'Sector manufacturero', 'Sector logístico', 'Sector inmobiliario', 'Sector de procesamiento agrícola'],
  ar: ['قطاع الطاقة', 'قطاع التصنيع', 'قطاع الخدمات اللوجستية', 'قطاع العقارات', 'قطاع التصنيع الزراعي'],
};

const dictionary = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'i18n-content.json'), 'utf8'));
assert.deepEqual(Object.keys(dictionary), Object.keys(EXPECTED), 'test expectations must cover every supported language');
for (const [language, labels] of Object.entries(EXPECTED)) {
  assert.deepEqual(KEYS.map((key) => dictionary[language][key]), labels, `${language} sector labels`);
}
const browserBundle = fs.readFileSync(path.join(ROOT, 'assets', 'i18n-content.js'), 'utf8');
const bundledDictionary = JSON.parse(browserBundle.replace(/^window\.__LAKE_I18N_CONTENT__ = /, '').replace(/;\s*$/, ''));
assert.deepEqual(bundledDictionary, dictionary, 'browser i18n bundle must match its JSON source');

const templateLabels = EXPECTED.en;
for (const template of ['scripts/templates/nav.html', 'scripts/templates/mobile_nav.html']) {
  const html = fs.readFileSync(path.join(ROOT, template), 'utf8');
  for (let index = 0; index < KEYS.length; index += 1) {
    assert.match(
      html,
      new RegExp(`data-i18n="${KEYS[index].replace('.', '\\.')}"[^>]*>${templateLabels[index]}<`),
      `${template} must contain the English fallback for ${KEYS[index]}`,
    );
  }
}

for (const file of fs.readdirSync(ROOT).filter((name) => name.endsWith('.html'))) {
  const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
  if (!html.includes('data-i18n="nav.dd.energies"')) continue;
  for (let index = 0; index < KEYS.length; index += 1) {
    const keyPattern = `data-i18n="${KEYS[index].replace('.', '\\.')}"[^>]*>`;
    const keyedLabels = html.match(new RegExp(keyPattern, 'g')) || [];
    const expectedLabels = html.match(new RegExp(`${keyPattern}${templateLabels[index]}<`, 'g')) || [];
    assert.ok(keyedLabels.length >= 2, `${file} must include desktop and mobile navigation for ${KEYS[index]}`);
    assert.equal(expectedLabels.length, keyedLabels.length, `${file} must use the sector label everywhere for ${KEYS[index]}`);
  }
}

console.log('subsidiary sector labels: ok');
