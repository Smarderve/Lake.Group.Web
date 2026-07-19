#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const jp = path.join(ROOT, 'assets', 'i18n-content.json');
const i18n = JSON.parse(fs.readFileSync(jp, 'utf8'));

const KEY_FIXES = {
  en: {
    'fleet.4':
      'Over 1,200 purpose-built trucks operating 24/7 across East and Central Africa, the backbone of our logistics operations.',
    'index.23':
      '<strong>Our Footprint</strong>Eight countries served from Dar es Salaam by a fleet of 1,200+ trucks.',
    'index.25':
      '<strong>On the Ground</strong>152 stations in Tanzania, the Tanga LPG terminal and vessel bunkering at Dar es Salaam port.',
    'leadership.111':
      "His oversight today spans oil marketing, supply chain, downstream logistics and heavy industrial manufacturing across Tanzania, Kenya, Zambia, DRC, Burundi and Rwanda - with wider Group presence also in Ethiopia, Mozambique and Dubai (MERM). Under his chairmanship the Group has grown retail networks (152 stations), storage infrastructure, a 1,200+ truck fleet, LPG terminals, Lake Steel, ready-mix concrete and AFICD port-extension services.",
  },
  fr: {
    'fleet.4':
      "Plus de 1 200 camions spécialisés opérant 24 h/24 en Afrique de l'Est et centrale, l'épine dorsale de nos opérations logistiques.",
    'leadership.111':
      "Sa supervision couvre aujourd’hui le marketing pétrolier, la chaîne d’approvisionnement, la logistique aval et la fabrication industrielle lourde en Tanzanie, au Kenya, en Zambie, en RDC, au Burundi et au Rwanda - avec une présence plus large en Éthiopie, au Mozambique et à Dubaï (MERM). Sous sa présidence, le Groupe a développé les réseaux de stations (152 en Tanzanie), les infrastructures de stockage, une flotte de plus de 1 200 camions, des terminaux GPL, Lake Steel, le béton prêt à l’emploi et les services d’extension portuaire AFICD.",
  },
  sw: {
    'fleet.4':
      'Zaidi ya malori 1,200 yaliyojengwa kwa madhumuni maalum yanayofanya kazi saa 24/7 Afrika Mashariki na Kati, uti wa mgongo wa shughuli zetu za usafirishaji.',
    'fuel.9':
      '<span class="lg-check" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg></span>Vituo vya mafuta vya rejareja, 152 Tanzania na kanda nzima',
    'leadership.111':
      'Usimamizi wake leo unajumuisha uuzaji wa mafuta, minyororo ya ugavi, usafirishaji wa chini na utengenezaji mzito wa viwanda nchini Tanzania, Kenya, Zambia, DRC, Burundi na Rwanda - pamoja na uwepo mpana zaidi nchini Ethiopia, Msumbiji na Dubai (MERM). Chini ya uenyekiti wake Kundi limepanua mitandao ya vituo (vituo 152), miundombinu ya hifadhi, meli ya malori 1,200+, vituo vya LPG, Lake Steel, saruji tayari kuchanganywa na huduma za kupanua bandari za AFICD.',
  },
  hi: {
    'fleet.4':
      '1,200 से अधिक उद्देश्य-निर्मित ट्रक पूर्व और मध्य अफ्रीका में 24/7 परिचालन कर रहे हैं, जो हमारे लॉजिस्टिक परिचालन की रीढ़ हैं।',
    'leadership.111':
      'आज उनकी निगरानी तेल विपणन, आपूर्ति श्रृंखला, डाउनस्ट्रीम लॉजिस्टिक्स और भारी औद्योगिक विनिर्माण तक फैली है - तंज़ानिया, केन्या, ज़ाम्बिया, डीआरसी, बुरुंडी और रवांडा में - तथा व्यापक समूह उपस्थिति इथियोपिया, मोज़ाम्बिक और दुबई (MERM) में भी है। उनकी अध्यक्षता में समूह ने रिटेल नेटवर्क (152 स्टेशन), भंडारण अवसंरचना, 1,200+ ट्रक फ़्लीट, LPG टर्मिनल, लेक स्टील, रेडी-मिक्स कंक्रीट और AFICD पोर्ट-एक्सटेंशन सेवाएँ बढ़ाई हैं।',
  },
  ar: {
    'fleet.4':
      'أكثر من ١٬٢٠٠ شاحنة مصممة خصيصًا تعمل على مدار الساعة طوال أيام الأسبوع في شرق ووسط أفريقيا، وهي العمود الفقري لعملياتنا اللوجستية.',
    'index.23':
      '<strong>بصمة أعمالنا</strong>ثماني دول تُخدم من دار السلام بأسطول يضم أكثر من ١٬٢٠٠ شاحنة.',
    'index.25':
      '<strong>على الأرض</strong>١٥٢ محطة في تنزانيا، ومحطة تنغا لغاز البترول المسال، وتموين السفن في ميناء دار السلام.',
    'investors.34':
      'مرافق التخزين الخاصة، وأسطول الشاحنات (+١٬٢٠٠)، ومطحنة الدرفلة، ومصانع الخرسانة، ومستودعات المحاجر والحاويات، وقاعدة كبيرة من الأصول الثابتة.',
    'sustainability.19':
      'الاستثمار المستمر في الشاحنات الأحدث والموفرة للوقود، مما يقلل الانبعاثات لكل كيلومتر عبر أسطول مركباتنا الذي يزيد عن ١٬٢٠٠ مركبة مع تحسين موثوقية الخدمة.',
    'leadership.111':
      'تشمل رقابته اليوم تسويق النفط وسلسلة التوريد والخدمات اللوجستية النهائية والتصنيع الصناعي الثقيل عبر تنزانيا وكينيا وزامبيا وجمهورية الكونغو الديمقراطية وبوروندي ورواندا - مع حضور أوسع للمجموعة أيضًا في إثيوبيا وموزمبيق ودبي (MERM). وتحت رئاسته نمت شبكات التجزئة (١٥٢ محطة)، والبنية التحتية للتخزين، وأسطول شاحنات يزيد عن ١٬٢٠٠، ومحطات غاز البترول المسال، وليك ستيل، والخرسانة الجاهزة وخدمات توسعة موانئ AFICD.',
  },
};

let n = 0;
for (const [lang, keys] of Object.entries(KEY_FIXES)) {
  for (const [k, v] of Object.entries(keys)) {
    if (i18n[lang][k] !== v) {
      i18n[lang][k] = v;
      n++;
      console.log('fix', lang, k);
    }
  }
}

// Broad sweep: Eastern Arabic old stats still in ar pack
const ar = i18n.ar;
for (const k of Object.keys(ar)) {
  let v = ar[k];
  if (typeof v !== 'string') continue;
  const b = v;
  v = v.replace(/٤[\s٬,]?٦٠٠\+/g, '٣٠٬٠٠٠+');
  v = v.replace(/٤[\s٬,]?٦٠٠/g, '٣٠٬٠٠٠');
  v = v.replace(/٧٠٠\+/g, '١٬٢٠٠+');
  v = v.replace(/أكثر من ٧٠٠/g, 'أكثر من ١٬٢٠٠');
  v = v.replace(/يزيد عن ٧٠٠/g, 'يزيد عن ١٬٢٠٠');
  v = v.replace(/\+٧٠٠/g, '+١٬٢٠٠');
  v = v.replace(/٧٠٠ شاحنة/g, '١٬٢٠٠ شاحنة');
  v = v.replace(/٧٠٠ مركبة/g, '١٬٢٠٠ مركبة');
  v = v.replace(/٨٥\+/g, '١٥٢');
  v = v.replace(/أكثر من ٨٥/g, '١٥٢');
  v = v.replace(/٨٥ محطة/g, '١٥٢ محطة');
  // Western leftovers in ar
  v = v.replace(/700\+/g, '١٬٢٠٠+');
  v = v.replace(/\b700\b/g, (m, off, str) => {
    // skip years / CSS-like — only if nearby truck/fleet words in same string
    if (/شاحن|مركبة|أسطول|camion|truck|malori|flotte|fleet/i.test(str)) return '١٬٢٠٠';
    return m;
  });
  if (v !== b) {
    ar[k] = v;
    n++;
    console.log('ar sweep', k);
  }
}

// Broad sweep other langs for "Over 700" / "zaidi ya 85" / "(85 " station patterns
for (const lang of ['en', 'fr', 'sw', 'hi']) {
  const pack = i18n[lang];
  for (const k of Object.keys(pack)) {
    let v = pack[k];
    if (typeof v !== 'string') continue;
    const b = v;
    v = v.replace(/Over 700\b/gi, 'Over 1,200');
    v = v.replace(/Plus de 700\b/gi, 'Plus de 1 200');
    v = v.replace(/Zaidi ya 700\b/gi, 'Zaidi ya 1,200');
    v = v.replace(/700 से अधिक/g, '1,200 से अधिक');
    v = v.replace(/zaidi ya 85\b/gi, '152');
    v = v.replace(/\(85 en Tanzanie/gi, '(152 en Tanzanie');
    v = v.replace(/\(85 stations in Tanzania alone\)/gi, '(152 stations)');
    v = v.replace(/\(vituo 85 Tanzania pekee\)/gi, '(vituo 152)');
    v = v.replace(/\(केवल तंज़ानिया में 85 स्टेशन\)/g, '(152 स्टेशन)');
    v = v.replace(/\(+700\)/g, '(+1,200)');
    v = v.replace(/fleet \(700\)/gi, 'fleet (1,200)');
    if (v !== b) {
      pack[k] = v;
      n++;
      console.log(lang, 'sweep', k);
    }
  }
}

fs.writeFileSync(jp, JSON.stringify(i18n, null, 2));
fs.writeFileSync(
  path.join(ROOT, 'assets', 'i18n-content.js'),
  'window.__LAKE_I18N_CONTENT__ = ' + JSON.stringify(i18n) + ';\n'
);
console.log('total fixes', n);

// fleet.html HTML fallback
const fleetPath = path.join(ROOT, 'fleet.html');
let fleet = fs.readFileSync(fleetPath, 'utf8');
fleet = fleet.replace(
  /Over 700 purpose-built trucks/g,
  'Over 1,200 purpose-built trucks'
);
fleet = fleet.replace(/data-count="700"/g, 'data-count="1200"');
fs.writeFileSync(fleetPath, fleet);

// leadership ally page 85 stations
for (const f of [
  'leadership-ally-edha-awadh.html',
  'scripts/_lp_bodies/leadership-ally-edha-awadh.html.txt',
  'scripts/build_leadership_pages.js',
]) {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) continue;
  let s = fs.readFileSync(p, 'utf8');
  const o = s;
  s = s.replace(/85 stations in Tanzania alone/g, '152 stations');
  s = s.replace(/\(85 stations in Tanzania alone\)/g, '(152 stations)');
  s = s.replace(/retail networks \(85 stations[^)]*\)/g, 'retail networks (152 stations)');
  if (s !== o) {
    fs.writeFileSync(p, s);
    console.log('updated', f);
  }
}

// docs developer guide quick replace
const docs = path.join(ROOT, 'docs', 'developer-guide.html');
if (fs.existsSync(docs)) {
  let d = fs.readFileSync(docs, 'utf8');
  d = d.replace(/4,600\+/g, '30,000+');
  d = d.replace(/4,600/g, '30,000');
  d = d.replace(/700\+/g, '1,200+');
  d = d.replace(/85\+/g, '152');
  fs.writeFileSync(docs, d);
  console.log('updated developer-guide.html');
}

// Final residual scan (meaningful)
const patterns = [
  /4,?600/,
  /4600/,
  /700\+/,
  /85\+/,
  /Over 700/,
  /malori 700/,
  /٧٠٠/,
  /٨٥/,
  /٤٦٠٠/,
  /Khalid/,
  /Abdulrahman/,
];
for (const lang of ['en', 'fr', 'sw', 'hi', 'ar']) {
  const hits = [];
  for (const [k, v] of Object.entries(i18n[lang])) {
    if (typeof v !== 'string') continue;
    if (k === 'africa_network.85' || k === 'index.85' || k === 'leadership.85') continue;
    for (const p of patterns) {
      if (p.test(v)) {
        hits.push(k);
        break;
      }
    }
  }
  console.log(lang, 'residual keys', hits.length, hits.slice(0, 15));
}

require('child_process').execSync('node scripts/build_assistant_kb.js', {
  cwd: ROOT,
  stdio: 'inherit',
});
