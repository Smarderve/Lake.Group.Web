#!/usr/bin/env node
/**
 * Site-wide: update company stats, remove ex-employees, fix gallery CTA,
 * regenerate i18n-content.js + assistant-kb.js, bump relevant caches.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CACHE = 51;

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.git' || e.name === '_live_probe') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

function rewriteStats(text) {
  let s = text;
  // Employees (various separators / languages)
  s = s.replace(/4[\s,]?600\+/g, '30,000+');
  s = s.replace(/4[\s,]?600/g, '30,000');
  s = s.replace(/٤[\s٬,]?٦٠٠\+/g, '٣٠٬٠٠٠+');
  s = s.replace(/٤[\s٬,]?٦٠٠/g, '٣٠٬٠٠٠');
  s = s.replace(/data-count=["']4600["']/g, 'data-count="30000"');

  // Trucks / fleet — avoid font-weight:700 and product codes via word-ish contexts
  s = s.replace(/700\+/g, '1,200+');
  s = s.replace(/٧٠٠\+/g, '١٬٢٠٠+');
  // "700 trucks/camions/malori/ट्रक/شاحنة" etc. and "more than 700" / "plus de 700" / "zaidi ya … 700"
  s = s.replace(/\b700(\s+)(trucks?|truck|camions?|camion|malori|vehicles?|vehicle|magari|ट्रक|ट्रकों|شاحنة|شاحنات)\b/gi, '1,200$1$2');
  s = s.replace(/\b(more than|plus de|zaidi ya|أكثر من|plus de)\s+700\b/gi, '$1 1,200');
  s = s.replace(/fleet of more than 700\b/gi, 'fleet of more than 1,200');
  s = s.replace(/flotte de plus de 700\b/gi, 'flotte de plus de 1,200');
  s = s.replace(/zaidi ya malori 700\b/gi, 'zaidi ya malori 1,200');
  s = s.replace(/أكثر من 700\b/g, 'أكثر من 1,200');
  s = s.replace(/أكثر من ٧٠٠\b/g, 'أكثر من ١٬٢٠٠');
  s = s.replace(/truck fleet \(700\+\)/gi, 'truck fleet (1,200+)');
  s = s.replace(/msafara wa malori \(700\+\)/gi, 'msafara wa malori (1,200+)');
  s = s.replace(/\(700\+\)/g, '(1,200+)');
  s = s.replace(/data-count=["']700["']/g, 'data-count="1200"');
  // Hindi Devanagari if present
  s = s.replace(/७००\+/g, '१,२००+');

  // Stations: 85+ → 152 (no plus). Also "85 stations" retail context.
  s = s.replace(/85\+/g, '152');
  s = s.replace(/٨٥\+/g, '١٥٢');
  s = s.replace(/\b85(\s+)(stations?|station|stations-service|vituo|स्टेशन|محطة|محطات)\b/gi, '152$1$2');
  s = s.replace(/vituo 85\b/gi, 'vituo 152');
  s = s.replace(/أكثر من 85\b/g, '152');
  s = s.replace(/أكثر من ٨٥\b/g, '١٥٢');
  s = s.replace(/data-count=["']85["'](\s+)data-suffix=["']\+["']/g, 'data-count="152"');
  s = s.replace(/data-count=["']85["']/g, 'data-count="152"');
  // Display text that still says 85+ after partials
  s = s.replace(/>85\+</g, '>152<');
  s = s.replace(/>85\+<\/div>/g, '>152</div>');
  s = s.replace(/>85\+<\/span>/g, '>152</span>');

  // French spaced thousands leftover from first pass (4 600 already → 30,000)
  s = s.replace(/30,000\+/g, (m, offset, str) => {
    // Keep comma form; French copy often prefers "30 000+" — handled in lang-specific below
    return m;
  });

  return s;
}

function rewriteFrenchSpaces(text) {
  // Prefer French thin-space style for fr pack values only
  return text
    .replace(/30,000\+/g, '30 000+')
    .replace(/30,000/g, '30 000')
    .replace(/1,200\+/g, '1 200+')
    .replace(/1,200/g, '1 200');
}

function rewriteArabicEastern(text) {
  // Bake Eastern digits into ar strings for the key metrics
  return text
    .replace(/30,000\+/g, '٣٠٬٠٠٠+')
    .replace(/30,000/g, '٣٠٬٠٠٠')
    .replace(/1,200\+/g, '١٬٢٠٠+')
    .replace(/1,200/g, '١٬٢٠٠')
    .replace(/\b152\b/g, '١٥٢')
    .replace(/أكثر من 4600/g, 'أكثر من ٣٠٬٠٠٠')
    .replace(/أكثر من 700/g, 'أكثر من ١٬٢٠٠')
    .replace(/أكثر من 85/g, '١٥٢');
}

function rewriteHindiDigits(text) {
  return text
    .replace(/30,000\+/g, '30,000+')
    .replace(/1,200\+/g, '1,200+');
}

const stats = { files: 0, replacements: 0, peopleRemoved: [] };

// ---- 1) i18n-content.json ----
const jsonPath = path.join(ROOT, 'assets', 'i18n-content.json');
const i18n = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

for (const lang of Object.keys(i18n)) {
  const pack = i18n[lang];
  for (const key of Object.keys(pack)) {
    let v = pack[key];
    if (typeof v !== 'string') continue;
    const before = v;
    v = rewriteStats(v);
    if (lang === 'fr') v = rewriteFrenchSpaces(v);
    if (lang === 'ar') v = rewriteArabicEastern(v);
    if (lang === 'hi') v = rewriteHindiDigits(v);
    // Remove MD: Abdulrahman mentions if any remain
    v = v.replace(/\s*MD:\s*Abdulrahman Mohamed\.?/gi, '');
    v = v.replace(/\s*DG\s*:\s*Abdulrahman Mohamed\.?/gi, '');
    v = v.replace(/Abdulrahman Mohamed/gi, '');
    v = v.replace(/Khalid Mohamed/gi, '');
    if (v !== before) {
      pack[key] = v;
      stats.replacements++;
    }
  }
}

// Gallery Instagram CTA — full-sentence key (replace gallery.56 meaning)
const galleryCta = {
  en: 'Follow <a href="https://www.instagram.com/lakeoilltd/" target="_blank" rel="noopener">@lakeoilltd</a> on Instagram for the latest updates from the field.',
  fr: 'Suivez <a href="https://www.instagram.com/lakeoilltd/" target="_blank" rel="noopener">@lakeoilltd</a> sur Instagram pour les dernières actualités du terrain.',
  sw: 'Fuata <a href="https://www.instagram.com/lakeoilltd/" target="_blank" rel="noopener">@lakeoilltd</a> kwenye Instagram kwa taarifa za hivi karibuni kutoka uwandani.',
  hi: 'मैदान से नवीनतम अपडेट के लिए इंस्टाग्राम पर <a href="https://www.instagram.com/lakeoilltd/" target="_blank" rel="noopener">@lakeoilltd</a> को फ़ॉलो करें।',
  ar: 'تابعوا <a href="https://www.instagram.com/lakeoilltd/" target="_blank" rel="noopener">@lakeoilltd</a> على إنستغرام لآخر التحديثات من الميدان.',
};
for (const lang of Object.keys(galleryCta)) {
  if (i18n[lang]) {
    i18n[lang]['gallery.56'] = galleryCta[lang];
    stats.replacements++;
  }
}

fs.writeFileSync(jsonPath, JSON.stringify(i18n, null, 2));
console.log('Updated i18n-content.json');

// ---- 2) regenerate i18n-content.js ----
const jsPath = path.join(ROOT, 'assets', 'i18n-content.js');
fs.writeFileSync(
  jsPath,
  'window.__LAKE_I18N_CONTENT__ = ' + JSON.stringify(i18n) + ';\n'
);
console.log('Regenerated i18n-content.js');

// ---- 3) HTML / JS / MD site files (not scripts archives / docs dumps) ----
const SKIP_DIRS = new Set(['scripts', 'docs', 'node_modules', '.git', '_live_probe', '.agents']);
const TARGET_EXT = new Set(['.html', '.js', '.md', '.json', '.txt']);

function shouldTouch(filePath) {
  const rel = path.relative(ROOT, filePath).replace(/\\/g, '/');
  const parts = rel.split('/');
  if (SKIP_DIRS.has(parts[0])) {
    // Allow specific script sources of truth
    if (
      rel === 'scripts/_verified_lake_facts.md' ||
      rel === 'scripts/build_assistant_kb.js' ||
      rel === 'scripts/build_leadership_pages.js' ||
      rel.startsWith('scripts/_lp_bodies/') ||
      rel === 'scripts/_master_en.json'
    ) {
      return true;
    }
    return false;
  }
  const ext = path.extname(filePath);
  if (!TARGET_EXT.has(ext)) return false;
  // Skip bak / vendor
  if (rel.includes('/vendor/') || rel.endsWith('.bak')) return false;
  if (rel === 'assets/i18n-content.json' || rel === 'assets/i18n-content.js') return false;
  return true;
}

const allFiles = walk(ROOT).filter(shouldTouch);

for (const file of allFiles) {
  let s = fs.readFileSync(file, 'utf8');
  const original = s;
  s = rewriteStats(s);

  // French-style only for French-named artifacts — skip general HTML (en fallback)
  // Arabic Eastern bake for about/ose hardcoded if any Arabic in HTML — rare

  if (s !== original) {
    fs.writeFileSync(file, s);
    stats.files++;
    stats.replacements++;
    console.log('stats:', path.relative(ROOT, file));
  }
}

// ---- 4) Remove Abdulrahman card from lake-oil.html ----
const lakeOilPath = path.join(ROOT, 'lake-oil.html');
let lakeOil = fs.readFileSync(lakeOilPath, 'utf8');
const abdulCard = /<div class="card mgmt-card">\s*<div class="leader-photo"><img[^>]*Abdulrahman Mohamed[^>]*>[\s\S]*?<\/div>\s*<\/div>\s*(?=<div class="card mgmt-card">)/;
if (abdulCard.test(lakeOil)) {
  lakeOil = lakeOil.replace(abdulCard, '');
  stats.peopleRemoved.push('Abdulrahman Mohamed (lake-oil.html mgmt card)');
  console.log('Removed Abdulrahman card from lake-oil.html');
} else {
  // broader fallback
  const alt = /<div class="card mgmt-card">[\s\S]*?Abdulrahman Mohamed[\s\S]*?<\/div>\s*<\/div>\s*/;
  if (alt.test(lakeOil)) {
    lakeOil = lakeOil.replace(alt, '');
    stats.peopleRemoved.push('Abdulrahman Mohamed (lake-oil.html mgmt card)');
    console.log('Removed Abdulrahman card (fallback) from lake-oil.html');
  }
}
// Also fix remaining 4,600 / 700 / 85 in lake-oil if rewrite missed context
lakeOil = rewriteStats(lakeOil);
fs.writeFileSync(lakeOilPath, lakeOil);

// ---- 5) news-data.js — remove Khalid title line ----
const newsPath = path.join(ROOT, 'assets', 'news-data.js');
let news = fs.readFileSync(newsPath, 'utf8');
if (news.includes('Khalid')) {
  news = news.replace(
    /\s*"Mr Khalid Mohamed who is the Executive Director lead the delegation of Lake Group and presented the commodities to Dr\. A\. Malima the Chief Medical Officer of the Hospital in Dar es Salaam\.",?\n/,
    '\n      "A Lake Group delegation presented the commodities to Dr. A. Malima, the Chief Medical Officer of the Hospital in Dar es Salaam.",\n'
  );
  news = news.replace(/Khalid Mohamed/g, 'a Lake Group representative');
  fs.writeFileSync(newsPath, news);
  stats.peopleRemoved.push('Khalid Mohamed (news-data.js CSR article)');
  console.log('Cleaned Khalid from news-data.js');
}

// ---- 6) QA_REPORT.md ----
const qaPath = path.join(ROOT, 'QA_REPORT.md');
if (fs.existsSync(qaPath)) {
  let qa = fs.readFileSync(qaPath, 'utf8');
  qa = qa.replace(/Abdulrahman Mohamed, Khalid Mohamed, /g, '');
  qa = qa.replace(/Abdulrahman Mohamed|Khalid Mohamed/g, '');
  fs.writeFileSync(qaPath, qa);
}

// ---- 7) gallery.html CTA + remove fs-corners yellow lines ----
const galleryPath = path.join(ROOT, 'gallery.html');
let gallery = fs.readFileSync(galleryPath, 'utf8');
gallery = gallery.replace(
  /<div class="g-foot fs-on-dark fs-corners">/,
  '<div class="g-foot fs-on-dark">'
);
gallery = gallery.replace(
  /<p style="font-size:0\.83rem;margin-top:6px">Follow <a data-i18n="gallery\.56" href="https:\/\/www\.instagram\.com\/lakeoilltd\/" target="_blank">@lakeoilltd on Instagram<\/a> for the latest updates from the field\.<\/p>/,
  '<p style="font-size:0.83rem;margin-top:6px" data-i18n="gallery.56" data-i18n-html="">Follow <a href="https://www.instagram.com/lakeoilltd/" target="_blank" rel="noopener">@lakeoilltd</a> on Instagram for the latest updates from the field.</p>'
);
gallery = rewriteStats(gallery);
fs.writeFileSync(galleryPath, gallery);
console.log('Fixed gallery CTA + removed fs-corners');

// ---- 8) Add data-i18n-number to hardcoded ending stats (about / our-story) ----
function addI18nNumbers(htmlPath, patterns) {
  const p = path.join(ROOT, htmlPath);
  if (!fs.existsSync(p)) return;
  let h = fs.readFileSync(p, 'utf8');
  let changed = false;
  // ose-stat-num / ending-stat nums
  const pairs = [
    [/class="ose-stat-num">30,000\+</g, 'class="ose-stat-num" data-i18n-number data-number="30,000+">30,000+'],
    [/class="ose-stat-num">1,200\+</g, 'class="ose-stat-num" data-i18n-number data-number="1,200+">1,200+'],
    [/class="ose-stat-num">152</g, 'class="ose-stat-num" data-i18n-number data-number="152">152<'],
    [/class="num">30,000\+</g, 'class="num" data-i18n-number data-number="30,000+">30,000+'],
    [/class="num">1,200\+</g, 'class="num" data-i18n-number data-number="1,200+">1,200+'],
    [/class="num">152</g, 'class="num" data-i18n-number data-number="152">152<'],
    [/class="ending-stat"><div class="num">30,000\+/g, 'class="ending-stat"><div class="num" data-i18n-number data-number="30,000+">30,000+'],
    [/class="ending-stat"><div class="num">1,200\+/g, 'class="ending-stat"><div class="num" data-i18n-number data-number="1,200+">1,200+'],
    [/class="ending-stat"><div class="num">152</g, 'class="ending-stat"><div class="num" data-i18n-number data-number="152">152'],
  ];
  for (const [re, rep] of pairs) {
    if (re.test(h)) {
      h = h.replace(re, rep);
      changed = true;
    }
  }
  // Avoid double-applying data-i18n-number
  h = h.replace(/data-i18n-number data-number="[^"]+" data-i18n-number data-number="[^"]+"/g, (m) => {
    const n = m.match(/data-number="([^"]+)"/);
    return n ? `data-i18n-number data-number="${n[1]}"` : m;
  });
  if (changed) {
    fs.writeFileSync(p, h);
    console.log('Added data-i18n-number:', htmlPath);
  }
}
addI18nNumbers('about.html');
addI18nNumbers('our-story.html');

// Fix about/our-story if old values somehow remain
for (const f of ['about.html', 'our-story.html', 'index.html', 'africa-network.html', 'services.html', 'investors.html', 'fleet.html', 'station-locator.html', 'lake-trans.html', 'lake-oil.html', 'careers.html', 'csr.html', 'history.html', 'sustainability.html', 'projects.html', 'leadership.html', 'leadership-ally-edha-awadh.html', 'leadership-mohammed-khalid.html', 'leadership-sridhar-mani.html']) {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) continue;
  let h = fs.readFileSync(p, 'utf8');
  const o = h;
  h = rewriteStats(h);
  // Stations display: ensure no "152+"
  h = h.replace(/152\+/g, '152');
  // data-count stations: remove leftover suffix on 152
  h = h.replace(/data-count="152"\s+data-suffix="\+"/g, 'data-count="152"');
  if (h !== o) {
    fs.writeFileSync(p, h);
    console.log('re-pass:', f);
  }
}

// ---- 9) verified facts ----
const factsPath = path.join(ROOT, 'scripts', '_verified_lake_facts.md');
if (fs.existsSync(factsPath)) {
  let facts = fs.readFileSync(factsPath, 'utf8');
  facts = facts.replace(
    /\| Workforce \| 4,600\+ employees, 21 nationalities \| \[official\] about \|/,
    '| Workforce | 30,000+ employees, 21 nationalities | [official] about |'
  );
  facts = facts.replace(
    /\| Fleet \(group\) \|[^\n]+\|/,
    '| Fleet (group) | 1,200+ trucks (site source of truth, 2026) | [official] about |'
  );
  facts = facts.replace(
    /- 85 owned retail stations across Tanzania\. \[official app_config TA\.OIL\]/,
    '- 152 fuel stations (group source of truth, 2026). [official] site stats'
  );
  facts = facts.replace(
    /- Employee counts other than "4,600\+"; LinkedIn self-reported headcount is much lower/,
    '- Employee counts other than "30,000+"; LinkedIn self-reported headcount may differ'
  );
  facts = facts.replace(
    /- Station counts other than: TZ 85, KE 40, ZA 25, BU 16, RW 10, DRC 8 \(official app_config\)\./,
    '- Station counts other than the group total of 152 (per-country breakdown pending client refresh).'
  );
  fs.writeFileSync(factsPath, facts);
  console.log('Updated _verified_lake_facts.md');
}

// ---- 10) build_assistant_kb curated facts (post bulk rewrite) ----
const kbBuildPath = path.join(ROOT, 'scripts', 'build_assistant_kb.js');
let kbBuild = fs.readFileSync(kbBuildPath, 'utf8');
kbBuild = kbBuild.replace(
  /e\.g\. (?:700\+|1,200\+) trucks\)/,
  'e.g. 1,200+ trucks)'
);
// Rephrase stations fact to group total (may already be partially rewritten)
kbBuild = kbBuild.replace(
  /Lake Group runs fuel station networks across the region: 152 stations in Tanzania, 40 in Kenya, 25 in Zambia, 16 in Burundi, 10 in Rwanda and 8 in DR Congo\. Use the Station Locator to find the nearest one\./,
  'Lake Group operates 152 fuel stations across Tanzania and the wider region. Use the Station Locator to find the nearest one.'
);
kbBuild = kbBuild.replace(
  /Lake Group exploite des réseaux de stations-service dans la région : 152 stations en Tanzanie, 40 au Kenya, 25 en Zambie, 16 au Burundi, 10 au Rwanda et 8 en RD Congo\. Utilisez le localisateur de stations pour trouver la plus proche\./,
  'Lake Group exploite 152 stations-service en Tanzanie et dans la région. Utilisez le localisateur de stations pour trouver la plus proche.'
);
kbBuild = kbBuild.replace(
  /Lake Group inaendesha mitandao ya vituo vya mafuta kanda hii: vituo 152 Tanzania, 40 Kenya, 25 Zambia, 16 Burundi, 10 Rwanda na 8 DR Congo\. Tumia ukurasa wa Kitafuta Vituo kupata kituo kilicho karibu nawe\./,
  'Lake Group inaendesha vituo 152 vya mafuta Tanzania na kanda nzima. Tumia ukurasa wa Kitafuta Vituo kupata kituo kilicho karibu nawe.'
);
kbBuild = kbBuild.replace(
  /supported by 152 owned retail stations and a fleet of 300 tankers\./,
  'supported by 152 retail stations and a fleet of 300 tankers.'
);
// French spacing for fleet curated line if still comma-form
kbBuild = kbBuild.replace(/plus de 1,200 camions/g, 'plus de 1 200 camions');
kbBuild = kbBuild.replace(/plus de 30,000 personnes/g, 'plus de 30 000 personnes');
fs.writeFileSync(kbBuildPath, kbBuild);
console.log('Updated build_assistant_kb.js curated facts');

// ---- 11) site.js chat fallbacks ----
const siteJsPath = path.join(ROOT, 'assets', 'site.js');
let siteJs = fs.readFileSync(siteJsPath, 'utf8');
siteJs = rewriteStats(siteJs);
fs.writeFileSync(siteJsPath, siteJs);

// ---- 12) master_en.json leadership name cleanup ----
const masterPath = path.join(ROOT, 'scripts', '_master_en.json');
if (fs.existsSync(masterPath)) {
  let master = JSON.parse(fs.readFileSync(masterPath, 'utf8'));
  if (master['leadership.17'] === 'Abdulrahman Mohamed') master['leadership.17'] = 'Dileep';
  if (master['leadership.20'] === 'Khalid Mohamed') master['leadership.20'] = 'Sridhar Mani';
  if (typeof master['leadership.33'] === 'string') {
    master['leadership.33'] = master['leadership.33']
      .replace(/\s*MD:\s*Abdulrahman Mohamed\.?/gi, '')
      .replace(/Abdulrahman Mohamed/gi, '');
  }
  for (const k of Object.keys(master)) {
    if (typeof master[k] === 'string') master[k] = rewriteStats(master[k]);
  }
  fs.writeFileSync(masterPath, JSON.stringify(master, null, 2) + '\n');
  console.log('Cleaned _master_en.json');
}

// ---- 13) Cache bump for i18n / site / assistant-kb ----
const htmlFiles = walk(ROOT).filter((f) => f.endsWith('.html') && !path.relative(ROOT, f).startsWith('docs'));
let bumped = 0;
for (const f of htmlFiles) {
  let h = fs.readFileSync(f, 'utf8');
  const o = h;
  h = h.replace(/i18n-content\.js\?v=\d+/g, `i18n-content.js?v=${CACHE}`);
  h = h.replace(/i18n\.js\?v=\d+/g, `i18n.js?v=${CACHE}`);
  h = h.replace(/site\.js\?v=\d+/g, `site.js?v=${CACHE}`);
  h = h.replace(/assistant-kb\.js\?v=\d+/g, `assistant-kb.js?v=${CACHE}`);
  h = h.replace(/assistant\.js\?v=\d+/g, `assistant.js?v=${CACHE}`);
  if (h !== o) {
    fs.writeFileSync(f, h);
    bumped++;
  }
}
console.log('Cache bumped on', bumped, 'HTML files to v=' + CACHE);

// ---- 14) Rebuild assistant KB ----
require('child_process').execSync('node scripts/build_assistant_kb.js', {
  cwd: ROOT,
  stdio: 'inherit',
});

console.log('\n=== DONE ===');
console.log(JSON.stringify(stats, null, 2));
