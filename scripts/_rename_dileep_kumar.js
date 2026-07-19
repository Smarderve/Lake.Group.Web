#!/usr/bin/env node
/**
 * One-shot: Dileep → Dileep Kumar (+ slug leadership-dileep-kumar.html).
 * Run: node scripts/_rename_dileep_kumar.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name === '.git') continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function transformText(s) {
  // URLs / filenames first
  s = s.split('leadership-dileep.html').join('leadership-dileep-kumar.html');
  s = s.split("id: 'dileep'").join("id: 'dileep-kumar'");
  s = s.split('"dileep"').join('"dileep-kumar"');
  s = s.split("'dileep'").join("'dileep-kumar'");
  s = s.split('dileep-kumar-kumar').join('dileep-kumar'); // safety

  // Localized full names (order: longer / possessive / phrase first)
  s = s.split('दिलीप का').join('दिलीप कुमार का');
  s = s.split('تفويض ديليب').join('تفويض ديليب كومار');
  s = s.split('mandat de Dileep').join('mandat de Dileep Kumar');
  s = s.split('jukumu la Dileep').join('jukumu la Dileep Kumar');
  s = s.split('la Dileep').join('la Dileep Kumar');

  // Possessives (curly + straight)
  s = s.split('Dileep\u2019s').join('Dileep Kumar\u2019s');
  s = s.split("Dileep's").join("Dileep Kumar's");

  // Display / Latin names — avoid double-applying
  s = s.replace(/Dileep Kumar Kumar/g, 'Dileep Kumar');
  s = s.replace(/\bDileep\b(?! Kumar)/g, 'Dileep Kumar');
  s = s.replace(/DILEEP(?! KUMAR)/g, 'DILEEP KUMAR');

  // Hindi / Arabic first-name-only → full (skip if already full)
  s = s.replace(/दिलीप(?! कुमार)/g, 'दिलीप कुमार');
  s = s.replace(/ديليب(?! كومار)/g, 'ديليب كومار');

  return s;
}

const REDIRECT_STUB = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0;url=leadership-dileep-kumar.html">
  <link rel="canonical" href="https://www.lakeoilgroup.com/leadership-dileep-kumar.html">
  <title>Redirecting…</title>
  <script>location.replace('leadership-dileep-kumar.html'+location.search+location.hash);</script>
</head>
<body>
  <p>This profile has moved to <a href="leadership-dileep-kumar.html">Dileep Kumar</a>.</p>
</body>
</html>
`;

const SKIP_EXT = new Set([
  '.png', '.jpg', '.jpeg', '.webp', '.gif', '.ico', '.svg',
  '.woff', '.woff2', '.ttf', '.eot', '.mp4', '.webm', '.pdf',
  '.zip', '.gz',
]);

const files = walk(ROOT).filter((p) => {
  const ext = path.extname(p).toLowerCase();
  if (SKIP_EXT.has(ext)) return false;
  // Don't rewrite this migration script's source while running (we rewrite after)
  if (path.basename(p) === '_rename_dileep_kumar.js') return false;
  return true;
});

let changed = 0;
for (const file of files) {
  let raw;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  if (!/Dileep|dileep|DILEEP|दिलीप|ديليب/.test(raw)) continue;
  const next = transformText(raw);
  if (next !== raw) {
    fs.writeFileSync(file, next, 'utf8');
    changed++;
    console.log('updated', path.relative(ROOT, file));
  }
}

// Rename profile page
const oldPage = path.join(ROOT, 'leadership-dileep.html');
const newPage = path.join(ROOT, 'leadership-dileep-kumar.html');
if (fs.existsSync(oldPage) && !fs.existsSync(newPage)) {
  // Content already rewritten in place; move file
  fs.renameSync(oldPage, newPage);
  console.log('renamed leadership-dileep.html → leadership-dileep-kumar.html');
} else if (fs.existsSync(oldPage) && fs.existsSync(newPage)) {
  // If both exist, prefer new and drop old content file
  fs.unlinkSync(oldPage);
  console.log('removed duplicate leadership-dileep.html');
}

// Redirect stubs
fs.writeFileSync(path.join(ROOT, 'leadership-dileep.html'), REDIRECT_STUB, 'utf8');
console.log('wrote redirect stub leadership-dileep.html');

const ansariStub = path.join(ROOT, 'leadership-sibtian-ansari.html');
if (fs.existsSync(ansariStub)) {
  fs.writeFileSync(ansariStub, REDIRECT_STUB, 'utf8');
  console.log('updated redirect stub leadership-sibtian-ansari.html');
}

// Rename lp body template
const oldBody = path.join(ROOT, 'scripts', '_lp_bodies', 'leadership-dileep.html.txt');
const newBody = path.join(ROOT, 'scripts', '_lp_bodies', 'leadership-dileep-kumar.html.txt');
if (fs.existsSync(oldBody) && !fs.existsSync(newBody)) {
  fs.renameSync(oldBody, newBody);
  console.log('renamed _lp_bodies/leadership-dileep.html.txt');
}

// Fix hi/ar cache name entry explicitly
const cachePath = path.join(ROOT, 'scripts', '_hi_ar_cache.json');
const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
if (cache.hi && cache.hi['leadership.17']) {
  cache.hi['leadership.17'] = { src: 'Dileep Kumar', dst: 'दिलीप कुमार' };
}
if (cache.ar && cache.ar['leadership.17']) {
  cache.ar['leadership.17'] = { src: 'Dileep Kumar', dst: 'ديليب كومار' };
}
fs.writeFileSync(cachePath, JSON.stringify(cache), 'utf8');
console.log('updated _hi_ar_cache.json leadership.17');

// Regenerate i18n-content.js from JSON
const jsonPath = path.join(ROOT, 'assets', 'i18n-content.json');
const jsPath = path.join(ROOT, 'assets', 'i18n-content.js');
const content = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
// Ensure name + bio keys
for (const lang of ['en', 'fr', 'sw']) {
  if (content[lang]) content[lang]['leadership.17'] = 'Dileep Kumar';
}
if (content.hi) content.hi['leadership.17'] = 'दिलीप कुमार';
if (content.ar) content.ar['leadership.17'] = 'ديليب كومار';

const bio = {
  en: "As Manufacturing CEO, Dileep Kumar’s mandate sits at the industrial heart of the Group’s diversification beyond petroleum. Lake Steel operates a computerized automatic rolling mill at Visiga, Kibaha (Plot 118, Block M), with throughput up to about 25 tonnes/hour and annual capacity around 100,000 MT - with publicly discussed expansion toward 150,000 MT.",
  fr: 'En tant que PDG Manufacturing, le mandat de Dileep Kumar se situe au cœur industriel de la diversification du Groupe au-delà du pétrole. Lake Steel exploite un laminoir automatique informatisé à Visiga, Kibaha (Plot 118, Block M), avec un débit jusqu’à environ 25 tonnes/heure et une capacité annuelle d’environ 100 000 TM - avec une expansion discutée publiquement vers 150 000 TM.',
  sw: 'Kama Mkurugenzi Mtendaji wa Utengenezaji, jukumu la Dileep Kumar liko katikati ya mseto wa viwanda wa Kundi zaidi ya petroli. Lake Steel inaendesha kiwanda cha rolling mill cha kiotomatiki chenye kompyuta huko Visiga, Kibaha (Plot 118, Block M), chenye uwezo wa hadi tani 25/saa na uwezo wa kila mwaka wa takriban MT 100,000 - na upanuzi unaozungumzwa hadharani kuelekea MT 150,000.',
  hi: 'विनिर्माण मुख्य कार्यकारी अधिकारी के रूप में, दिलीप कुमार का जनादेश पेट्रोलियम से परे समूह के विविधीकरण के औद्योगिक केंद्र में है। लेक स्टील Visiga, Kibaha (Plot 118, Block M) में कम्प्यूटरीकृत स्वचालित रोलिंग मिल संचालित करता है, जिसकी थ्रूपुट लगभग 25 टन/घंटा और वार्षिक क्षमता लगभग 100,000 MT है - सार्वजनिक रूप से चर्चा किए गए विस्तार के साथ 150,000 MT की ओर।',
  ar: 'بصفته الرئيس التنفيذي للتصنيع، يقع تفويض ديليب كومار في قلب التنويع الصناعي للمجموعة خارج النفط. وتشغّل ليك ستيل مطحنة درفلة آلية محوسبة في فيسيغا، كيباهة (القطعة ١١٨، البلوك M)، بطاقة إنتاج تصل إلى نحو ٢٥ طناً/ساعة وطاقة سنوية حوالي ١٠٠,٠٠٠ طن متري - مع توسع مناقش علناً نحو ١٥٠,٠٠٠ طن متري.',
};
for (const [lang, text] of Object.entries(bio)) {
  if (content[lang]) content[lang]['leadership.117'] = text;
}

fs.writeFileSync(jsonPath, JSON.stringify(content, null, 2), 'utf8');
fs.writeFileSync(jsPath, 'window.__LAKE_I18N_CONTENT__ = ' + JSON.stringify(content) + ';\n', 'utf8');
console.log('regenerated i18n-content.json/.js');

// master_en
const masterPath = path.join(ROOT, 'scripts', '_master_en.json');
const master = JSON.parse(fs.readFileSync(masterPath, 'utf8'));
master['leadership.17'] = 'Dileep Kumar';
if (master['leadership.117']) master['leadership.117'] = bio.en;
fs.writeFileSync(masterPath, JSON.stringify(master, null, 2) + '\n', 'utf8');
console.log('updated _master_en.json');

console.log('done. files touched via walk:', changed);
