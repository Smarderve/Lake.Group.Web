#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function walk(d, acc = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) {
      if (['node_modules', '.git', 'scripts', 'docs', '_live_probe', '.agents'].includes(e.name)) continue;
      walk(p, acc);
    } else if (/\.(html|js)$/.test(e.name)) acc.push(p);
  }
  return acc;
}

let htmlFixed = 0;
for (const f of walk(ROOT)) {
  let s = fs.readFileSync(f, 'utf8');
  const o = s;
  // Broken: 30,000+/div>  (missing < before /div)
  s = s.replace(/\+\/div>/g, '+</div>');
  s = s.replace(/data-count=["']30,000["']/g, 'data-count="30000"');
  s = s.replace(/data-count=["']1,200["']/g, 'data-count="1200"');
  if (s !== o) {
    fs.writeFileSync(f, s);
    htmlFixed++;
    console.log('fixed', path.relative(ROOT, f));
  }
}
console.log('html files fixed', htmlFixed);

const jp = path.join(ROOT, 'assets', 'i18n-content.json');
const i18n = JSON.parse(fs.readFileSync(jp, 'utf8'));
let n = 0;

for (const lang of Object.keys(i18n)) {
  const pack = i18n[lang];
  for (const k of Object.keys(pack)) {
    if (typeof pack[k] !== 'string') continue;
    const b = pack[k];
    let v = pack[k];
    v = v.replace(/malori 700\b/g, 'malori 1,200');
    v = v.replace(/magari 700\b/g, 'magari 1,200');
    v = v.replace(/\b700 ट्रकों/g, '1,200 ट्रकों');
    v = v.replace(/\b700 ट्रक\b/g, '1,200 ट्रक');
    v = v.replace(/\b700 شاحنة\b/g, '١٬٢٠٠ شاحنة');
    v = v.replace(/plus de 152/g, '152');
    v = v.replace(/أكثر من ١٥٢/g, '١٥٢');
    v = v.replace(/أكثر من 152/g, '152');
    if (v !== b) {
      pack[k] = v;
      n++;
    }
  }
}

const leftovers = {
  sw: {
    'about.10':
      'Leo, Lake Group inasambaza bidhaa za petroli katika nchi 8, inamiliki maghala ya kuhifadhia kote kanda, inatengeneza vilainishi na zege tayari, na inaendesha msafara wa zaidi ya <strong>malori 1,200</strong>.',
    'about.11': 'malori 1,200',
    'ose.s3.title': 'hadi msafara wa<br><em>1,200+.</em>',
  },
  hi: {
    'about.10':
      'आज, लेक ग्रुप 8 देशों में पेट्रोलियम उत्पादों का वितरण करता है, पूरे क्षेत्र में भंडारण सुविधाओं का मालिक है, स्नेहक और रेडी-मिक्स कंक्रीट का निर्माण करता है, और <strong>1,200 ट्रकों</strong> से अधिक के बेड़े का संचालन करता है।',
    'about.11': '1,200 ट्रक',
    'ose.s3.title': '<br><em>1,200+ के बेड़े में।</em>',
  },
  ar: {
    'about.10':
      'واليوم، تقوم مجموعة ليك بتوزيع المنتجات البترولية في ٨ دول، وتمتلك مرافق تخزين في جميع أنحاء المنطقة، وتصنع مواد التشحيم والخرسانة الجاهزة، وتدير أسطولًا يضم أكثر من <strong>١٬٢٠٠ شاحنة</strong>.',
    'about.11': '١٬٢٠٠ شاحنة',
    'hero.sub':
      'إحدى تكتلات الطاقة والخدمات اللوجستية والبناء الأسرع نموًا في أفريقيا، وتعمل في ٨ دول وتضم أكثر من ٣٠٬٠٠٠ موظف وأكثر من ١٬٢٠٠ شاحنة على الطريق.',
    'chat.reply.truck':
      'تقوم ليك ترانس بتشغيل أسطول يضم أكثر من ١٬٢٠٠ شاحنة في جميع أنحاء الشرق ووسط أفريقيا لنقل السوائل السائبة والبضائع العامة.',
    'chat.reply.station':
      'تفضل بزيارة صفحة محدد موقع المحطات للعثور على أقرب محطة وقود ليك أويل. لدينا ١٥٢ محطة عبر تنزانيا والمنطقة.',
    'ose.s3.title': 'إلى أسطول مكون من<br><em>١٬٢٠٠+.</em>',
    'ose.s6.body':
      'كل مستودع، كل شاحنة، كل أسطوانة يديرها الناس. أكثر من ٣٠٬٠٠٠ منهم، من ٢١ جنسية، عبر ٨ دول. هذا هو الجزء الذي لا يمكن لأي جدول بيانات التقاطه.',
  },
  fr: {
    'chat.reply.station':
      'Consultez notre page Localisateur de stations pour trouver la station Lake Oil la plus proche. Nous avons 152 stations en Tanzanie et dans la région.',
  },
};

for (const [lang, keys] of Object.entries(leftovers)) {
  for (const [k, v] of Object.entries(keys)) {
    if (i18n[lang][k] !== v) {
      i18n[lang][k] = v;
      n++;
    }
  }
}

fs.writeFileSync(jp, JSON.stringify(i18n, null, 2));
fs.writeFileSync(
  path.join(ROOT, 'assets', 'i18n-content.js'),
  'window.__LAKE_I18N_CONTENT__ = ' + JSON.stringify(i18n) + ';\n'
);
console.log('i18n keys touched', n);

for (const lang of ['en', 'fr', 'sw', 'hi', 'ar']) {
  const hits = [];
  for (const [k, v] of Object.entries(i18n[lang])) {
    if (typeof v !== 'string') continue;
    if (/4,?600|4600|700\+|85\+|malori 700|\b700 trucks|\b700 camions|700 ट्रक|700 شاحنة/i.test(v)) {
      hits.push(k + ': ' + v.slice(0, 100));
    }
  }
  console.log(lang, 'residual', hits.length);
  hits.slice(0, 12).forEach((h) => console.log(' ', h));
}

// Verify about.html tags
const about = fs.readFileSync(path.join(ROOT, 'about.html'), 'utf8');
const m = about.match(/ose-stat-num[^>]*>[^<]{0,20}/g);
console.log('about ose-stat samples', m);

const idx = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const dc = idx.match(/data-count="[^"]+"/g);
console.log('index data-counts', dc && dc.filter((x) => /30000|1200|152|30,/.test(x)));
