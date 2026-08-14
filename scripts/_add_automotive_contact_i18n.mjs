#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const VALS = {
  en: 'Automotive', fr: 'Automobile', sw: 'Magari', pt: 'Automotivo', es: 'Automotriz', ar: 'السيارات',
};

function insertKeys(text) {
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.split(eol);
  const out = [];
  let curLang = 'en';
  for (const line of lines) {
    out.push(line);
    const langOpen = line.match(/^\s*"([a-z]{2})":\s*\{\s*$/);
    if (langOpen) curLang = langOpen[1];
    if (/^\s*"contact\.div\.realEstate":\s*"[^"]*",?\s*$/.test(line)) {
      out.push(`    "contact.div.automotive": "${VALS[curLang]}",`);
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
