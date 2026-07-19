#!/usr/bin/env node
/**
 * Localize leftover Latin place names in ar/hi (and light fr/sw) i18n strings,
 * regenerate i18n-content.js, and report residual Latin geography tokens.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const JSON_PATH = path.join(ROOT, 'assets', 'i18n-content.json');
const JS_PATH = path.join(ROOT, 'assets', 'i18n-content.js');

const AR_PLACES = [
  ['East and Central Africa', 'شرق ووسط أفريقيا'],
  ['East & Central Africa', 'شرق ووسط أفريقيا'],
  ['East &amp; Central Africa', 'شرق ووسط أفريقيا'],
  ['Central Africa', 'وسط أفريقيا'],
  ['East Africa', 'شرق أفريقيا'],
  ['Sub-Saharan Africa', 'أفريقيا جنوب الصحراء'],
  ['Dar es Salaam', 'دار السلام'],
  ['Democratic Republic of Congo', 'جمهورية الكونغو الديمقراطية'],
  ['DR Congo', 'جمهورية الكونغو الديمقراطية'],
  ['DRC', 'الكونغو الديمقراطية'],
  ['Mozambique', 'موزمبيق'],
  ['Tanzania', 'تنزانيا'],
  ['Kenya', 'كينيا'],
  ['Zambia', 'زامبيا'],
  ['Rwanda', 'رواندا'],
  ['Burundi', 'بوروندي'],
  ['Ethiopia', 'إثيوبيا'],
  ['Tanga', 'تنغا'],
  ['Dubai', 'دبي'],
  ['UAE', 'الإمارات'],
  ['United Arab Emirates', 'الإمارات العربية المتحدة'],
  ['Middle East', 'الشرق الأوسط'],
  ['Africa', 'أفريقيا'],
  ['Mikocheni Light Industrial Area', 'منطقة ميكوتشيني الصناعية الخفيفة'],
  ['Mikocheni Light Industrial', 'منطقة ميكوتشيني الصناعية الخفيفة'],
  ['Mikocheni', 'ميكوتشيني'],
  ['Arusha', 'أروشا'],
  ['Mwanza', 'موانزا'],
  ['Kigamboni', 'كيغامبوني'],
  ['Lugoba', 'لوغوبا'],
  ['Beira', 'بيرا'],
  ['Mbeya', 'مبيا'],
  ['Serenje', 'سيرينجي'],
  ['Kipawa', 'كيباوا'],
  ['Nyerere Road', 'طريق نيريري'],
  ['Julius Nyerere Airport', 'مطار جوليوس نيريري'],
  ['EST.', 'تأسست'],
  ['Est.', 'تأسست']
];

const HI_PLACES = [
  ['East and Central Africa', 'पूर्वी और मध्य अफ्रीका'],
  ['East & Central Africa', 'पूर्वी और मध्य अफ्रीका'],
  ['East &amp; Central Africa', 'पूर्वी और मध्य अफ्रीका'],
  ['Central Africa', 'मध्य अफ्रीका'],
  ['East Africa', 'पूर्वी अफ्रीका'],
  ['Sub-Saharan Africa', 'उप-सहारा अफ्रीका'],
  ['Dar es Salaam', 'दार एस सलाम'],
  ['Democratic Republic of Congo', 'कांगो लोकतांत्रिक गणराज्य'],
  ['DR Congo', 'डीआर कांगो'],
  ['DRC', 'डीआरसी'],
  ['Mozambique', 'मोज़ाम्बिक'],
  ['Tanzania', 'तंजानिया'],
  ['Kenya', 'केन्या'],
  ['Zambia', 'जाम्बिया'],
  ['Rwanda', 'रवांडा'],
  ['Burundi', 'बुरुंडी'],
  ['Ethiopia', 'इथियोपिया'],
  ['Tanga', 'तांगा'],
  ['Dubai', 'दुबई'],
  ['UAE', 'यूएई'],
  ['United Arab Emirates', 'संयुक्त अरब अमीरात'],
  ['Middle East', 'मध्य पूर्व'],
  ['Africa', 'अफ्रीका'],
  ['Mikocheni Light Industrial Area', 'मिकोचेनी लाइट इंडस्ट्रियल एरिया'],
  ['Mikocheni Light Industrial', 'मिकोचेनी लाइट इंडस्ट्रियल'],
  ['Mikocheni', 'मिकोचेनी'],
  ['Arusha', 'अरुशा'],
  ['Mwanza', 'म्वान्ज़ा'],
  ['Kigamboni', 'किगाम्बोनी'],
  ['Lugoba', 'लुगोबा'],
  ['Beira', 'बेइरा'],
  ['Mbeya', 'म्बेया'],
  ['Serenje', 'सेरेन्जे'],
  ['Kipawa', 'किपावा'],
  ['ईएसटी।', 'स्थापना'],
  ['EST.', 'स्थापना'],
  ['Est.', 'स्थापना']
];

const FR_PLACES = [
  ['Dar es Salaam', 'Dar es Salaam'], // keep common FR form; ensure Tanzania→Tanzanie already often done
  ['Central Africa', "Afrique centrale"],
  ['East Africa', "Afrique de l'Est"],
  ['East and Central Africa', "Afrique de l'Est et centrale"],
  ['Tanzania', 'Tanzanie'],
  ['Mozambique', 'Mozambique'],
  ['Ethiopia', 'Éthiopie'],
  ['Zambia', 'Zambie'],
  ['Kenya', 'Kenya'],
  ['Rwanda', 'Rwanda'],
  ['Burundi', 'Burundi'],
  ['DR Congo', 'RD Congo'],
  ['DRC', 'RDC']
];

const SW_PLACES = [
  ['Central Africa', 'Afrika ya Kati'],
  ['East Africa', 'Afrika Mashariki'],
  ['East and Central Africa', 'Afrika Mashariki na Kati'],
  ['Mozambique', 'Msumbiji'],
  ['Ethiopia', 'Ethiopia'],
  ['DR Congo', 'DR Congo'],
  ['DRC', 'DRC']
];

function applyMap(text, pairs) {
  if (typeof text !== 'string') return text;
  let out = text;
  for (const [from, to] of pairs) {
    if (!from || from === to) continue;
    // word-ish replace; keep brand names like Lake Oil untouched (not in map)
    out = out.split(from).join(to);
  }
  return out;
}

function localizePack(pack, pairs) {
  const changed = [];
  for (const key of Object.keys(pack)) {
    const before = pack[key];
    if (typeof before !== 'string') continue;
    const after = applyMap(before, pairs);
    if (after !== before) {
      pack[key] = after;
      changed.push(key);
    }
  }
  return changed;
}

// Manual high-visibility key overrides (screenshot surfaces)
const MANUAL = {
  ar: {
    'hero.eyebrow': 'تأسست ٢٠٠٦ · دار السلام، تنزانيا',
    'ose.s1.eyebrow': 'دار السلام، تنزانيا',
    'footer.address': 'قطعة ٤٩، منطقة ميكوتشيني الصناعية الخفيفة، دار السلام',
    'index.33':
      'تأسست مجموعة ليك عام ٢٠٠٦ من منفذ وقود واحد في دار السلام، ونمت لتصبح واحدة من أكبر تكتلات الطاقة والخدمات اللوجستية والصناعة في شرق ووسط أفريقيا.',
    'about.4':
      'إحدى أسرع تكتلات تجارة الطاقة والنقل نموًا في شرق ووسط أفريقيا، تأسست عام ٢٠٠٦.',
    'about.7':
      'تأسست مجموعة ليك عام ٢٠٠٦ مع افتتاح شركتها الرائدة ليك أويل: بداية متواضعة في دار السلام، تنزانيا.',
    'index.20':
      'من مقرنا الرئيسي في دار السلام، تعمل مجموعة ليك في ثماني دول — تنزانيا، كينيا، زامبيا، رواندا، بوروندي، جمهورية الكونغو الديمقراطية، إثيوبيا وموزمبيق — مع مركز في دبي يوسّع الشبكة إلى الأسواق العالمية.',
    'index.23':
      '<strong>بصمة أعمالنا</strong>ثماني دول تُخدم من دار السلام بأسطول يضم أكثر من ٧٠٠ شاحنة.',
    'index.25':
      '<strong>على الأرض</strong>أكثر من ٨٥ محطة في تنزانيا، ومحطة تنغا لغاز البترول المسال، وتموين السفن في ميناء دار السلام.',
    'index.35':
      'اليوم، مع <strong>أكثر من 4600 موظف</strong> عبر 21 جنسية، وأكثر من 700 شاحنة، وأكثر من 85 محطة وقود وأكثر من 20 شركة فرعية، تعمل مجموعة ليك على تشغيل الحياة اليومية عبر تنزانيا، كينيا، زامبيا، رواندا، بوروندي، جمهورية الكونغو الديمقراطية، إثيوبيا وموزمبيق.',
    'index.36': 'أكثر من 4600 موظف',
    'about.badge': 'تأسست في<br />تنزانيا',
    'about.badge.num': '2006'
  },
  hi: {
    'hero.eyebrow': 'स्थापना २००६ · दार एस सलाम, तंजानिया',
    'ose.s1.eyebrow': 'दार एस सलाम, तंजानिया',
    'footer.address': 'प्लॉट ४९, मिकोचेनी लाइट इंडस्ट्रियल, दार एस सलाम',
    'index.33':
      '२००६ में दार एस सलाम के एक ईंधन आउटलेट से स्थापित, लेक ग्रुप पूर्वी और मध्य अफ्रीका के सबसे बड़े ऊर्जा, लॉजिस्टिक्स और औद्योगिक समूहों में से एक बन गया है।',
    'about.4':
      'पूर्वी और मध्य अफ्रीका के सबसे तेजी से बढ़ते ऊर्जा व्यापार और परिवहन समूहों में से एक, स्थापना २००६।',
    'about.7':
      'लेक ग्रुप की स्थापना २००६ में अपनी प्रमुख कंपनी लेक ऑयल के उद्घाटन के साथ हुई: दार एस सलाम, तंजानिया में एक विनम्र शुरुआत।',
    'index.20':
      'दार एस सलाम में हमारे मुख्यालय से, लेक ग्रुप आठ देशों में संचालित होता है — तंजानिया, केन्या, जाम्बिया, रवांडा, बुरुंडी, डीआर कांगो, इथियोपिया और मोज़ाम्बिक — दुबई हब के साथ नेटवर्क को वैश्विक बाजारों तक विस्तारित करता है।',
    'index.23':
      '<strong>हमारे पदचिह्न</strong>आठ देशों को ७००+ ट्रकों के बेड़े द्वारा दार एस सलाम से सेवा दी जाती है।',
    'index.25':
      '<strong>जमीन पर</strong>तंजानिया में ८५+ स्टेशन, तांगा LPG टर्मिनल और दार एस सलाम बंदरगाह पर पोत बंकरिंग।',
    'index.35':
      'आज, <strong>4,600+ कर्मचारियों</strong> के साथ 21 राष्ट्रीयताओं में, 700+ ट्रक, 85+ ईंधन स्टेशन और 20+ सहायक कंपनियाँ — लेक ग्रुप तंजानिया, केन्या, जाम्बिया, रवांडा, बुरुंडी, डीआर कांगो, इथियोपिया और मोज़ाम्बिक में रोज़मर्रा की ज़िंदगी को शक्ति देता है।',
    'index.36': '4,600+ कर्मचारी',
    'about.badge': 'स्थापना<br />तंजानिया',
    'about.badge.num': '2006'
  },
  en: {
    'about.badge': 'Founded in<br />Tanzania',
    'about.badge.num': '2006'
  },
  fr: {
    'about.badge': 'Fondé en<br />Tanzanie',
    'about.badge.num': '2006',
    'hero.eyebrow': 'Fondé en 2006 · Dar es Salaam, Tanzanie',
    'ose.s1.eyebrow': 'Dar es Salaam, Tanzanie'
  },
  sw: {
    'about.badge': 'Ilianzishwa<br />Tanzania',
    'about.badge.num': '2006',
    'hero.eyebrow': 'Ilianzishwa 2006 · Dar es Salaam, Tanzania',
    'ose.s1.eyebrow': 'Dar es Salaam, Tanzania'
  }
};

const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));

const report = {};
report.ar = localizePack(data.ar, AR_PLACES);
report.hi = localizePack(data.hi, HI_PLACES);
report.fr = localizePack(data.fr, FR_PLACES);
report.sw = localizePack(data.sw, SW_PLACES);

for (const lang of Object.keys(MANUAL)) {
  data[lang] = data[lang] || {};
  for (const [k, v] of Object.entries(MANUAL[lang])) {
    data[lang][k] = v;
  }
}

// Re-apply place maps after manuals for keys that still mix Latin
localizePack(data.ar, AR_PLACES);
localizePack(data.hi, HI_PLACES);

fs.writeFileSync(JSON_PATH, JSON.stringify(data, null, 2) + '\n');
fs.writeFileSync(JS_PATH, 'window.__LAKE_I18N_CONTENT__ = ' + JSON.stringify(data) + ';\n');

const residualRe =
  /\b(Dar es Salaam|Tanzania|Kenya|Zambia|Rwanda|Burundi|Ethiopia|Mozambique|Central Africa|East Africa|Tanga|DRC|DR Congo)\b/g;
const residual = { ar: [], hi: [] };
for (const lang of ['ar', 'hi']) {
  for (const [k, v] of Object.entries(data[lang] || {})) {
    if (typeof v !== 'string') continue;
    if (residualRe.test(v)) residual[lang].push(k);
    residualRe.lastIndex = 0;
  }
}

console.log('Changed keys ar', report.ar.length, 'hi', report.hi.length, 'fr', report.fr.length, 'sw', report.sw.length);
console.log('Residual Latin geography ar', residual.ar.length, residual.ar.slice(0, 40).join(', '));
console.log('Residual Latin geography hi', residual.hi.length, residual.hi.slice(0, 40).join(', '));
console.log('Wrote', JSON_PATH, 'and', JS_PATH);
