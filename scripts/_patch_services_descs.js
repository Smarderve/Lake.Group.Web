#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const file = path.join(ROOT, 'services.html');
let raw = fs.readFileSync(file, 'utf8');

const pairs = [
  [
    "Tanzania's first HS-CR rebar producer. Fully automated rolling mill, 100,000 MT/year capacity.",
    'services.desc.lakeSteel',
    {
      en: "Tanzania's first HS-CR rebar producer. Fully automated rolling mill, 100,000 MT/year capacity.",
      sw: 'Mtengenezaji wa kwanza wa HS-CR rebar Tanzania. Kiwanda cha kusaga otomatiki, uwezo wa tani 100,000 kwa mwaka.',
      fr: 'Premier producteur de barres HS-CR en Tanzanie. Laminoir entièrement automatisé, capacité de 100 000 t/an.',
      hi: 'तंजानिया का पहला HS-CR रीबार उत्पादक। पूरी तरह स्वचालित रोलिंग मिल, 100,000 MT/वर्ष क्षमता।',
      ar: 'أول منتج لحديد التسليح HS-CR في تنزانيا. مطحنة درفلة آلية بالكامل، بطاقة 100,000 طن/سنة.',
    },
  ],
  [
    "Aggregate quarrying at Lugoba, supplying the construction industry and Lake Group's own concrete production.",
    'services.desc.gulfAggregates',
    {
      en: "Aggregate quarrying at Lugoba, supplying the construction industry and Lake Group's own concrete production.",
      sw: 'Uchimbaji wa aggregates Lugoba, ukitoa kwa sekta ya ujenzi na uzalishaji wa zege wa Lake Group.',
      fr: 'Carrière de granulats à Lugoba, alimentant le BTP et la production de béton du Lake Group.',
      hi: 'लुगोबा में एग्रीगेट खनन, निर्माण उद्योग और Lake Group के स्वयं के कंक्रीट उत्पादन की आपूर्ति।',
      ar: 'محاجر الركام في لوغوبا لتوريد قطاع البناء وإنتاج الخرسانة الخاص بمجموعة ليك.',
    },
  ],
  [
    "Dar es Salaam's leading ready-mix concrete supplier, established 2010.",
    'services.desc.lakePremix',
    {
      en: "Dar es Salaam's leading ready-mix concrete supplier, established 2010.",
      sw: 'Msambazaji mkuu wa zege ready-mix Dar es Salaam, iliyoanzishwa 2010.',
      fr: 'Principal fournisseur de béton prêt à l’emploi à Dar es Salaam, créé en 2010.',
      hi: 'दार एस सलाम का अग्रणी रेडी-मिक्स कंक्रीट आपूर्तिकर्ता, स्थापना 2010।',
      ar: 'المورد الرائد للخرسانة الجاهزة في دار السلام، تأسس عام 2010.',
    },
  ],
  [
    'African Inland Container Depot &mdash; inland container depot services across Tanzania, Zambia and Mozambique.',
    'services.desc.aficd',
    {
      en: 'African Inland Container Depot - inland container depot services across Tanzania, Zambia and Mozambique.',
      sw: 'African Inland Container Depot - huduma za depo ya kontena ndani Tanzania, Zambia na Mozambique.',
      fr: 'African Inland Container Depot - services de dépôt de conteneurs intérieur en Tanzanie, Zambie et Mozambique.',
      hi: 'African Inland Container Depot - तंजानिया, ज़ाम्बिया और मोज़ाम्बिक में अंतर्देशीय कंटेनर डिपो सेवाएँ।',
      ar: 'African Inland Container Depot - خدمات مستودع حاويات داخلي عبر تنزانيا وزامبيا وموزمبيق.',
    },
  ],
  [
    '700+ trucks for bulk liquid haulage and regional cross-border transport across East &amp; Central Africa.',
    'services.desc.lakeTrans',
    {
      en: '700+ trucks for bulk liquid haulage and regional cross-border transport across East & Central Africa.',
      sw: 'Magari 700+ ya kubeba maji/mafuta kwa wingi na usafirishaji wa kikanda Afrika Mashariki na Kati.',
      fr: 'Plus de 700 camions pour le transport de liquides en vrac et le fret transfrontalier en Afrique de l’Est et centrale.',
      hi: 'पूर्वी और मध्य अफ्रीका में थोक तरल ढुलाई और क्षेत्रीय सीमा-पार परिवहन के लिए 700+ ट्रक।',
      ar: 'أكثر من 700 شاحنة لنقل السوائل بالجملة والنقل عبر الحدود في شرق ووسط أفريقيا.',
    },
  ],
];

const visitKey = 'common.visitSite';
const visit = {
  en: 'Visit site',
  sw: 'Tembelea tovuti',
  fr: 'Visiter le site',
  hi: 'साइट देखें',
  ar: 'زيارة الموقع',
};

const jsonPath = path.join(ROOT, 'assets', 'i18n-content.json');
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
for (const [, key, tr] of pairs) {
  for (const lang of Object.keys(tr)) data[lang][key] = tr[lang];
}
for (const lang of Object.keys(visit)) data[lang][visitKey] = visit[lang];

fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
fs.writeFileSync(
  path.join(ROOT, 'assets', 'i18n-content.js'),
  'window.__LAKE_I18N_CONTENT__ = ' + JSON.stringify(data) + ';\n',
  'utf8'
);

for (const [text, key] of pairs) {
  const esc = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  raw = raw.replace(
    new RegExp('<p>' + esc + '</p>'),
    '<p data-i18n="' + key + '">' + text.replace(/&mdash;/g, ' - ').replace(/&amp;/g, '&') + '</p>'
  );
}
raw = raw.replace(/<span class="svc-link">Visit site<\/span>/g, '<span class="svc-link" data-i18n="common.visitSite">Visit site</span>');

fs.writeFileSync(file, raw, 'utf8');
console.log('services remaining descs + visit site patched');
