/**
 * Repair MT-mangled brand/HTML placeholders in hi/ar packs and apply
 * curated chrome overrides. Regenerates i18n-content.json + .js.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const JSON_PATH = path.join(ROOT, 'assets', 'i18n-content.json');
const JS_PATH = path.join(ROOT, 'assets', 'i18n-content.js');

// Must match the protect-list used during MT (scripts/build_hi_ar_lang.js)
const PROTECT = [
  'Lake Oil Group', 'Lake Group', 'Lake Oil', 'Lake Aviation', 'Lake Gas',
  'Lake Lubes', 'Lake Buildings', 'Lake Plastics', 'Lake Steel', 'Lake Cylinders',
  'Lake Trans', 'Lake Agro', 'Lake Premix & Cement', 'Lake Premix and Cement',
  'Gulf Aggregates', 'Ocean Galleria', 'Cross Country', 'AFICD', 'AILL', 'ATL',
  'East Africa', 'Central Africa', 'Tanzania', 'Kenya', 'Uganda', 'Rwanda',
  'Burundi', 'DRC', 'Zambia', 'Malawi', 'Mozambique', 'South Sudan',
  'Dar es Salaam', 'Mwanza', 'Arusha', 'Dodoma', 'Nairobi', 'Kampala',
  'Ethiopia',
  'LPG', 'ISO', 'CSR', 'ESG', 'HSE', 'API', 'SMS', 'GPS', 'CEO', 'CFO', 'COO'
];

function protectHtmlAndBrands(str) {
  const tokens = [];
  let out = String(str);
  out = out.replace(/<\/?[a-zA-Z][^>]*>/g, (m) => {
    const i = tokens.length;
    tokens.push(m);
    return '[[T' + i + ']]';
  });
  const brands = PROTECT.slice().sort((a, b) => b.length - a.length);
  for (const brand of brands) {
    const re = new RegExp(brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    out = out.replace(re, (m) => {
      const i = tokens.length;
      tokens.push(m);
      return '[[T' + i + ']]';
    });
  }
  return { text: out, tokens };
}

function restoreMangled(translated, enSrc) {
  const { tokens } = protectHtmlAndBrands(enSrc);
  return String(translated).replace(/\[\[([^\]]+)\]\]/g, (full, inner) => {
    const n = String(inner).replace(/\D/g, '');
    if (n === '' || tokens[n] == null) return full;
    return tokens[n];
  });
}

const CURATED = {
  hi: {
    'nav.home': 'होम',
    'nav.about': 'हमारे बारे में',
    'nav.services': 'सेवाएँ ▾',
    'nav.companies': 'सहायक कंपनियाँ ▾',
    'nav.network': 'नेटवर्क ▾',
    'nav.company': 'कॉर्पोरेट ▾',
    'nav.news': 'समाचार',
    'nav.careers': 'करियर',
    'nav.contact': 'संपर्क करें',
    'nav.leadership': 'नेतृत्व',
    'nav.gallery': 'गैलरी',
    'nav.stations': 'स्टेशन लोकेटर',
    'nav.fleet': 'हमारा बेड़ा',
    'nav.history': 'हमारा इतिहास',
    'nav.investors': 'निवेशक संबंध',
    'nav.projects': 'प्रमुख परियोजनाएँ',
    'nav.csr': 'CSR और स्थिरता',
    'nav.africaMap': 'अफ़्रीका परिचालन मानचित्र',
    'nav.africaMapShort': 'अफ़्रीका मानचित्र',
    'nav.historyShort': 'इतिहास',
    'nav.csrShort': 'CSR',
    'nav.investorsShort': 'निवेशक',
    'nav.projectsShort': 'परियोजनाएँ',
    'nav.dd.energies': 'Lake Energies',
    'nav.dd.manufacturing': 'विनिर्माण',
    'nav.dd.logisticsCos': 'लॉजिस्टिक्स',
    'nav.dd.realEstate': 'रियल एस्टेट',
    'nav.dd.agro': 'कृषि प्रसंस्करण',
    'mob.companies': 'सहायक कंपनियाँ',
    'mob.network': 'नेटवर्क',
    'mob.company': 'कॉर्पोरेट',
    'mob.more': 'अधिक',
    'mob.language': 'भाषा',
    'footer.contact': 'संपर्क करें',
    'footer.services': 'सहायक कंपनियाँ',
    'footer.company': 'कॉर्पोरेट',
    'footer.contactHeading': 'संपर्क',
    'footer.rights': 'सर्वाधिकार सुरक्षित।',
    'footer.privacy': 'गोपनीयता',
    'footer.terms': 'शर्तें',
    'chat.title': 'Lake Group सहायक',
    'chat.sub': 'हमसे कुछ भी पूछें',
    'chat.hello': 'नमस्ते! आज मैं आपकी कैसे मदद कर सकता हूँ?',
    'chat.send': 'भेजें',
    'chat.placeholder': 'संदेश लिखें...',
    'hero.title': 'पूर्वी और <em>मध्य अफ़्रीका</em> को ऊर्जा प्रदान करना',
    'nav.lpg': 'LPG गैस'
  },
  ar: {
    'nav.home': 'الرئيسية',
    'nav.about': 'من نحن',
    'nav.services': 'الخدمات ▾',
    'nav.companies': 'الشركات التابعة ▾',
    'nav.network': 'الشبكة ▾',
    'nav.company': 'الشركة ▾',
    'nav.news': 'الأخبار',
    'nav.careers': 'الوظائف',
    'nav.contact': 'اتصل بنا',
    'nav.leadership': 'القيادة',
    'nav.gallery': 'المعرض',
    'nav.stations': 'محدد مواقع المحطات',
    'nav.fleet': 'أسطولنا',
    'nav.history': 'تاريخنا',
    'nav.investors': 'علاقات المستثمرين',
    'nav.projects': 'المشاريع الرئيسية',
    'nav.csr': 'المسؤولية الاجتماعية والاستدامة',
    'nav.africaMap': 'خريطة عمليات أفريقيا',
    'nav.africaMapShort': 'خريطة أفريقيا',
    'nav.historyShort': 'التاريخ',
    'nav.csrShort': 'CSR',
    'nav.investorsShort': 'المستثمرون',
    'nav.projectsShort': 'المشاريع',
    'nav.dd.energies': 'Lake Energies',
    'nav.dd.manufacturing': 'التصنيع',
    'nav.dd.logisticsCos': 'اللوجستيات',
    'nav.dd.realEstate': 'العقارات',
    'nav.dd.agro': 'التصنيع الزراعي',
    'mob.companies': 'الشركات التابعة',
    'mob.network': 'الشبكة',
    'mob.company': 'الشركة',
    'mob.more': 'المزيد',
    'mob.language': 'اللغة',
    'footer.contact': 'اتصل بنا',
    'footer.services': 'الشركات التابعة',
    'footer.company': 'الشركة',
    'footer.contactHeading': 'التواصل',
    'footer.rights': 'جميع الحقوق محفوظة.',
    'footer.privacy': 'الخصوصية',
    'footer.terms': 'الشروط',
    'chat.title': 'مساعد Lake Group',
    'chat.sub': 'اسألنا أي شيء',
    'chat.hello': 'مرحبًا! كيف يمكنني مساعدتك اليوم؟',
    'chat.send': 'إرسال',
    'chat.placeholder': 'اكتب رسالة...',
    'hero.title': 'نُمد شرق و<em>وسط أفريقيا</em> بالطاقة',
    'nav.lpg': 'غاز LPG'
  }
};

const BRAND_KEYS = [
  'nav.co.lakeOil', 'nav.co.lakeAviation', 'nav.co.lakeGas', 'nav.co.lakeLubes',
  'nav.co.lakeBuildings', 'nav.co.lakePlastics', 'nav.co.lakeSteel', 'nav.co.lakeCylinders',
  'nav.co.gulfAggregates', 'nav.co.atl', 'nav.co.lakePremixCement', 'nav.co.aficd',
  'nav.co.aill', 'nav.co.lakeTrans', 'nav.co.crossCountry', 'nav.co.oceanGalleria',
  'nav.co.lakeAgro', 'nav.steel'
];

function serializeCompact(dict) {
  const langs = Object.keys(dict).map((lang) => {
    const entries = Object.keys(dict[lang]).map(
      (k) => JSON.stringify(k) + ': ' + JSON.stringify(dict[lang][k])
    );
    return JSON.stringify(lang) + ': {' + entries.join(', ') + '}';
  });
  return '{' + langs.join(', ') + '}';
}

const content = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
let fixed = 0;

for (const lang of ['hi', 'ar']) {
  for (const key of Object.keys(content.en)) {
    const before = content[lang][key];
    let after = restoreMangled(before, content.en[key]);
    if (CURATED[lang][key]) after = CURATED[lang][key];
    if (BRAND_KEYS.includes(key)) after = content.en[key];
    if (after !== before) fixed += 1;
    content[lang][key] = after;
  }
}

let remaining = [];
for (const lang of ['hi', 'ar']) {
  for (const key of Object.keys(content[lang])) {
    if (/\[\[/.test(content[lang][key])) {
      remaining.push(lang + ':' + key + ' => ' + content[lang][key]);
    }
  }
}

fs.writeFileSync(JSON_PATH, JSON.stringify(content, null, 2), 'utf8');
fs.writeFileSync(JS_PATH, 'window.__LAKE_I18N_CONTENT__ = ' + serializeCompact(content) + ';\n', 'utf8');
console.log('Updated entries:', fixed);
console.log('Remaining mangled:', remaining.length);
if (remaining.length) remaining.slice(0, 20).forEach((x) => console.log(' ', x));
console.log('hi home:', content.hi['nav.home'], '| ar home:', content.ar['nav.home']);
console.log('hi eyebrow:', content.hi['hero.eyebrow']);
