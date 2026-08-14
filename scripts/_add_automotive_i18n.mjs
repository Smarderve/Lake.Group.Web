#!/usr/bin/env node
/**
 * One-off migration: adds the Automotive sector nav key and the three new
 * company keys to assets/i18n-content.js and assets/i18n-content.json for all
 * 6 languages. Inserts the keys right after the existing agro keys so ordering
 * stays consistent. Preserves each file's own line endings (LF vs CRLF).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const VALS = {
  'nav.dd.automotive': {
    en: 'Automotive Sector', fr: 'Secteur automobile', sw: 'Sekta ya Magari',
    pt: 'Setor Automotivo', es: 'Sector automotriz', ar: 'قطاع السيارات',
  },
  'nav.co.assemblyTech': {
    en: 'Assembly Tech Limited', fr: 'Assembly Tech Limited', sw: 'Assembly Tech Limited',
    pt: 'Assembly Tech Limited', es: 'Assembly Tech Limited', ar: 'أسمبلي تك المحدودة',
  },
  'nav.co.agrinovaTech': {
    en: 'AgriNova Tech Limited', fr: 'AgriNova Tech Limited', sw: 'AgriNova Tech Limited',
    pt: 'AgriNova Tech Limited', es: 'AgriNova Tech Limited', ar: 'أغرينوفا تك المحدودة',
  },
  'nav.co.nextDriveMotors': {
    en: 'NextDrive Motors Limited', fr: 'NextDrive Motors Limited', sw: 'NextDrive Motors Limited',
    pt: 'NextDrive Motors Limited', es: 'NextDrive Motors Limited', ar: 'نيكست درايف موتورز المحدودة',
  },
};
const LANGS = ['en', 'fr', 'sw', 'pt', 'es', 'ar'];

function escapeJson(s) {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function insertKeys(text, isJson) {
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.split(eol);
  const out = [];
  let insertedSector = new Set();
  let insertedCompany = new Set();

  for (const line of lines) {
    out.push(line);
    // After a nav.dd.agro line, insert nav.dd.automotive for that language block.
    const sectorMatch = line.match(/^\s*"nav\.dd\.agro":\s*"[^"]*",?\s*$/);
    if (sectorMatch) {
      // Determine which language block we are in: track by scanning for the
      // opening language keys. We track the current language as we go.
      out.push(...mkLines('nav.dd.automotive', curLang, isJson, eol));
      insertedSector.add(curLang);
    }
    const coMatch = line.match(/^\s*"nav\.co\.lakeAgro":\s*"[^"]*",?\s*$/);
    if (coMatch) {
      out.push(...mkCompanyLines(curLang, isJson, eol));
      insertedCompany.add(curLang);
    }
    const langOpen = line.match(/^\s*"([a-z]{2})":\s*\{\s*$/);
    if (langOpen) curLang = langOpen[1];
  }
  return out.join(eol);
}

let curLang = 'en';
function mkLines(key, lang, isJson, eol) {
  const indent = isJson ? '    ' : '    ';
  const val = VALS[key][lang];
  return [`${indent}"${key}": "${escapeJson(val)}",`];
}
function mkCompanyLines(lang, isJson, eol) {
  const indent = isJson ? '    ' : '    ';
  return ['nav.co.assemblyTech', 'nav.co.agrinovaTech', 'nav.co.nextDriveMotors'].map(
    (k) => `${indent}"${k}": "${escapeJson(VALS[k][lang])}",`
  );
}

for (const fn of ['assets/i18n-content.js', 'assets/i18n-content.json']) {
  const filePath = path.join(ROOT, fn);
  let text = fs.readFileSync(filePath, 'utf8');
  const isJson = fn.endsWith('.json');
  const before = text;
  let out;
  if (isJson) {
    out = insertKeys(text, true);
  } else {
    // JS file: strip wrapper, run insertion, rewrap.
    const m = text.match(/^window\.__LAKE_I18N_CONTENT__ = ([\s\S]*?);\s*$/);
    const body = insertKeys(m[1], false);
    out = `window.__LAKE_I18N_CONTENT__ = ${body};\n`;
  }
  if (out !== before) {
    fs.writeFileSync(filePath, out, 'utf8');
    console.log('updated ' + fn);
  } else {
    console.log('NO CHANGE ' + fn);
  }
}
console.log('done');
