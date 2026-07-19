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
      'Leads Group-wide operations across Lake Group’s energy, logistics and industrial units - coordinating day-to-day execution and operational performance.',
    'leadership.56':
      'Manages Lake Agro project delivery - greenfield development, agribusiness programmes and related Group project coordination.'
  },
  fr: {
    'leadership.53':
      'Dirige les opérations du Groupe dans les unités énergie, logistique et industrielles de Lake Group - coordination de l’exécution quotidienne et de la performance opérationnelle.',
    'leadership.56':
      'Gère la livraison des projets Lake Agro - développement greenfield, programmes agroalimentaires et coordination des projets du Groupe.'
  },
  sw: {
    'leadership.53':
      'Anaongoza uendeshaji wa Kundi katika vitengo vya nishati, usafirishaji na viwanda vya Lake Group - kuratibu utekelezaji wa kila siku na utendaji wa kioperesheni.',
    'leadership.56':
      'Anasimamia utoaji wa miradi ya Lake Agro - maendeleo ya greenfield, programu za kilimo biashara na uratibu wa miradi wa Kundi.'
  },
  hi: {
    'leadership.53':
      'Lake Group की ऊर्जा, लॉजिस्टिक्स और औद्योगिक इकाइयों में समूह-व्यापी संचालन का नेतृत्व - दिन-प्रतिदिन निष्पादन और परिचालन प्रदर्शन का समन्वय।',
    'leadership.56':
      'Lake Agro परियोजना डिलीवरी का प्रबंधन - ग्रीनफ़ील्ड विकास, कृषि-व्यवसाय कार्यक्रम और संबंधित समूह परियोजना समन्वय।'
  },
  ar: {
    'leadership.53':
      'يقود العمليات على مستوى المجموعة عبر وحدات الطاقة واللوجستيات والصناعة لدى Lake Group - بتنسيق التنفيذ اليومي والأداء التشغيلي.',
    'leadership.56':
      'يدير تسليم مشاريع Lake Agro - تطوير المشاريع الجديدة وبرامج الأعمال الزراعية وتنسيق المشاريع ذات الصلة بالمجموعة.'
  }
};

for (const lang of Object.keys(updates)) {
  Object.assign(data[lang], updates[lang]);
}
fs.writeFileSync(JSON_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');
const compact = JSON.stringify(data).replace(/":/g, '": ').replace(/,"/g, ', "');
fs.writeFileSync(JS_PATH, 'window.__LAKE_I18N_CONTENT__ = ' + compact + ';\n', 'utf8');
console.log('synced leadership.53 / .56');
