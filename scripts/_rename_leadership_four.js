#!/usr/bin/env node
/**
 * Site-wide rename of four leadership profiles.
 * Run: node scripts/_rename_leadership_four.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const RENAMES = [
  {
    oldId: 'sibtian-ansari',
    newId: 'dileep',
    oldName: 'Sibtian Ansari',
    newName: 'Dileep',
    photo: 'assets/images/leadership/sibtian-ansari.png',
    nameKey: 'leadership.17',
    bioKeys: ['leadership.117'],
    surnameOld: ['Ansari', 'أنساري', 'अंसारी'],
    surnameNew: { en: 'Dileep', sw: 'Dileep', fr: 'Dileep', hi: 'दिलीप', ar: 'ديليب' },
    localized: { en: 'Dileep', sw: 'Dileep', fr: 'Dileep', hi: 'दिलीप', ar: 'ديليب' },
  },
  {
    oldId: 'vivek-choudhary',
    newId: 'sridhar-mani',
    oldName: 'Vivek Choudhary',
    newName: 'Sridhar Mani',
    photo: 'assets/images/leadership/vivek-choudhary.png',
    nameKey: 'leadership.20',
    bioKeys: ['leadership.123'],
    surnameOld: ['Choudhary', 'شودري', 'चौधरी'],
    surnameNew: { en: 'Mani', sw: 'Mani', fr: 'Mani', hi: 'मणि', ar: 'ماني' },
    localized: { en: 'Sridhar Mani', sw: 'Sridhar Mani', fr: 'Sridhar Mani', hi: 'श्रीधर मणि', ar: 'سريدار ماني' },
  },
  {
    oldId: 'bhaskar-shetty',
    newId: 'mohammed-khalid',
    oldName: 'Bhaskar S. Shetty',
    newName: 'Mohammed Khalid',
    photo: 'assets/images/leadership/bhaskar-shetty.png',
    nameKey: 'leadership.23',
    bioKeys: ['leadership.129'],
    surnameOld: ['Shetty', 'شيتي', 'शेट्टी'],
    surnameNew: { en: 'Khalid', sw: 'Khalid', fr: 'Khalid', hi: 'खालिद', ar: 'خالد' },
    localized: { en: 'Mohammed Khalid', sw: 'Mohammed Khalid', fr: 'Mohammed Khalid', hi: 'मोहम्मद खालिद', ar: 'محمد خالد' },
  },
  {
    oldId: 'pankaj-kumar',
    newId: 'bibhuti-singh',
    oldName: 'Pankaj Kumar',
    newName: 'Bibhuti Singh',
    photo: 'assets/images/leadership/pankaj-kumar.png',
    nameKey: 'leadership.26',
    bioKeys: ['leadership.137'],
    surnameOld: ['Kumar', 'كومار', 'कुमार'],
    surnameNew: { en: 'Singh', sw: 'Singh', fr: 'Singh', hi: 'सिंह', ar: 'سينغ' },
    localized: { en: 'Bibhuti Singh', sw: 'Bibhuti Singh', fr: 'Bibhuti Singh', hi: 'बिभुति सिंह', ar: 'بيبهوتي سينغ' },
  },
];

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (['node_modules', '.git', 'docs', '_live_probe', 'scripts/_scraped'].includes(ent.name)) continue;
      if (ent.name === 'All Logos') continue;
      walk(p, acc);
    } else {
      acc.push(p);
    }
  }
  return acc;
}

function replaceAll(str, map) {
  let out = str;
  for (const [from, to] of map) {
    if (!from) continue;
    out = out.split(from).join(to);
  }
  return out;
}

// --- 1) Update build_leadership_pages.js ---
{
  const p = path.join(ROOT, 'scripts', 'build_leadership_pages.js');
  let s = fs.readFileSync(p, 'utf8');
  const pairs = [
    ["id: 'sibtian-ansari'", "id: 'dileep'"],
    ["name: 'Sibtian Ansari'", "name: 'Dileep'"],
    ["emailSubject: 'Attention: CEO Manufacturing (Sibtian Ansari)'", "emailSubject: 'Attention: CEO Manufacturing (Dileep)'"],
    ["As Manufacturing CEO, Ansari’s mandate", "As Manufacturing CEO, Dileep’s mandate"],
    ["As Manufacturing CEO, Ansari's mandate", "As Manufacturing CEO, Dileep's mandate"],
    ["'sibtian-ansari': { name: 'leadership.17'", "'dileep': { name: 'leadership.17'"],

    ["id: 'vivek-choudhary'", "id: 'sridhar-mani'"],
    ["name: 'Vivek Choudhary'", "name: 'Sridhar Mani'"],
    ["emailSubject: 'Attention: Director Digital Transformation (Vivek Choudhary)'", "emailSubject: 'Attention: Director Digital Transformation (Sridhar Mani)'"],
    ["Choudhary’s mandate focuses", "Mani’s mandate focuses"],
    ["Choudhary's mandate focuses", "Mani's mandate focuses"],
    ["'vivek-choudhary': { name: 'leadership.20'", "'sridhar-mani': { name: 'leadership.20'"],

    ["id: 'bhaskar-shetty'", "id: 'mohammed-khalid'"],
    ["name: 'Bhaskar S. Shetty'", "name: 'Mohammed Khalid'"],
    ["emailSubject: 'Attention: MD ATL (Bhaskar S. Shetty)'", "emailSubject: 'Attention: MD ATL (Mohammed Khalid)'"],
    ["Shetty’s ATL wing", "Khalid’s ATL wing"],
    ["Shetty's ATL wing", "Khalid's ATL wing"],
    ["'bhaskar-shetty': { name: 'leadership.23'", "'mohammed-khalid': { name: 'leadership.23'"],

    ["id: 'pankaj-kumar'", "id: 'bibhuti-singh'"],
    ["name: 'Pankaj Kumar'", "name: 'Bibhuti Singh'"],
    ["emailSubject: 'Attention: CFO AFICD (Pankaj Kumar)'", "emailSubject: 'Attention: CFO AFICD (Bibhuti Singh)'"],
    ["As CFO, Kumar’s brief", "As CFO, Singh’s brief"],
    ["As CFO, Kumar's brief", "As CFO, Singh's brief"],
    ["'pankaj-kumar': { name: 'leadership.26'", "'bibhuti-singh': { name: 'leadership.26'"],
  ];
  s = replaceAll(s, pairs);
  fs.writeFileSync(p, s);
  console.log('updated scripts/build_leadership_pages.js');
}

// --- 2) Update _patch_lp_nav_cards.js ---
{
  const p = path.join(ROOT, 'scripts', '_patch_lp_nav_cards.js');
  let s = fs.readFileSync(p, 'utf8');
  s = replaceAll(s, [
    ["id: 'sibtian-ansari'", "id: 'dileep'"],
    ["name: 'Sibtian Ansari'", "name: 'Dileep'"],
    ["id: 'vivek-choudhary'", "id: 'sridhar-mani'"],
    ["name: 'Vivek Choudhary'", "name: 'Sridhar Mani'"],
    ["id: 'bhaskar-shetty'", "id: 'mohammed-khalid'"],
    ["name: 'Bhaskar S. Shetty'", "name: 'Mohammed Khalid'"],
    ["id: 'pankaj-kumar'", "id: 'bibhuti-singh'"],
    ["name: 'Pankaj Kumar'", "name: 'Bibhuti Singh'"],
  ]);
  fs.writeFileSync(p, s);
  console.log('updated scripts/_patch_lp_nav_cards.js');
}

// --- 3) Global text replacements in content files ---
const TEXT_EXTS = new Set(['.html', '.js', '.json', '.txt', '.md', '.xml', '.css']);
const SKIP_NAMES = new Set(['_rename_leadership_four.js']);

const globalMap = [];
for (const r of RENAMES) {
  globalMap.push([`leadership-${r.oldId}.html`, `leadership-${r.newId}.html`]);
  globalMap.push([r.oldName, r.newName]);
  // URL-encoded email subjects
  globalMap.push([encodeURIComponent(r.oldName), encodeURIComponent(r.newName)]);
  // Partial URL encodings used in mailto subjects
  globalMap.push([r.oldName.replace(/ /g, '%20'), r.newName.replace(/ /g, '%20')]);
  globalMap.push([r.oldName.replace(/ /g, '%20').replace(/\./g, '%2E'), r.newName.replace(/ /g, '%20')]);
}

// Specific surname possessive / bio swaps (Latin forms used in HTML fallbacks)
globalMap.push(["Ansari’s", "Dileep’s"]);
globalMap.push(["Ansari's", "Dileep's"]);
globalMap.push(["Choudhary’s", "Mani’s"]);
globalMap.push(["Choudhary's", "Mani's"]);
globalMap.push(["Shetty’s", "Khalid’s"]);
globalMap.push(["Shetty's", "Khalid's"]);
globalMap.push(["Kumar’s", "Singh’s"]);
globalMap.push(["Kumar's", "Singh's"]);
// Swahili / French bio surname mentions (Latin script names in prose)
globalMap.push(['la Ansari', 'la Dileep']);
globalMap.push(['jukumu la Ansari', 'jukumu la Dileep']);
globalMap.push(['jukumu la Choudhary', 'jukumu la Mani']);
globalMap.push(['Uwingi wa ATL wa Shetty', 'Uwingi wa ATL wa Khalid']);
globalMap.push(['jukumu la Kumar', 'jukumu la Singh']);
globalMap.push(['mandat d’Ansari', 'mandat de Dileep']);
globalMap.push(['mandat de Choudhary', 'mandat de Mani']);
globalMap.push(['Le mandat de Choudhary', 'Le mandat de Mani']);
globalMap.push(['L’aile ATL de Shetty', 'L’aile ATL de Khalid']);
globalMap.push(['mandat de Kumar', 'mandat de Singh']);
globalMap.push(['Bhaskar%20S.%20Shetty', 'Mohammed%20Khalid']);
globalMap.push(['Bhaskar S. Shetty', 'Mohammed Khalid']);

const files = walk(ROOT).filter((f) => {
  const base = path.basename(f);
  if (SKIP_NAMES.has(base)) return false;
  const ext = path.extname(f).toLowerCase();
  return TEXT_EXTS.has(ext);
});

let touched = 0;
for (const f of files) {
  let s = fs.readFileSync(f, 'utf8');
  const before = s;
  s = replaceAll(s, globalMap);
  if (s !== before) {
    fs.writeFileSync(f, s);
    touched++;
  }
}
console.log(`text-replaced in ${touched} files`);

// --- 4) Rename HTML profile files + body templates ---
function renameFile(oldRel, newRel) {
  const oldP = path.join(ROOT, oldRel);
  const newP = path.join(ROOT, newRel);
  if (!fs.existsSync(oldP)) {
    console.log('skip missing', oldRel);
    return;
  }
  if (fs.existsSync(newP)) {
    // already renamed via content rewrite of a copy? overwrite carefully
    fs.unlinkSync(newP);
  }
  fs.renameSync(oldP, newP);
  console.log('renamed', oldRel, '→', newRel);
}

for (const r of RENAMES) {
  renameFile(`leadership-${r.oldId}.html`, `leadership-${r.newId}.html`);
  renameFile(
    path.join('scripts', '_lp_bodies', `leadership-${r.oldId}.html.txt`),
    path.join('scripts', '_lp_bodies', `leadership-${r.newId}.html.txt`)
  );
}

// --- 5) Redirect stubs for old URLs ---
for (const r of RENAMES) {
  const stub = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0;url=leadership-${r.newId}.html">
  <link rel="canonical" href="https://www.lakeoilgroup.com/leadership-${r.newId}.html">
  <title>Redirecting…</title>
  <script>location.replace('leadership-${r.newId}.html'+location.search+location.hash);</script>
</head>
<body>
  <p>This profile has moved to <a href="leadership-${r.newId}.html">${r.newName}</a>.</p>
</body>
</html>
`;
  fs.writeFileSync(path.join(ROOT, `leadership-${r.oldId}.html`), stub);
  console.log('wrote redirect', `leadership-${r.oldId}.html`);
}

// --- 6) i18n-content.js + i18n-content.json ---
function patchI18nObject(data) {
  for (const lang of Object.keys(data)) {
    if (!data[lang] || typeof data[lang] !== 'object') continue;
    const bag = data[lang];
    for (const r of RENAMES) {
      if (bag[r.nameKey] !== undefined) {
        bag[r.nameKey] = r.localized[lang] || r.newName;
      }
      for (const bk of r.bioKeys) {
        if (typeof bag[bk] !== 'string') continue;
        let t = bag[bk];
        // Full old names
        t = t.split(r.oldName).join(r.localized[lang] || r.newName);
        // Latin old names even in hi/ar if present
        t = t.split(r.oldName).join(r.newName);
        // Surname forms
        for (const oldSur of r.surnameOld) {
          // Avoid replacing Kumar inside unrelated words — these bios use clear surname tokens
          t = t.split(oldSur).join(r.surnameNew[lang] || r.surnameNew.en);
        }
        bag[bk] = t;
      }
    }
    // Extra bio keys that mention surnames in other paragraphs (only 117/123/129/137 have surnames in EN;
    // but sw/fr/hi/ar may have them only in those same keys — already handled)
  }
  return data;
}

{
  const jsPath = path.join(ROOT, 'assets', 'i18n-content.js');
  const raw = fs.readFileSync(jsPath, 'utf8');
  const jsonStr = raw.replace(/^window\.__LAKE_I18N_CONTENT__\s*=\s*/, '').replace(/;?\s*$/, '');
  const data = JSON.parse(jsonStr);
  patchI18nObject(data);
  // Also fix any remaining Latin old full names in all string values
  for (const lang of Object.keys(data)) {
    const bag = data[lang];
    if (!bag) continue;
    for (const k of Object.keys(bag)) {
      if (typeof bag[k] !== 'string') continue;
      let t = bag[k];
      for (const r of RENAMES) {
        t = t.split(r.oldName).join(r.localized[lang] || r.newName);
      }
      t = t.split("Ansari’s").join("Dileep’s").split("Ansari's").join("Dileep's");
      t = t.split("Choudhary’s").join("Mani’s").split("Choudhary's").join("Mani's");
      t = t.split("Shetty’s").join("Khalid’s").split("Shetty's").join("Khalid's");
      t = t.split("Kumar’s").join("Singh’s").split("Kumar's").join("Singh's");
      // Swahili/French residual Latin surnames in bios
      t = t.replace(/\bAnsari\b/g, lang === 'hi' ? 'दिलीप' : lang === 'ar' ? 'ديليب' : 'Dileep');
      t = t.replace(/\bChoudhary\b/g, lang === 'hi' ? 'मणि' : lang === 'ar' ? 'ماني' : 'Mani');
      t = t.replace(/\bShetty\b/g, lang === 'hi' ? 'खालिद' : lang === 'ar' ? 'خالد' : 'Khalid');
      // Kumar is common — only replace in leadership bio keys
      if (/^leadership\.(117|123|129|135|136|137)$/.test(k) || k === 'leadership.137') {
        t = t.replace(/\bKumar\b/g, lang === 'hi' ? 'सिंह' : lang === 'ar' ? 'سينغ' : 'Singh');
      }
      bag[k] = t;
    }
  }
  fs.writeFileSync(jsPath, 'window.__LAKE_I18N_CONTENT__ = ' + JSON.stringify(data) + ';\n');
  console.log('updated assets/i18n-content.js');

  const jsonPath = path.join(ROOT, 'assets', 'i18n-content.json');
  if (fs.existsSync(jsonPath)) {
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2) + '\n');
    console.log('updated assets/i18n-content.json');
  }
}

// --- 7) master_en.json ---
{
  const p = path.join(ROOT, 'scripts', '_master_en.json');
  if (fs.existsSync(p)) {
    let s = fs.readFileSync(p, 'utf8');
    s = replaceAll(s, [
      ['"Sibtian Ansari"', '"Dileep"'],
      ['"Vivek Choudhary"', '"Sridhar Mani"'],
      ['"Bhaskar S. Shetty"', '"Mohammed Khalid"'],
      ['"Pankaj Kumar"', '"Bibhuti Singh"'],
      ["Ansari’s", "Dileep’s"],
      ["Ansari's", "Dileep's"],
      ["Choudhary’s", "Mani’s"],
      ["Choudhary's", "Mani's"],
      ["Shetty’s", "Khalid’s"],
      ["Shetty's", "Khalid's"],
      ["Kumar’s", "Singh’s"],
      ["Kumar's", "Singh's"],
      ['leadership-sibtian-ansari.html', 'leadership-dileep.html'],
      ['leadership-vivek-choudhary.html', 'leadership-sridhar-mani.html'],
      ['leadership-bhaskar-shetty.html', 'leadership-mohammed-khalid.html'],
      ['leadership-pankaj-kumar.html', 'leadership-bibhuti-singh.html'],
    ]);
    fs.writeFileSync(p, s);
    console.log('updated scripts/_master_en.json');
  }
}

// --- 8) sitemap: ensure new locs, keep old as optional or replace ---
{
  const smPath = path.join(ROOT, 'sitemap.xml');
  if (fs.existsSync(smPath)) {
    let sm = fs.readFileSync(smPath, 'utf8');
    for (const r of RENAMES) {
      const oldLoc = `https://www.lakeoilgroup.com/leadership-${r.oldId}.html`;
      const newLoc = `https://www.lakeoilgroup.com/leadership-${r.newId}.html`;
      sm = sm.split(oldLoc).join(newLoc);
      if (!sm.includes(newLoc)) {
        sm = sm.replace(
          '</urlset>',
          `  <url>\n    <loc>${newLoc}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>\n</urlset>`
        );
      }
    }
    fs.writeFileSync(smPath, sm);
    console.log('updated sitemap.xml');
  }
}

// --- 9) Fix verify scripts that list old filenames ---
{
  const ver = path.join(ROOT, 'scripts', '_verify_leadership_fix.js');
  if (fs.existsSync(ver)) {
    let s = fs.readFileSync(ver, 'utf8');
    s = replaceAll(s, [
      ["'leadership-bhaskar-shetty.html'", "'leadership-mohammed-khalid.html'"],
      ["'leadership-pankaj-kumar.html'", "'leadership-bibhuti-singh.html'"],
      ["'leadership-sibtian-ansari.html'", "'leadership-dileep.html'"],
      ["'leadership-vivek-choudhary.html'", "'leadership-sridhar-mani.html'"],
    ]);
    fs.writeFileSync(ver, s);
    console.log('updated _verify_leadership_fix.js');
  }
  const ui = path.join(ROOT, 'scripts', '_verify_ui_pass.js');
  if (fs.existsSync(ui)) {
    let s = fs.readFileSync(ui, 'utf8');
    s = s.split('leadership-sibtian-ansari.html').join('leadership-dileep.html');
    fs.writeFileSync(ui, s);
    console.log('updated _verify_ui_pass.js');
  }
}

console.log('DONE');
