#!/usr/bin/env node
// One-off: insert the remaining our-story.html keys (start/ending screens,
// scene image alt texts) into the i18n sources that build_sw_lang.js reads:
// en+fr in assets/i18n-content.json, sw in scripts/_sw_out_4.json.
// Idempotent: re-running just overwrites the same values.
'use strict';
const fs = require('fs');
const path = require('path');

const NEW_KEYS = {
  'ose.tagline': {
    en: 'a story since 2006',
    fr: 'une histoire depuis 2006',
    sw: 'hadithi tangu 2006',
  },
  'ose.pressPlay': {
    en: 'press to play',
    fr: 'appuyez pour lancer',
    sw: 'bonyeza ili kuanza',
  },
  'ose.estLine': {
    en: 'Lake Group, est. 2006',
    fr: 'Lake Group, fondé en 2006',
    sw: 'Lake Group, ilianzishwa 2006',
  },
  'ose.visitHome': {
    en: 'Visit Home',
    fr: "Retour à l'accueil",
    sw: 'Rudi Nyumbani',
  },
  'ose.alt.s1': {
    en: 'Lake Oil storage terminal',
    fr: 'Terminal de stockage Lake Oil',
    sw: 'Kituo cha kuhifadhi mafuta cha Lake Oil',
  },
  'ose.alt.s2': {
    en: 'Ally Edha Awadh, Founder & Chairman',
    fr: 'Ally Edha Awadh, fondateur et président',
    sw: 'Ally Edha Awadh, Mwanzilishi na Mwenyekiti',
  },
  'ose.alt.s3': {
    en: 'Lake Trans fleet of trucks',
    fr: 'Flotte de camions Lake Trans',
    sw: 'Msafara wa malori wa Lake Trans',
  },
  'ose.alt.s4': {
    en: 'Lake Gas LPG cylinders',
    fr: 'Bouteilles de GPL Lake Gas',
    sw: 'Mitungi ya gesi ya LPG ya Lake Gas',
  },
  'ose.alt.s5': {
    en: 'GCCP ready-mix concrete trucks',
    fr: "Camions de béton prêt à l'emploi GCCP",
    sw: 'Malori ya zege iliyochanganywa tayari ya GCCP',
  },
  'ose.alt.s6': {
    en: 'Lake Group leadership team',
    fr: 'Équipe de direction de Lake Group',
    sw: 'Timu ya uongozi ya Lake Group',
  },
  'ose.alt.s7': {
    en: 'AFICD container depot at sunset',
    fr: 'Dépôt de conteneurs AFICD au coucher du soleil',
    sw: 'Bohari ya makontena ya AFICD wakati wa machweo',
  },
  'ose.alt.s8': {
    en: 'Lake Group logo',
    fr: 'Logo de Lake Group',
    sw: 'Nembo ya Lake Group',
  },
};

const ANCHOR = 'ose.skipHintAria'; // insert new keys right after the last existing ose.* key

const ROOT = path.join(__dirname, '..');
const JSON_PATH = path.join(ROOT, 'assets', 'i18n-content.json');
const CHUNK_PATH = path.join(__dirname, '_sw_out_4.json');

// en + fr: rebuild each language object with the new keys inserted after ANCHOR.
const content = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
for (const lang of ['en', 'fr']) {
  const src = content[lang];
  const out = {};
  for (const [k, v] of Object.entries(src)) {
    if (k in NEW_KEYS) continue; // drop any previous copy; re-inserted at anchor
    out[k] = v;
    if (k === ANCHOR) {
      for (const nk of Object.keys(NEW_KEYS)) out[nk] = NEW_KEYS[nk][lang];
    }
  }
  content[lang] = out;
}
fs.writeFileSync(JSON_PATH, JSON.stringify(content, null, 2), 'utf8');

// sw: append to chunk 4 (key order inside chunks doesn't matter).
const chunk = JSON.parse(fs.readFileSync(CHUNK_PATH, 'utf8'));
for (const nk of Object.keys(NEW_KEYS)) chunk[nk] = NEW_KEYS[nk].sw;
fs.writeFileSync(CHUNK_PATH, JSON.stringify(chunk, null, 1), 'utf8');

console.log('Inserted', Object.keys(NEW_KEYS).length, 'keys into en/fr (i18n-content.json) and sw (_sw_out_4.json)');
