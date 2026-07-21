'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const JSON_PATH = path.join(ROOT, 'assets', 'i18n-content.json');
const JS_PATH = path.join(ROOT, 'assets', 'i18n-content.js');
const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));

const updates = {
  en: {
    'leadership.53':
      'Leads Group-wide operations across Lake Group’s energy, logistics and industrial units - coordinating day-to-day execution and operational performance.'
  },
  fr: {
    'leadership.53':
      'Dirige les opérations du Groupe dans les unités énergie, logistique et industrielles de Lake Group - coordination de l’exécution quotidienne et de la performance opérationnelle.'
  },
  sw: {
    'leadership.53':
      'Anaongoza uendeshaji wa Kundi katika vitengo vya nishati, usafirishaji na viwanda vya Lake Group - kuratibu utekelezaji wa kila siku na utendaji wa kioperesheni.'
  },
  hi: {
    'leadership.53':
      'Lake Group की ऊर्जा, लॉजिस्टिक्स और औद्योगिक इकाइयों में समूह-व्यापी संचालन का नेतृत्व - दिन-प्रतिदिन निष्पादन और परिचालन प्रदर्शन का समन्वय।'
  },
  ar: {
    'leadership.53':
      'يقود العمليات على مستوى المجموعة عبر وحدات الطاقة واللوجستيات والصناعة لدى Lake Group - بتنسيق التنفيذ اليومي والأداء التشغيلي.'
  }
};

for (const lang of Object.keys(updates)) {
  Object.assign(data[lang], updates[lang]);
}
fs.writeFileSync(JSON_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');
const compact = JSON.stringify(data).replace(/":/g, '": ').replace(/,"/g, ', "');
fs.writeFileSync(JS_PATH, 'window.__LAKE_I18N_CONTENT__ = ' + compact + ';\n', 'utf8');
console.log('synced leadership.53');
