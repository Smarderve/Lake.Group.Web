#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// --- hi/ar cache ---
const cachePath = path.join(ROOT, 'scripts', '_hi_ar_cache.json');
const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
const nameFix = {
  hi: {
    'leadership.17': { src: 'Dileep Kumar', dst: 'दिलीप कुमार' },
    'leadership.20': { src: 'Sridhar Mani', dst: 'श्रीधर मणि' },
    'leadership.23': { src: 'Mohammed Khalid', dst: 'मोहम्मद खालिद' },
    'leadership.26': { src: 'Bibhuti Singh', dst: 'बिभुति सिंह' },
  },
  ar: {
    'leadership.17': { src: 'Dileep Kumar', dst: 'ديليب كومار' },
    'leadership.20': { src: 'Sridhar Mani', dst: 'سريدار ماني' },
    'leadership.23': { src: 'Mohammed Khalid', dst: 'محمد خالد' },
    'leadership.26': { src: 'Bibhuti Singh', dst: 'بيبهوتي سينغ' },
  },
};
for (const lang of ['hi', 'ar']) {
  for (const [k, v] of Object.entries(nameFix[lang])) {
    cache[lang][k] = v;
  }
  for (const k of Object.keys(cache[lang] || {})) {
    const e = cache[lang][k];
    if (!e || typeof e.dst !== 'string') continue;
    let d = e.dst;
    if (lang === 'hi') {
      d = d
        .split('सिब्तियान अंसारी')
        .join('दिलीप कुमार')
        .split('विवेक चौधरी')
        .join('श्रीधर मणि')
        .split('भास्कर एस शेट्टी')
        .join('मोहम्मद खालिद')
        .split('पंकज कुमार')
        .join('बिभुति सिंह');
      if (/^leadership\.(117|123|129|137)$/.test(k)) {
        d = d
          .split('अंसारी')
          .join('दिलीप कुमार')
          .split('चौधरी')
          .join('मणि')
          .split('शेट्टी')
          .join('खालिद');
        if (k === 'leadership.137') {
          d = d.split('पंकज कुमार').join('बिभुति सिंह').split('कुमार का').join('सिंह का');
        }
      }
    } else {
      d = d
        .split('سبتيان الأنصاري')
        .join('ديليب كومار')
        .split('سبتيان أنصاري')
        .join('ديليب كومار')
        .split('فيفيك تشودري')
        .join('سريدار ماني')
        .split('باسكار س. شيتي')
        .join('محمد خالد')
        .split('بانكاج كومار')
        .join('بيبهوتي سينغ');
      if (/^leadership\.(117|123|129|137)$/.test(k)) {
        d = d
          .split('أنساري')
          .join('ديليب كومار')
          .split('تشودري')
          .join('ماني')
          .split('شودري')
          .join('ماني')
          .split('شيتي')
          .join('خالد');
        if (k === 'leadership.137') {
          d = d.split('بانكاج كومار').join('بيبهوتي سينغ').split('كومار').join('سينغ');
        }
      }
    }
    for (const [from, to] of [
      ['Ansari', lang === 'hi' ? 'दिलीप कुमार' : 'ديليب كومار'],
      ['Choudhary', lang === 'hi' ? 'मणि' : 'ماني'],
      ['Shetty', lang === 'hi' ? 'खालिद' : 'خالد'],
    ]) {
      d = d.split(from).join(to);
    }
    if (/^leadership\.(117|123|129|137)$/.test(k)) {
      d = d.split('Kumar').join(lang === 'hi' ? 'सिंह' : 'سينغ');
    }
    e.dst = d;

    if (typeof e.src === 'string') {
      let s = e.src;
      s = s
        .split('Sibtian Ansari')
        .join('Dileep Kumar')
        .split('Vivek Choudhary')
        .join('Sridhar Mani')
        .split('Bhaskar S. Shetty')
        .join('Mohammed Khalid')
        .split('Pankaj Kumar')
        .join('Bibhuti Singh');
      s = s.split("Ansari's").join("Dileep Kumar's").split('Ansari\u2019s').join('Dileep Kumar\u2019s');
      s = s.split("Choudhary's").join("Mani's").split('Choudhary\u2019s').join('Mani\u2019s');
      s = s.split("Shetty's").join("Khalid's").split('Shetty\u2019s').join('Khalid\u2019s');
      s = s.split("Kumar's").join("Singh's").split('Kumar\u2019s').join('Singh\u2019s');
      s = s.split('Ansari').join('Dileep Kumar').split('Choudhary').join('Mani').split('Shetty').join('Khalid');
      if (/^leadership\.(117|123|129|137)$/.test(k)) {
        s = s.replace(/\bKumar\b/g, 'Singh');
      }
      e.src = s;
    }
  }
}
fs.writeFileSync(cachePath, JSON.stringify(cache));
console.log('updated _hi_ar_cache.json');

// --- assistant KB ---
const kbPath = path.join(ROOT, 'assets', 'assistant-kb.js');
let kb = fs.readFileSync(kbPath, 'utf8');
const before = kb;
kb = kb
  .split('Jukumu la Choudhary')
  .join('Jukumu la Mani')
  .split('Sibtian Ansari')
  .join('Dileep Kumar')
  .split('Vivek Choudhary')
  .join('Sridhar Mani')
  .split('Bhaskar S. Shetty')
  .join('Mohammed Khalid')
  .split('Pankaj Kumar')
  .join('Bibhuti Singh')
  .split('leadership-sibtian-ansari.html')
  .join('leadership-dileep-kumar.html')
  .split('leadership-vivek-choudhary.html')
  .join('leadership-sridhar-mani.html')
  .split('leadership-bhaskar-shetty.html')
  .join('leadership-mohammed-khalid.html')
  .split('leadership-pankaj-kumar.html')
  .join('leadership-bibhuti-singh.html');
// residual Latin surnames in non-English KB snippets
kb = kb.split('Choudhary').join('Mani');
kb = kb.split('Ansari').join('Dileep Kumar');
kb = kb.split('Shetty').join('Khalid');
if (kb !== before) {
  fs.writeFileSync(kbPath, kb);
  console.log('patched assistant-kb.js');
} else {
  console.log('assistant-kb unchanged');
}

console.log('Choudhary in kb?', kb.includes('Choudhary'));
console.log('Sibtian in kb?', kb.includes('Sibtian'));
console.log('Bhaskar in kb?', kb.includes('Bhaskar'));
console.log('Pankaj in kb?', kb.includes('Pankaj'));

// verify cache names
for (const lang of ['hi', 'ar']) {
  for (const k of ['leadership.17', 'leadership.20', 'leadership.23', 'leadership.26']) {
    console.log(lang, k, JSON.stringify(cache[lang][k]));
  }
}
