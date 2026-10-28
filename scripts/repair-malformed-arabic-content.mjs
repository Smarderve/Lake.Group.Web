import fs from 'node:fs';

const file = 'assets/i18n-content.json';
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const ar = data.ar;
for (const key of Object.keys(ar)) {
  if (typeof ar[key] !== 'string') continue;
  ar[key] = ar[key].replaceAll('@4@@', '</span>').replaceAll('@2@@', '<br>');
}
data.hi['agro.s1.p3'] = data.hi['agro.s1.p3'].replace('ہر سال <strong>$1 ٹریلین سے زیادہ کے مواقع کا اندازہ ہے، جس سے افریقہ میں بنے اعلیٰ قدر والے کھانے کے ساتھ غذائی درآمدات کے متبادل میں مدد مل رہی ہے۔', 'ہر سال <strong>$1 ٹریلین سے زیادہ کے مواقع کا اندازہ ہے</strong>، جس سے افریقہ میں بنے اعلیٰ قدر والے کھانے کے ساتھ غذائی درآمدات کے متبادل میں مدد مل رہی ہے۔');
data.hi['about.slide.show'] = data.hi['about.slide.show'].replace('{{संख्या}}', '{{number}}');
ar['about.badge'] = ar['about.badge'].replace('@1@@', 'Tanzania');
ar['agro.s3.yields'] = ar['agro.s3.yields'].replace('@1@@', '</strong>');
ar['leadership.130'] = ar['leadership.130'].replace('@1@@', 'Nairobi');
for (const key of ['fuel.11']) {
  ar[key] = ar[key].replace('@1@@', '<svg viewBox="0 0 24 24">');
}
fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
fs.writeFileSync('assets/i18n-content.js', `window.__LAKE_I18N_CONTENT__ = ${JSON.stringify(data)};\n`);
