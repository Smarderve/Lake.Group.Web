/**
 * Build Portuguese (pt) and Spanish (es) dictionaries from English, remove
 * Hindi (hi), then rewrite assets/i18n-content.json + assets/i18n-content.js
 * with full key parity for en/fr/sw/pt/es/ar.
 *
 * Seeds PT from scripts/translation_dict.py (PHRASES_PT / TERMS_PT) when the
 * English source matches exactly; remaining PT keys and all ES keys are filled
 * via google-translate-api-x (same pipeline as the former hi/ar builder).
 *
 * Run from repo root: node scripts/build_pt_es_lang.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { translate } = require('google-translate-api-x');

const ROOT = path.join(__dirname, '..');
const JSON_PATH = path.join(ROOT, 'assets', 'i18n-content.json');
const JS_PATH = path.join(ROOT, 'assets', 'i18n-content.js');
const CACHE_PATH = path.join(__dirname, '_pt_es_cache.json');
const DICT_PATH = path.join(__dirname, 'translation_dict.py');

const BATCH = 40;
const PAUSE_MS = 400;

const PROTECT = [
  'Lake Oil Group', 'Lake Group', 'Lake Oil', 'Lake Aviation', 'Lake Gas',
  'Lake Lubes', 'Lake Buildings', 'Lake Pipes', 'Lake Steel', 'Lake Cylinders',
  'Lake Trans', 'Lake Agro', 'Lake Premix & Cement', 'Lake Premix and Cement',
  'Gulf Aggregates', 'Ocean Galleria', 'Cross Country', 'AFICD', 'AILL', 'ATL',
  'East Africa', 'Central Africa', 'Tanzania', 'Kenya', 'Uganda', 'Rwanda',
  'Burundi', 'DRC', 'Zambia', 'Malawi', 'Mozambique', 'South Sudan',
  'Dar es Salaam', 'Mwanza', 'Arusha', 'Dodoma', 'Nairobi', 'Kampala',
  'LPG', 'ISO', 'CSR', 'ESG', 'HSE', 'API', 'SMS', 'GPS', 'CEO', 'CFO', 'COO'
];

function fail(msg) {
  console.error('FATAL: ' + msg);
  process.exit(1);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function protectHtmlAndBrands(str) {
  const tokens = [];
  let out = String(str);

  out = out.replace(/<\/?[a-zA-Z][^>]*>/g, (m) => {
    const i = tokens.length;
    tokens.push(m);
    return `@@${i}@@`;
  });

  const brands = PROTECT.slice().sort((a, b) => b.length - a.length);
  for (const brand of brands) {
    const re = new RegExp(brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    out = out.replace(re, (m) => {
      const i = tokens.length;
      tokens.push(m);
      return `@@${i}@@`;
    });
  }

  return { text: out, tokens };
}

function restoreTokens(str, tokens) {
  let out = String(str);
  out = out.replace(/@@\s*(\d+)\s*@@/g, (full, n) => {
    const i = Number(n);
    return tokens[i] != null ? tokens[i] : full;
  });
  out = out.replace(/\[\[([^\]]+)\]\]/g, (full, inner) => {
    const n = String(inner).replace(/\D/g, '');
    return n !== '' && tokens[n] != null ? tokens[n] : full;
  });
  return out;
}

/**
 * Best-effort extract of PHRASES_PT / TERMS_PT from translation_dict.py.
 * Handles simple "key": "value" and 'key': 'value' entries (escaped quotes).
 */
function loadPtDictSeed() {
  if (!fs.existsSync(DICT_PATH)) return { phrases: {}, terms: {} };
  const src = fs.readFileSync(DICT_PATH, 'utf8');
  function extractBlock(name) {
    const start = src.indexOf(name + ' = {');
    if (start === -1) return {};
    let i = src.indexOf('{', start);
    let depth = 0;
    let end = -1;
    for (; i < src.length; i++) {
      const ch = src[i];
      if (ch === '{') depth += 1;
      else if (ch === '}') {
        depth -= 1;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    if (end === -1) return {};
    const body = src.slice(src.indexOf('{', start) + 1, end);
    const map = {};
    function unescapePy(s) {
      return String(s)
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\'/g, "'")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');
    }
    const re = /(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)')\s*:\s*(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)')/g;
    let m;
    while ((m = re.exec(body))) {
      try {
        const key = unescapePy(m[1] != null ? m[1] : m[2]);
        const val = unescapePy(m[3] != null ? m[3] : m[4]);
        map[key] = val;
      } catch (_) {
        /* skip malformed entry */
      }
    }
    return map;
  }
  const phrases = extractBlock('PHRASES_PT');
  const terms = extractBlock('TERMS_PT');
  console.log(
    `PT dict seed: ${Object.keys(phrases).length} phrases, ${Object.keys(terms).length} terms`
  );
  return { phrases, terms };
}

async function translateBatch(texts, target) {
  let attempt = 0;
  while (attempt < 6) {
    try {
      const res = await translate(texts, { from: 'en', to: target, forceBatch: true });
      if (Array.isArray(res)) return res.map((r) => r.text);
      return [res.text];
    } catch (err) {
      attempt += 1;
      console.warn(`  batch retry ${attempt} (${target}): ${err.message || err}`);
      await sleep(900 * attempt);
    }
  }
  fail(`batch translate failed for ${target}`);
}

async function translatePack(en, target, cache, seedFn) {
  const keys = Object.keys(en);
  const out = {};
  const cacheLang = cache[target] || (cache[target] = {});
  let seeded = 0;

  const pendingKeys = [];
  for (const key of keys) {
    const src = en[key];
    if (typeof seedFn === 'function') {
      const seededVal = seedFn(src);
      if (typeof seededVal === 'string') {
        out[key] = seededVal;
        seeded += 1;
        continue;
      }
    }
    if (cacheLang[key] && cacheLang[key].src === src && typeof cacheLang[key].dst === 'string') {
      out[key] = cacheLang[key].dst;
    } else {
      pendingKeys.push(key);
    }
  }
  console.log(
    `[${target}] seeded ${seeded}, cached ${keys.length - seeded - pendingKeys.length}, translating ${pendingKeys.length}`
  );

  for (let i = 0; i < pendingKeys.length; i += BATCH) {
    const slice = pendingKeys.slice(i, i + BATCH);
    const prepared = slice.map((key) => protectHtmlAndBrands(en[key]));
    const payload = prepared.map((p) => p.text);
    const translated = await translateBatch(payload, target);
    for (let j = 0; j < slice.length; j++) {
      const key = slice[j];
      const dst = restoreTokens(translated[j], prepared[j].tokens);
      out[key] = dst;
      cacheLang[key] = { src: en[key], dst };
    }
    fs.writeFileSync(CACHE_PATH, JSON.stringify(cache), 'utf8');
    console.log(`[${target}] ${Math.min(i + BATCH, pendingKeys.length)}/${pendingKeys.length}`);
    await sleep(PAUSE_MS);
  }

  for (const key of keys) {
    if (typeof out[key] !== 'string') {
      if (cacheLang[key] && typeof cacheLang[key].dst === 'string') out[key] = cacheLang[key].dst;
      else fail(`${target} missing translation for ${key}`);
    }
  }
  return out;
}

function serializeCompact(dict) {
  const langs = Object.keys(dict).map((lang) => {
    const entries = Object.keys(dict[lang]).map(
      (k) => JSON.stringify(k) + ': ' + JSON.stringify(dict[lang][k])
    );
    return JSON.stringify(lang) + ': {' + entries.join(', ') + '}';
  });
  return '{' + langs.join(', ') + '}';
}

function orderPack(enKeys, pack) {
  const ordered = {};
  for (const k of enKeys) ordered[k] = pack[k];
  return ordered;
}

async function main() {
  const content = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
  if (!content.en || !content.fr || !content.sw || !content.ar) {
    fail('en/fr/sw/ar missing from i18n-content.json');
  }

  const EXTRA = {
    'mob.language': {
      en: 'Language',
      fr: 'Langue',
      sw: 'Lugha',
      pt: 'Idioma',
      es: 'Idioma',
      ar: 'اللغة'
    },
    'nav.home': { pt: 'Início', es: 'Inicio' },
    'nav.contact': { pt: 'Contacte-nos', es: 'Contáctenos' },
    'assistant.title': { pt: 'Assistente Lake Group', es: 'Asistente Lake Group' }
  };
  for (const [key, vals] of Object.entries(EXTRA)) {
    if (!content.en[key]) content.en[key] = vals.en;
    if (!content.fr[key]) content.fr[key] = vals.fr;
    if (!content.sw[key]) content.sw[key] = vals.sw;
    if (!content.ar[key]) content.ar[key] = vals.ar;
  }

  // Ensure FR/SW/AR have the one key EN may have that they lack.
  const enKeys = Object.keys(content.en);
  for (const lang of ['fr', 'sw', 'ar']) {
    for (const k of enKeys) {
      if (typeof content[lang][k] !== 'string') {
        content[lang][k] = content.en[k];
        console.warn(`Filled missing ${lang}.${k} from English`);
      }
    }
  }

  const { phrases, terms } = loadPtDictSeed();
  const ptSeed = (src) => {
    if (Object.prototype.hasOwnProperty.call(phrases, src)) return phrases[src];
    if (Object.prototype.hasOwnProperty.call(terms, src)) return terms[src];
    return null;
  };

  let cache = {};
  if (fs.existsSync(CACHE_PATH)) {
    try {
      cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
    } catch (_) {
      cache = {};
    }
  }

  console.log('Translating', enKeys.length, 'keys → pt, es (removing hi)');
  const pt = await translatePack(content.en, 'pt', cache, ptSeed);
  const es = await translatePack(content.en, 'es', cache, null);

  for (const [key, vals] of Object.entries(EXTRA)) {
    if (vals.pt) pt[key] = vals.pt;
    if (vals.es) es[key] = vals.es;
  }

  // Corporate Spanish: prefer nosotros over nosotras in site copy.
  for (const key of Object.keys(es)) {
    if (typeof es[key] === 'string' && es[key].includes('nosotras')) {
      es[key] = es[key].replace(/nosotras/g, 'nosotros');
    }
  }

  for (const packName of ['pt', 'es']) {
    const pack = packName === 'pt' ? pt : es;
    const missing = enKeys.filter((k) => typeof pack[k] !== 'string');
    if (missing.length) fail(`${packName} missing ${missing.length} keys (e.g. ${missing[0]})`);
  }

  const out = {
    en: orderPack(enKeys, content.en),
    fr: orderPack(enKeys, content.fr),
    sw: orderPack(enKeys, content.sw),
    pt: orderPack(enKeys, pt),
    es: orderPack(enKeys, es),
    ar: orderPack(enKeys, content.ar)
  };

  fs.writeFileSync(JSON_PATH, JSON.stringify(out, null, 2), 'utf8');
  fs.writeFileSync(JS_PATH, 'window.__LAKE_I18N_CONTENT__ = ' + serializeCompact(out) + ';\n', 'utf8');

  let dictHits = 0;
  for (const k of enKeys) {
    const src = content.en[k];
    if (phrases[src] || terms[src]) dictHits += 1;
  }

  console.log('Wrote', path.relative(ROOT, JSON_PATH), 'and', path.relative(ROOT, JS_PATH));
  console.log('Locales:', Object.keys(out).join(', '));
  console.log(
    'pt keys:',
    Object.keys(out.pt).length,
    `| dict seed hits: ${dictHits} (${Math.round((dictHits * 100) / enKeys.length)}%)`
  );
  console.log('es keys:', Object.keys(out.es).length);
  console.log('hi removed:', !Object.prototype.hasOwnProperty.call(out, 'hi'));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
