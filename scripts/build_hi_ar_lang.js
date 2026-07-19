/**
 * Build Hindi (hi) and Arabic (ar) dictionaries from English, then rewrite
 * assets/i18n-content.json + assets/i18n-content.js with full key parity.
 *
 * Run from repo root: node scripts/build_hi_ar_lang.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { translate } = require('google-translate-api-x');

const ROOT = path.join(__dirname, '..');
const JSON_PATH = path.join(ROOT, 'assets', 'i18n-content.json');
const JS_PATH = path.join(ROOT, 'assets', 'i18n-content.js');
const CACHE_PATH = path.join(__dirname, '_hi_ar_cache.json');

const BATCH = 40;
const PAUSE_MS = 400;

// Proper nouns / brand tokens kept Latin across locales (same approach as FR/SW).
const PROTECT = [
  'Lake Oil Group', 'Lake Group', 'Lake Oil', 'Lake Aviation', 'Lake Gas',
  'Lake Lubes', 'Lake Buildings', 'Lake Plastics', 'Lake Steel', 'Lake Cylinders',
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
  // Legacy / MT-mangled forms from earlier builds
  out = out.replace(/\[\[([^\]]+)\]\]/g, (full, inner) => {
    const n = String(inner).replace(/\D/g, '');
    return n !== '' && tokens[n] != null ? tokens[n] : full;
  });
  return out;
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

async function translatePack(en, target, cache) {
  const keys = Object.keys(en);
  const out = {};
  const cacheLang = cache[target] || (cache[target] = {});

  const pendingKeys = [];
  for (const key of keys) {
    const src = en[key];
    if (cacheLang[key] && cacheLang[key].src === src && typeof cacheLang[key].dst === 'string') {
      out[key] = cacheLang[key].dst;
    } else {
      pendingKeys.push(key);
    }
  }
  console.log(`[${target}] cached ${keys.length - pendingKeys.length}, translating ${pendingKeys.length}`);

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

  // Ensure every key present (cached + new)
  for (const key of keys) {
    if (typeof out[key] !== 'string') out[key] = cacheLang[key].dst;
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

async function main() {
  const content = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
  if (!content.en || !content.fr || !content.sw) fail('en/fr/sw missing');

  const EXTRA = {
    'mob.language': {
      en: 'Language',
      fr: 'Langue',
      sw: 'Lugha',
      hi: 'भाषा',
      ar: 'اللغة'
    }
  };
  for (const [key, vals] of Object.entries(EXTRA)) {
    if (!content.en[key]) content.en[key] = vals.en;
    if (!content.fr[key]) content.fr[key] = vals.fr;
    if (!content.sw[key]) content.sw[key] = vals.sw;
  }

  let cache = {};
  if (fs.existsSync(CACHE_PATH)) {
    try { cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8')); } catch (_) { cache = {}; }
  }

  console.log('Translating', Object.keys(content.en).length, 'keys → hi, ar');
  const hi = await translatePack(content.en, 'hi', cache);
  const ar = await translatePack(content.en, 'ar', cache);

  for (const [key, vals] of Object.entries(EXTRA)) {
    hi[key] = vals.hi;
    ar[key] = vals.ar;
  }

  const enKeys = Object.keys(content.en);
  for (const packName of ['hi', 'ar']) {
    const pack = packName === 'hi' ? hi : ar;
    const missing = enKeys.filter((k) => typeof pack[k] !== 'string');
    const extra = Object.keys(pack).filter((k) => !Object.prototype.hasOwnProperty.call(content.en, k));
    if (missing.length || extra.length) {
      fail(`${packName} key parity fail missing=${missing.length} extra=${extra.length}`);
    }
  }

  const hiOrdered = {};
  const arOrdered = {};
  for (const k of enKeys) {
    hiOrdered[k] = hi[k];
    arOrdered[k] = ar[k];
  }

  const out = {
    en: content.en,
    fr: content.fr,
    sw: content.sw,
    hi: hiOrdered,
    ar: arOrdered
  };

  fs.writeFileSync(JSON_PATH, JSON.stringify(out, null, 2), 'utf8');
  fs.writeFileSync(JS_PATH, 'window.__LAKE_I18N_CONTENT__ = ' + serializeCompact(out) + ';\n', 'utf8');
  console.log('Wrote', path.relative(ROOT, JSON_PATH), 'and', path.relative(ROOT, JS_PATH));
  console.log('hi keys:', Object.keys(hiOrdered).length, 'ar keys:', Object.keys(arOrdered).length);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
