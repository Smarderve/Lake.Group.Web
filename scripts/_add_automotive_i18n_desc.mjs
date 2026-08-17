#!/usr/bin/env node
/**
 * Addendum: adds neutral services.desc keys for the three new automotive
 * companies (no company data invented - "Part of the Lake Group" only).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const VALS = {
  'services.desc.assemblyTech': {
    en: 'Part of the Lake Group.', fr: 'Membre du groupe Lake Group.', sw: 'Sehemu ya Lake Group.',
    pt: 'Parte do Lake Group.', es: 'Parte de Lake Group.', ar: 'جزء من مجموعة ليك.',
  },
  'services.desc.agrinovaTech': {
    en: 'Part of the Lake Group.', fr: 'Membre du groupe Lake Group.', sw: 'Sehemu ya Lake Group.',
    pt: 'Parte do Lake Group.', es: 'Parte de Lake Group.', ar: 'جزء من مجموعة ليك.',
  },
  'services.desc.nextDriveMotors': {
    en: 'Part of the Lake Group.', fr: 'Membre du groupe Lake Group.', sw: 'Sehemu ya Lake Group.',
    pt: 'Parte do Lake Group.', es: 'Parte de Lake Group.', ar: 'جزء من مجموعة ليك.',
  },
};
const LANGS = ['en', 'fr', 'sw', 'pt', 'es', 'ar'];

function escapeJson(s) {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function insertKeys(text) {
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.split(eol);
  const out = [];
  let curLang = 'en';
  for (const line of lines) {
    out.push(line);
    const langOpen = line.match(/^\s*"([a-z]{2})":\s*\{\s*$/);
    if (langOpen) curLang = langOpen[1];
    // Insert after the lakeAgro desc key, which exists in every language.
    if (/^\s*"services\.desc\.lakeAgro":\s*"[^"]*",?\s*$/.test(line)) {
      for (const k of ['services.desc.assemblyTech', 'services.desc.agrinovaTech', 'services.desc.nextDriveMotors']) {
        out.push(`    "${k}": "${escapeJson(VALS[k][curLang])}",`);
      }
    }
  }
  return out.join(eol);
}

for (const fn of ['assets/i18n-content.js', 'assets/i18n-content.json']) {
  const filePath = path.join(ROOT, fn);
  let text = fs.readFileSync(filePath, 'utf8');
  const before = text;
  if (fn.endsWith('.json')) {
    text = insertKeys(text);
  } else {
    const m = text.match(/^window\.__LAKE_I18N_CONTENT__ = ([\s\S]*?);\s*$/);
    text = `window.__LAKE_I18N_CONTENT__ = ${insertKeys(m[1])};\n`;
  }
  if (text !== before) {
    fs.writeFileSync(filePath, text, 'utf8');
    console.log('updated ' + fn);
  } else {
    console.log('NO CHANGE ' + fn);
  }
}
console.log('done');
