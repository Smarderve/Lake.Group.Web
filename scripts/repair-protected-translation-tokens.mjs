import fs from 'node:fs';

const file = 'assets/i18n-content.json';
const content = JSON.parse(fs.readFileSync(file, 'utf8'));
const protectedTerms = ['Lake Oil Group', 'Lake Group', 'Lake Oil', 'Lake Aviation', 'Lake Gas', 'Lake Lubes', 'Lake Buildings', 'Lake Pipes', 'Lake Steel', 'Lake Cylinders', 'Lake Trans', 'Lake Agro', 'Lake Premix', 'Gulf Aggregates', 'Ocean Galleria', 'Cross Country', 'NexDrive Motors', 'AFICD', 'AILL', 'ATL', 'Tanzania', 'Kenya', 'Uganda', 'Rwanda', 'Burundi', 'DR Congo', 'Zambia', 'Malawi', 'Mozambique', 'South Sudan', 'Dar es Salaam', 'Mwanza', 'Arusha', 'Dodoma', 'Nairobi', 'Kampala', 'LPG', 'ISO', 'CSR', 'ESG', 'HSE', 'API', 'SMS', 'GPS', 'CEO', 'CFO', 'COO'];
const protectedPattern = new RegExp(protectedTerms.sort((a, b) => b.length - a.length).map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g');
const markers = /\[\[[^\]]+\]\]|@@\d+@@/g;
for (const locale of Object.keys(content)) {
  if (locale === 'en') continue;
  for (const [key, source] of Object.entries(content.en)) {
    const translation = content[locale][key];
    if (typeof translation !== 'string' || !markers.test(translation)) { markers.lastIndex = 0; continue; }
    markers.lastIndex = 0;
    const protectedValues = [...String(source).matchAll(protectedPattern)].map((match) => match[0]);
    let index = 0;
    content[locale][key] = translation.replace(markers, () => protectedValues[index++] || '');
  }
}
fs.writeFileSync(file, `${JSON.stringify(content, null, 2)}\n`);
fs.writeFileSync('assets/i18n-content.js', `window.__LAKE_I18N_CONTENT__ = ${JSON.stringify(content)};\n`);
