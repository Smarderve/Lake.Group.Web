#!/usr/bin/env node
/**
 * One-shot: strip em dashes, replace UI emojis, localize leadership roles/names
 * copy, regenerate i18n-content.js. Run from repo root.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const EM = /\u2014/g; // —

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.git' || e.name === 'docs' || e.name === 'All Logos') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.(html|js|json|css)$/.test(e.name)) acc.push(p);
  }
  return acc;
}

function stripEmDash(text) {
  // Spaced em dash → spaced hyphen; glued → hyphen; collapse doubles
  return text
    .replace(/\s*\u2014\s*/g, ' - ')
    .replace(/\u2014/g, ' - ')
    .replace(/ -  - /g, ' - ');
}

const CHECK_SVG =
  '<span class="lg-check" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg></span>';
const PIN_SVG =
  '<span class="lg-pin" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.4"/></svg></span>';

const ROLE_FIXES = {
  ar: {
    'leadership.18': 'الرئيس التنفيذي · قسم التصنيع',
    'leadership.27': 'المدير المالي · AFICD',
    'leadership.24': 'المدير العام · ATL',
    'leadership.52': 'مدير العمليات · مجموعة ليك',
    'leadership.55': 'مدير المشروع · ليك أغرو',
    'leadership.17': 'سبتيان أنصاري',
    'leadership.9': 'علي إضحى عوض',
  },
  hi: {
    'leadership.18': 'मुख्य कार्यकारी अधिकारी · विनिर्माण प्रभाग',
    'leadership.27': 'मुख्य वित्तीय अधिकारी · AFICD',
    'leadership.24': 'प्रबंध निदेशक · ATL',
    'leadership.52': 'संचालन निदेशक · लेक ग्रुप',
    'leadership.55': 'परियोजना प्रबंधक · लेक एग्रो',
    'leadership.9': 'अल्ली एधा अवध',
  },
  sw: {
    'leadership.18': 'Mkurugenzi Mtendaji · Kitengo cha Uzalishaji',
    'leadership.27': 'Afisa Mkuu wa Fedha · AFICD',
  },
  fr: {
    'leadership.27': 'Directeur financier · AFICD',
  },
};

const BRAND_AR = [
  [/Lake Group/g, 'مجموعة ليك'],
  [/Lake Steel/g, 'ليك ستيل'],
  [/Lake Oil/g, 'ليك أويل'],
  [/Lake Trans/g, 'ليك ترانس'],
  [/Lake Agro/g, 'ليك أغرو'],
  [/Lake Premix\s*\/\s*GCCP/g, 'ليك بريمكس / جي سي سي بي'],
  [/Gulf Aggregates/g, 'غلف أجريغيتس'],
  [/Associated Trans Logistics/g, 'أسوشيتد ترانس لوجستيكس'],
];
const BRAND_HI = [
  [/Lake Group/g, 'लेक ग्रुप'],
  [/Lake Steel/g, 'लेक स्टील'],
  [/Lake Oil/g, 'लेक ऑयल'],
  [/Lake Trans/g, 'लेक ट्रांस'],
  [/Lake Agro/g, 'लेक एग्रो'],
  [/Lake Premix\s*\/\s*GCCP/g, 'लेक प्रीमिक्स / GCCP'],
  [/Gulf Aggregates/g, 'गल्फ एग्रीगेट्स'],
];

const EASTERN = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
function toEastern(s) {
  return String(s).replace(/[0-9]/g, (d) => EASTERN[+d]);
}

function fixLeadershipProse(lang, key, val) {
  if (typeof val !== 'string') return val;
  let out = stripEmDash(val);
  if (lang === 'ar') {
    for (const [re, rep] of BRAND_AR) out = out.replace(re, rep);
    // Prefer Arabic role phrasing leftovers
    out = out.replace(/\bCEO\b/g, 'الرئيس التنفيذي');
    out = out.replace(/\bCFO\b/g, 'المدير المالي');
    out = out.replace(/\bPDG\b/g, 'الرئيس التنفيذي');
    if (key.startsWith('leadership.') || key.startsWith('services.') || key.startsWith('contact.') || key.startsWith('ose.')) {
      out = toEastern(out);
    }
  }
  if (lang === 'hi') {
    for (const [re, rep] of BRAND_HI) out = out.replace(re, rep);
    out = out.replace(/\bCEO\b/g, 'मुख्य कार्यकारी अधिकारी');
    out = out.replace(/\bCFO\b/g, 'मुख्य वित्तीय अधिकारी');
  }
  if (lang === 'sw') {
    out = out.replace(/\bCEO\b/g, 'Mkurugenzi Mtendaji');
    out = out.replace(/\bCFO\b/g, 'Afisa Mkuu wa Fedha');
  }
  return out;
}

function patchI18nJson() {
  const jsonPath = path.join(ROOT, 'assets', 'i18n-content.json');
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  let changed = 0;

  for (const lang of Object.keys(data)) {
    const pack = data[lang];
    if (!pack || typeof pack !== 'object') continue;

    // Role / name overrides
    const fixes = ROLE_FIXES[lang];
    if (fixes) {
      for (const [k, v] of Object.entries(fixes)) {
        if (pack[k] !== v) {
          pack[k] = v;
          changed++;
        }
      }
    }

    for (const [k, v] of Object.entries(pack)) {
      if (typeof v !== 'string') continue;
      let next = v;

      // Emoji / checkmark chrome → SVG
      if (k === 'about.34' && /🛡|🛡️/.test(next)) {
        next = '';
      }
      if (/📍/.test(next)) {
        next = next.replace(/📍\s*/g, '');
        // keep label; pin rendered in HTML where used
      }
      if (next.includes('✓')) {
        next = next.replace(
          /<span style="color:var\(--amber\);font-weight:700(;flex-shrink:0)?">✓<\/span>/g,
          CHECK_SVG
        );
        next = next.replace(/✓/g, '');
      }

      next = fixLeadershipProse(lang, k, next);
      next = stripEmDash(next);

      if (next !== v) {
        pack[k] = next;
        changed++;
      }
    }
  }

  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  const jsPath = path.join(ROOT, 'assets', 'i18n-content.js');
  fs.writeFileSync(jsPath, 'window.__LAKE_I18N_CONTENT__ = ' + JSON.stringify(data) + ';\n', 'utf8');
  console.log('i18n: updated', changed, 'string values; regenerated i18n-content.js');
  return data;
}

const NAME_KEYS = {
  'Ally Edha Awadh': 'leadership.9',
  'Sibtian Ansari': 'leadership.17',
  'Vivek Choudhary': 'leadership.20',
  'Bhaskar S. Shetty': 'leadership.23',
  'Pankaj Kumar': 'leadership.26',
  'Juma Nuru': 'leadership.51',
  'Nassoro Abubakari': 'leadership.54',
};

const CT_ICONS = {
  '&#9670;': '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="lg-ico-draw" d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>',
  '&#9742;': '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="lg-ico-draw" d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.6a2 2 0 0 1-.5 2.1L8.1 9.6a16 16 0 0 0 6.3 6.3l1.2-1.2a2 2 0 0 1 2.1-.5c.8.3 1.7.6 2.6.7A2 2 0 0 1 22 16.9z"/></svg>',
  '&#9993;': '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="lg-ico-draw" d="M4 6h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"/><path d="m22 8-10 7L2 8"/></svg>',
  '&#9719;': '<svg viewBox="0 0 24 24" aria-hidden="true"><circle class="lg-ico-draw" cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
};

function patchHtmlFile(filePath) {
  let raw = fs.readFileSync(filePath, 'utf8');
  const before = raw;

  raw = stripEmDash(raw);

  // Wire leadership H1 names
  for (const [name, key] of Object.entries(NAME_KEYS)) {
    const re = new RegExp(
      `<h1 class="lp-name">${name.replace(/\./g, '\\.')}</h1>`,
      'g'
    );
    raw = raw.replace(re, `<h1 class="lp-name" data-i18n="${key}">${name}</h1>`);
  }

  // Wire prev/next name links in lp-nav
  for (const [name, key] of Object.entries(NAME_KEYS)) {
    raw = raw.replace(
      new RegExp(`(←\\s*)${name.replace(/\./g, '\\.')}`, 'g'),
      `$1<span data-i18n="${key}">${name}</span>`
    );
    raw = raw.replace(
      new RegExp(`${name.replace(/\./g, '\\.')}(\\s*→)`, 'g'),
      `<span data-i18n="${key}">${name}</span>$1`
    );
  }

  // Mandate numbers
  raw = raw.replace(
    /<li><span>(0[123])<\/span>/g,
    '<li><span data-i18n-number="$1">$1</span>'
  );

  // Contact unicode icons → SVG
  for (const [ent, svg] of Object.entries(CT_ICONS)) {
    raw = raw.replace(
      new RegExp(`<div class="ct-ico" aria-hidden="true">${ent}</div>`, 'g'),
      `<div class="ct-ico lg-ico" aria-hidden="true">${svg}</div>`
    );
  }

  // Leadership Read more: remove unicode arrow content rule dependency already in CSS
  raw = raw.replace(
    /\.ld-person-more::after \{ content: "→"; transition: transform \.25s ease; \}/g,
    '.ld-person-more::after { /* arrow via ui-icons.css mask */ }'
  );

  // Photo alt via i18n where name matches
  for (const [name, key] of Object.entries(NAME_KEYS)) {
    raw = raw.replace(
      new RegExp(`alt="${name.replace(/\./g, '\\.')}"`, 'g'),
      `alt="${name}" data-i18n-alt="${key}"`
    );
  }

  if (raw !== before) {
    fs.writeFileSync(filePath, raw, 'utf8');
    return true;
  }
  return false;
}

function patchAssistantFab() {
  const p = path.join(ROOT, 'assets', 'assistant.js');
  let raw = fs.readFileSync(p, 'utf8');
  const before = raw;
  raw = raw.replace(
    /launcher\.innerHTML =\s*'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill="none" stroke="currentColor" stroke-width="2\.2" stroke-linejoin="round"\/><path d="M8 9\.5h8M8 13h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"\/><\/svg>';/,
    `launcher.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><g class="la-fab-bubble"><path class="la-fab-stroke" d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M8 9.5h8M8 13h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></g></svg>';`
  );
  raw = stripEmDash(raw);
  if (raw !== before) {
    fs.writeFileSync(p, raw, 'utf8');
    console.log('patched assistant.js FAB');
  }
}

function patchAssetTextFiles() {
  const files = walk(path.join(ROOT, 'assets')).concat(
    walk(path.join(ROOT, 'scripts')).filter((f) => !f.includes('_patch_icons'))
  );
  let n = 0;
  for (const f of files) {
    if (f.endsWith('i18n-content.json') || f.endsWith('i18n-content.js')) continue;
    let raw = fs.readFileSync(f, 'utf8');
    if (!EM.test(raw) && !raw.includes('✓') && !raw.includes('📍') && !raw.includes('🛡')) continue;
    const next = stripEmDash(raw)
      .replace(/📍\s*/g, '')
      .replace(/🛡️?/g, '');
    // Don't destroy checkmarks inside already-patched SVG paths; only bare ✓ in comments/strings of non-json
    if (next !== raw) {
      fs.writeFileSync(f, next, 'utf8');
      n++;
    }
  }
  console.log('stripped emdash/emoji leftovers in', n, 'asset/script files');
}

function main() {
  patchI18nJson();

  const htmlFiles = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html'));
  let htmlN = 0;
  for (const f of htmlFiles) {
    if (patchHtmlFile(path.join(ROOT, f))) htmlN++;
  }
  console.log('patched', htmlN, 'html files (names, icons, emdash)');

  patchAssistantFab();
  patchAssetTextFiles();

  // tokens.css comments: strip em dashes for consistency
  const tokens = path.join(ROOT, 'assets', 'tokens.css');
  let t = fs.readFileSync(tokens, 'utf8');
  const t2 = stripEmDash(t);
  if (t2 !== t) fs.writeFileSync(tokens, t2, 'utf8');

  console.log('done');
}

main();
