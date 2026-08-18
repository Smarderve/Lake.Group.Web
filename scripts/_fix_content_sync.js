#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const FF = '\uFFFD';

function read(f) { return fs.readFileSync(path.join(ROOT, f), 'utf8'); }
function write(f, c) { fs.writeFileSync(path.join(ROOT, f), c); }

const changes = [];
let nRules = 0;

function apply(file, old, nw, note) {
  const c = read(file);
  if (!c.includes(old)) { console.log('MISS ' + file + ' :: ' + JSON.stringify(old.slice(0, 80))); return; }
  const count = c.split(old).length - 1;
  write(file, c.split(old).join(nw));
  nRules++;
  changes.push(file + ' (' + count + 'x) ' + note);
}

/* ============ PART 1: mojibake FFFD ============ */
const MOJI_FILES = [
  'about.html', 'aficd.html', 'africa-network.html', 'atl.html', 'contact.html',
  'dashboard.html', 'fleet.html', 'gallery.html', 'gulf-aggregates.html',
  'lake-agro.html', 'lake-lubes.html', 'lake-oil.html', 'lake-premix-cement.html',
  'lake-steel.html', 'leadership-ally-edha-awadh.html', 'leadership-bibhuti-singh.html',
  'leadership-biji-lapat.html', 'leadership-dileep-kumar.html', 'leadership-juma-nuru.html',
  'leadership-mohammed-khalid.html', 'leadership-sridhar-mani.html', 'leadership.html',
  'media-center.html', 'sustainability.html',
];

// rule 1: dashboard placeholder (8 FFFD -> bullets, matches dictionary dashboard.76)
apply('dashboard.html', 'placeholder="' + FF.repeat(8) + '"', 'placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"', 'password placeholder -> bullets');

const GLOBAL_ORDERED = [
  { re: /m\uFFFD/g, r: 'm\u00B3', note: 'm? -> m\u00B3' },
  { re: /(\d)\uFFFD(C)/g, r: '$1\u00B0$2', note: '?C -> \u00B0C' },
  { re: /12\uFFFD40k/g, r: '12\u201340k', note: '12?40k -> 12-40k' },
  { re: /12,000\uFFFD40,000/g, r: '12,000\u201340,000', note: '12,000?40,000 -> en dash' },
  { re: /Zambia\uFFFD?Tanzania/g, r: 'Zambia\u2013Tanzania', note: 'Zambia?Tanzania -> en dash' },
  { re: /Kasavubu\uFFFD?Kimbangu/g, r: 'Kasavubu\u2013Kimbangu', note: 'Kasavubu?Kimbangu -> en dash' },
  { re: /Monday \uFFFD? Friday/g, r: 'Monday \u2013 Friday', note: 'Monday?Friday -> en dash' },
  { re: /9:00 \uFFFD? 18:00/g, r: '9:00 \u2013 18:00', note: '9:00?18:00 -> en dash' },
  { re: /9:00 AM \uFFFD? 6:00 PM EAT/g, r: '9:00 AM \u2013 6:00 PM EAT', note: '9AM?6PM -> en dash' },
  { re: /\uFFFD?s/g, r: '\u2019s', note: '?s -> curly apostrophe' },
  { re: /\uFFFD?With a team/g, r: '\u201CWith a team', note: 'quote open -> curly' },
  { re: /marketplace\.\uFFFD?/g, r: 'marketplace.\u201D', note: 'quote close -> curly' },
  { re: /\uFFFD/g, r: '\u00B7', note: 'blanket ? -> middle dot' },
];

for (const f of MOJI_FILES) {
  let c = read(f);
  const before = (c.match(/\uFFFD/g) || []).length;
  if (!before) { console.log('SKIP (clean) ' + f); continue; }
  for (const r of GLOBAL_ORDERED) {
    c = c.replace(r.re, r.r);
  }
  write(f, c);
  const after = (c.match(/\uFFFD/g) || []).length;
  nRules++;
  changes.push(f + ' FFFD ' + before + ' -> ' + after + ' (blanket rules applied)');
  if (after) console.log('REMAINING FFFD in ' + f + ': ' + after);
}

/* ============ PART 2: numeric / country fixes (static) ============ */
// lake-gas: 7 countries -> 6 (canonical: TZ, ZM, CD, KE, BI, RW)
{
  let c = read('lake-gas.html');
  let n = (c.match(/7 East and Central African countries/g) || []).length + (c.match(/across 7 countries/g) || []).length + (c.match(/operating across 7 countries/g) || []).length;
  const b1 = (c.match(/7 East and Central African countries/g) || []).length;
  const b2 = (c.match(/across 7 countries/g) || []).length;
  c = c.split('7 East and Central African countries').join('6 East and Central African countries');
  c = c.split('across 7 countries').join('across 6 countries');
  write('lake-gas.html', c);
  nRules++; changes.push('lake-gas.html 7->6 countries (a7eca:' + b1 + ', a7c:' + b2 + ')');
}
// lake-lubes: 2 countries -> 5 (TZ, KE, ZM, RW, CD)
apply('lake-lubes.html', 'across 2 East and Central African countries', 'across 5 East and Central African countries', 'meta 2->5 countries');
apply('lake-lubes.html', 'Available in 2 East and Central African countries', 'Available in 5 East and Central African countries', 'checklist 2->5 countries');
// services.html meta x3: 17/five -> 22/six
const SVC_OLD = '17 independent companies across five divisions: Lake Energies, Manufacturing, Logistics, Real Estate and Agro Processing.';
const SVC_NEW = '22 independent companies across six divisions: Lake Energies, Manufacturing, Logistics, Real Estate, Agro Processing and Automotive.';
apply('services.html', SVC_OLD, SVC_NEW, 'meta 17/5 -> 22/6');
// investors <30,000+< mangled
apply('investors.html', '<30,000+<', '30,000+', 'mangled stat tag');
// leadership.html 30,000+ mangled
apply('leadership.html', 'with <30,000+< professionals', 'with 30,000+ professionals', 'mangled stat tag');
// leadership-ally: 8+ -> 10+ countries, <30,000+< -> 30,000+
apply('leadership-ally-edha-awadh.html', '<strong data-i18n="leadership.86">Countries</strong><span>8+</span>', '<strong data-i18n="leadership.86">Countries</strong><span>10+</span>', 'countries 8+ -> 10+');
apply('leadership-ally-edha-awadh.html', 'data-i18n-number data-number="<30,000+<"><30,000+<', 'data-i18n-number data-number="30,000+">30,000+', 'people stat mangled');
// fleet: Countries 3 -> 8 (Lake Trans corridors)
apply('fleet.html', '<span class="fs-stat-no"><em>3</em></span>\n        <span data-i18n="fleet.6" class="fs-stat-label">Countries</span>', '<span class="fs-stat-no"><em>8</em></span>\n        <span data-i18n="fleet.6" class="fs-stat-label">Countries</span>', 'fleet countries 3 -> 8');
// sustainability: 4.6K+ -> 30,000+ (csr.html claims 30,000+ local jobs)
apply('sustainability.html', '<div data-i18n="sustainability.23" class="fs-stat-no">4.6K+</div>', '<div data-i18n="sustainability.23" class="fs-stat-no">30,000+</div>', 'jobs stat 4.6K+ -> 30,000+');
// africa-network: KE badge 4->5 (card lists 5 items incl Lake Agro Yala Swamp); ZM card 4->5 (card lists 5 items)
apply('africa-network.html', '<span data-i18n="africa_network.57" class="badge badge-yellow">4 Subsidiaries</span>', '<span data-i18n="africa_network.57" class="badge badge-yellow">5 Subsidiaries</span>', 'KE badge 4 -> 5');
apply('africa-network.html', '<p data-i18n="africa_network.32">4 subsidiaries</p>', '<p data-i18n="africa_network.32">5 subsidiaries</p>', 'ZM card 4 -> 5');
// africa-network: countries array add ug
apply('africa-network.html', "const countries = ['tz','ke','zm','rw','bi','cd','et','mz','ae']", "const countries = ['tz','ke','zm','rw','bi','cd','et','mz','ug','ae']", 'countries array + ug');
// index OG/Twitter: add Uganda + UAE
apply('index.html', '152 fuel stations across Tanzania, Kenya, Zambia, Rwanda, Burundi, DR Congo, Ethiopia and Mozambique.', '152 fuel stations across Tanzania, Kenya, Zambia, Rwanda, Burundi, DR Congo, Ethiopia, Uganda, Mozambique and the UAE.', 'OG country list +UG+UAE');
// index body (index.35 static): 20+ -> 18+ subsidiaries, countries +UG+UAE
apply('index.html', 'fuel stations and 20+\n            subsidiaries, Lake Group powers everyday life across Tanzania,\n            Kenya, Zambia, Rwanda, Burundi, DR Congo, Ethiopia and Mozambique.', 'fuel stations and 18+\n            subsidiaries, Lake Group powers everyday life across Tanzania,\n            Kenya, Zambia, Rwanda, Burundi, DR Congo, Ethiopia, Uganda,\n            Mozambique and the UAE.', 'index.35 static 20+->18+, +UG+UAE');
// index: Eight Sectors -> Six Sectors
apply('index.html', 'Eight Sectors. One Vision.', 'Six Sectors. One Vision.', 'index.45 eight -> six');
// about: ose.s5.eyebrow
apply('about.html', 'eight sectors, one vision', 'six sectors, one vision', 'ose.s5.eyebrow eight -> six');
// history.html: restore em-dashes in static fallback (DB canonical)
const HIST_DASH = [
  ["in Zambia  the Group's first", "in Zambia \u2014 the Group's first"],
  ['Rwanda  established in Kigali in 2011  begins', 'Rwanda \u2014 established in Kigali in 2011 \u2014 begins'],
  ['cylinders  non-explosive, lightweight', 'cylinders \u2014 non-explosive, lightweight'],
  ["network  a landmark step", 'network \u2014 a landmark step'],
  ['terminal  1,000 MT of capacity', 'terminal \u2014 1,000 MT of capacity'],
  ['Kibaha  the first producer', 'Kibaha \u2014 the first producer'],
];
for (const [o, n] of HIST_DASH) apply('history.html', o, n, 'em-dash restore');

/* ============ PART 3: dictionary (i18n-content.js + .json, 6 langs) ============ */
const dictFiles = ['assets/i18n-content.js', 'assets/i18n-content.json'];
const DICT_FIXES = [
  // services.hero.lede: count + divisions per language
  ['en', 'services.hero.lede', '17 independent companies across five divisions - Lake Energies, Manufacturing, Logistics, Real Estate and Agro Processing.', '22 independent companies across six divisions - Lake Energies, Manufacturing, Logistics, Real Estate, Agro Processing and Automotive.'],
  ['en', 'services.hero.lede', '19 independent companies across five divisions - Lake Energies, Manufacturing, Logistics, Real Estate and Agro Processing.', '22 independent companies across six divisions - Lake Energies, Manufacturing, Logistics, Real Estate, Agro Processing and Automotive.'],
  ['fr', 'services.hero.lede', '17 soci\u00E9t\u00E9s ind\u00E9pendantes dans cinq divisions - Lake Energies, Fabrication, Logistique, Immobilier et Agroalimentaire.', '22 soci\u00E9t\u00E9s ind\u00E9pendantes dans six divisions - Lake Energies, Fabrication, Logistique, Immobilier, Agroalimentaire et Automobile.'],
  ['fr', 'services.hero.lede', '19 soci\u00E9t\u00E9s ind\u00E9pendantes dans cinq divisions - Lake Energies, Fabrication, Logistique, Immobilier et Agroalimentaire.', '22 soci\u00E9t\u00E9s ind\u00E9pendantes dans six divisions - Lake Energies, Fabrication, Logistique, Immobilier, Agroalimentaire et Automobile.'],
  ['sw', 'services.hero.lede', 'Kampuni 17 huru katika vitengo vitano - Lake Energies, Utengenezaji, Usafirishaji, Mali Isiyohamishika na Usindikaji wa Kilimo.', 'Kampuni 22 huru katika vitengo sita - Lake Energies, Utengenezaji, Usafirishaji, Mali Isiyohamishika, Usindikaji wa Kilimo na Magari.'],
  ['sw', 'services.hero.lede', 'Kampuni 19 huru katika vitengo vitano - Lake Energies, Utengenezaji, Usafirishaji, Mali Isiyohamishika na Usindikaji wa Kilimo.', 'Kampuni 22 huru katika vitengo sita - Lake Energies, Utengenezaji, Usafirishaji, Mali Isiyohamishika, Usindikaji wa Kilimo na Magari.'],
  ['pt', 'services.hero.lede', '17 empresas independentes em cinco divis\u00F5es - Lake Energies, Manufacturing, Logistics, Real Estate e Agro Processing.', '22 empresas independentes em seis divis\u00F5es - Lake Energies, Manufacturing, Logistics, Real Estate, Agro Processing e Automotive.'],
  ['pt', 'services.hero.lede', '19 empresas independentes em cinco divis\u00F5es - Lake Energies, Manufacturing, Logistics, Real Estate e Agro Processing.', '22 empresas independentes em seis divis\u00F5es - Lake Energies, Manufacturing, Logistics, Real Estate, Agro Processing e Automotive.'],
  ['es', 'services.hero.lede', '17 empresas independientes en cinco divisiones: Lake Energies, Fabricaci\u00F3n, Log\u00EDstica, Bienes Ra\u00EDces y Agro Processing.', '22 empresas independientes en seis divisiones: Lake Energies, Fabricaci\u00F3n, Log\u00EDstica, Bienes Ra\u00EDces, Agro Processing y Automotriz.'],
  ['es', 'services.hero.lede', '19 empresas independientes en cinco divisiones: Lake Energies, Fabricaci\u00F3n, Log\u00EDstica, Bienes Ra\u00EDces y Agro Processing.', '22 empresas independientes en seis divisiones: Lake Energies, Fabricaci\u00F3n, Log\u00EDstica, Bienes Ra\u00EDces, Agro Processing y Automotriz.'],
  ['ar', 'services.hero.lede', '\u0661\u0667 \u0634\u0631\u0643\u0629 \u0645\u0633\u062A\u0642\u0644\u0629 \u0639\u0628\u0631 \u062E\u0645\u0633 \u0648\u062D\u062F\u0627\u062A - Lake Energies\u060C \u0627\u0644\u062A\u0635\u0646\u064A\u0639\u060C \u0627\u0644\u0644\u0648\u062C\u0633\u062A\u064A\u0627\u062A\u060C \u0627\u0644\u0639\u0642\u0627\u0631\u0627\u062A \u0648\u0627\u0644\u062A\u0635\u0646\u064A\u0639 \u0627\u0644\u0632\u0631\u0627\u0639\u064A.', '\u0662\u0662 \u0634\u0631\u0643\u0629 \u0645\u0633\u062A\u0642\u0644\u0629 \u0639\u0628\u0631 \u0633\u062A \u0648\u062D\u062F\u0627\u062A - Lake Energies\u060C \u0627\u0644\u062A\u0635\u0646\u064A\u0639\u060C \u0627\u0644\u0644\u0648\u062C\u0633\u062A\u064A\u0627\u062A\u060C \u0627\u0644\u0639\u0642\u0627\u0631\u0627\u062A\u060C \u0627\u0644\u062A\u0635\u0646\u064A\u0639 \u0627\u0644\u0632\u0631\u0627\u0639\u064A \u0648\u0627\u0644\u0633\u064A\u0627\u0631\u0627\u062A.'],
  ['ar', 'services.hero.lede', '\u0661\u0669 \u0634\u0631\u0643\u0629 \u0645\u0633\u062A\u0642\u0644\u0629 \u0639\u0628\u0631 \u062E\u0645\u0633 \u0648\u062D\u062F\u0627\u062A - Lake Energies\u060C \u0627\u0644\u062A\u0635\u0646\u064A\u0639\u060C \u0627\u0644\u0644\u0648\u062C\u0633\u062A\u064A\u0627\u062A\u060C \u0627\u0644\u0639\u0642\u0627\u0631\u0627\u062A \u0648\u0627\u0644\u062A\u0635\u0646\u064A\u0639 \u0627\u0644\u0632\u0631\u0627\u0639\u064A.', '\u0662\u0662 \u0634\u0631\u0643\u0629 \u0645\u0633\u062A\u0642\u0644\u0629 \u0639\u0628\u0631 \u0633\u062A \u0648\u062D\u062F\u0627\u062A - Lake Energies\u060C \u0627\u0644\u062A\u0635\u0646\u064A\u0639\u060C \u0627\u0644\u0644\u0648\u062C\u0633\u062A\u064A\u0627\u062A\u060C \u0627\u0644\u0639\u0642\u0627\u0631\u0627\u062A\u060C \u0627\u0644\u062A\u0635\u0646\u064A\u0639 \u0627\u0644\u0632\u0631\u0627\u0639\u064A \u0648\u0627\u0644\u0633\u064A\u0627\u0631\u0627\u062A.'],
  // history em-dash restorations (EN)
  ['en', 'history.11', 'in Zambia  the Group', 'in Zambia \u2014 the Group'],
  ['en', 'history.15', 'Lake Petroleum Rwanda  established in Kigali in 2011  begins', 'Lake Petroleum Rwanda \u2014 established in Kigali in 2011 \u2014 begins'],
  ['en', 'history.17', 'composite LPG cylinders  non-explosive', 'composite LPG cylinders \u2014 non-explosive'],
  ['en', 'history.19', 'fuel-station network  a landmark', 'fuel-station network \u2014 a landmark'],
  ['en', 'history.21', 'storage terminal  1,000 MT', 'storage terminal \u2014 1,000 MT'],
  ['en', 'history.23', 'Kibaha  the first producer', 'Kibaha \u2014 the first producer'],
  // FR
  ['fr', 'history.11', 'en Zambie  les premi\u00E8res', 'en Zambie \u2014 les premi\u00E8res'],
  ['fr', 'history.15', 'Lake Petroleum Rwanda  cr\u00E9\u00E9e \u00E0 Kigali en 2011  commence', 'Lake Petroleum Rwanda \u2014 cr\u00E9\u00E9e \u00E0 Kigali en 2011 \u2014 commence'],
  ['fr', 'history.17', "d'Afrique  non explosives", "d'Afrique \u2014 non explosives"],
  ['fr', 'history.19', 'Hashi Energy  une \u00E9tape', 'Hashi Energy \u2014 une \u00E9tape'],
  ['fr', 'history.21', "de l'Est  1 000 tonnes", "de l'Est \u2014 1 000 tonnes"],
  ['fr', 'history.23', 'Kibaha  premier producteur', 'Kibaha \u2014 premier producteur'],
  // PT (comma -> em-dash)
  ['pt', 'history.11', 'em Zambia os primeiros', 'em Zambia \u2014 os primeiros'],
  ['pt', 'history.15', 'Lake Petroleum Rwanda estabelecida em Kigali em 2011 come\u00E7a', 'Lake Petroleum Rwanda \u2014 estabelecida em Kigali em 2011 \u2014 come\u00E7a'],
  ['pt', 'history.17', 'de \u00C1frica n\u00E3o explosivos', 'de \u00C1frica \u2014 n\u00E3o explosivos'],
  ['pt', 'history.19', 'da Hashi Energy, um passo', 'da Hashi Energy \u2014 um passo'],
  ['pt', 'history.21', 'de East Africa, com capacidade', 'de East Africa \u2014 com capacidade'],
  ['pt', 'history.23', 'Kibaha, o primeiro', 'Kibaha \u2014 o primeiro'],
  // ES (comma -> em-dash)
  ['es', 'history.11', 'en Zambia, las primeras', 'en Zambia \u2014 las primeras'],
  ['es', 'history.15', 'Kigali en 2011, comienza', 'Kigali en 2011 \u2014 comienza'],
  ['es', 'history.17', 'de \u00C1frica, no explosivos', 'de \u00C1frica \u2014 no explosivos'],
  ['es', 'history.19', 'Hashi Energy, un paso', 'Hashi Energy \u2014 un paso'],
  ['es', 'history.21', 'East Africa, con 1.000', 'East Africa \u2014 con 1.000'],
  ['es', 'history.23', 'Kibaha, el primer', 'Kibaha \u2014 el primer'],
  // SW (hyphen -> em-dash)
  ['sw', 'history.11', 'Zambia - hatua', 'Zambia \u2014 hatua'],
  ['sw', 'history.15', 'Rwanda - iliyoanzishwa Kigali mwaka 2011 - inaanza', 'Rwanda \u2014 iliyoanzishwa Kigali mwaka 2011 \u2014 inaanza'],
  ['sw', 'history.17', 'Afrika - isiyolipuka', 'Afrika \u2014 isiyolipuka'],
  ['sw', 'history.19', 'Kenya - hatua muhimu', 'Kenya \u2014 hatua muhimu'],
  ['sw', 'history.21', 'Mashariki - uwezo', 'Mashariki \u2014 uwezo'],
  ['sw', 'history.23', 'Kibaha - mzalishaji', 'Kibaha \u2014 mzalishaji'],
  // AR history.27: 8 -> 10 countries (8 \u062F\u0648\u0644 -> 10 \u062F\u0648\u0644)
  ['ar', 'history.27', '\u0668 \u062F\u0648\u0644', '\u0661\u0660 \u062F\u0648\u0644'],
  // investors subsidiaries 20+ -> 18+ (EN canonical metric)
  ['en', 'index.35', '152 fuel stations and 20+ subsidiaries', '152 fuel stations and 18+ subsidiaries'],
  ['en', 'investors.15', 'across 10 countries with 20+ subsidiaries', 'across 10 countries with 18+ subsidiaries'],
  ['en', 'investors.32', 'From 1 company in 2006 to 20+ subsidiaries', 'From 1 company in 2006 to 18+ subsidiaries'],
];

function fixDictFile(f) {
  let c = read(f);
  for (const [lang, key, old, nw] of DICT_FIXES) {
    const escapedOld = old.split('\\').join('\\\\').split('"').join('\\"');
    const escapedNew = nw.split('\\').join('\\\\').split('"').join('\\"');
    const re = new RegExp('("' + lang + '"[\\s\\S]*?"' + key + '":\\s*")' + escapedOld.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(")', 'g');
    if (re.test(c)) {
      c = c.replace(re, '$1' + escapedNew + '$2');
      nRules++;
      changes.push(f + ' ' + lang + '.' + key + ' fixed');
    } else {
      console.log('DICT MISS ' + f + ' ' + lang + '.' + key + ' :: ' + JSON.stringify(old.slice(0, 60)));
    }
  }
  write(f, c);
}

// index.35 country list +UG+UAE per language (independent of 18+ fix above)
const IDX35_COUNTRIES = [
  ['en', 'across Tanzania, Kenya, Zambia, Rwanda, Burundi, DR Congo, Ethiopia and Mozambique.', 'across Tanzania, Kenya, Zambia, Rwanda, Burundi, DR Congo, Ethiopia, Uganda, Mozambique and the UAE.'],
  ['fr', ' \u00E0 travers la Tanzanie, le Kenya, la Zambie, le Rwanda, le Burundi, la RD Congo, l\u2019\u00C9thiopie et le Mozambique.', ' \u00E0 travers la Tanzanie, le Kenya, la Zambie, le Rwanda, le Burundi, la RD Congo, l\u2019\u00C9thiopie, l\u2019Ouganda, le Mozambique et les \u00C9mirats arabes unis.'],
  ['pt', 'em toda a Tanz\u00E2nia, Qu\u00E9nia, Z\u00E2mbia, Ruanda, Burundi, RD Congo, Eti\u00F3pia e Mo\u00E7ambique.', 'em toda a Tanz\u00E2nia, Qu\u00E9nia, Z\u00E2mbia, Ruanda, Burundi, RD Congo, Eti\u00F3pia, Uganda, Mo\u00E7ambique e Emirados \u00C1rabes Unidos.'],
  ['es', 'en Tanzania, Kenia, Zambia, Ruanda, Burundi, RD Congo, Etiop\u00EDa y Mozambique.', 'en Tanzania, Kenia, Zambia, Ruanda, Burundi, RD Congo, Etiop\u00EDa, Uganda, Mozambique y los Emiratos \u00C1rabes Unidos.'],
  ['sw', 'Tanzania, Kenya, Zambia, Rwanda, Burundi, DR Congo, Ethiopia na Msumbiji.', 'Tanzania, Kenya, Zambia, Rwanda, Burundi, DR Congo, Ethiopia, Uganda, Msumbiji na Umoja wa Falme za Kiarabu.'],
  ['ar', '\u062A\u0646\u0632\u0627\u0646\u064A\u0627 \u0648\u0643\u064A\u0646\u064A\u0627 \u0648\u0632\u0627\u0645\u0628\u064A\u0627 \u0648\u0631\u0648\u0627\u0646\u062F\u0627 \u0648\u0628\u0648\u0631\u0648\u0646\u062F\u064A \u0648\u062C\u0645\u0647\u0648\u0631\u064A\u0629 \u0627\u0644\u0643\u0648\u0646\u063A\u0648 \u0627\u0644\u062F\u064A\u0645\u0642\u0631\u0627\u0637\u064A\u0629 \u0648\u0625\u062B\u064A\u0648\u0628\u064A\u0627 \u0648\u0627\u0644\u0645\u0648\u0632\u0645\u0628\u064A\u0642.', '\u062A\u0646\u0632\u0627\u0646\u064A\u0627 \u0648\u0643\u064A\u0646\u064A\u0627 \u0648\u0632\u0627\u0645\u0628\u064A\u0627 \u0648\u0631\u0648\u0627\u0646\u062F\u0627 \u0648\u0628\u0648\u0631\u0648\u0646\u062F\u064A \u0648\u062C\u0645\u0647\u0648\u0631\u064A\u0629 \u0627\u0644\u0643\u0648\u0646\u063A\u0648 \u0627\u0644\u062F\u064A\u0645\u0642\u0631\u0627\u0637\u064A\u0629 \u0648\u0625\u062B\u064A\u0648\u0628\u064A\u0627 \u0648\u0623\u0648\u063A\u0646\u062F\u0627 \u0648\u0627\u0644\u0645\u0648\u0632\u0645\u0628\u064A\u0642 \u0648\u0627\u0644\u0625\u0645\u0627\u0631\u0627\u062A \u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0627\u0644\u0645\u062A\u062D\u062F\u0629.'],
];

function fixDictCountryList(f) {
  let c = read(f);
  for (const [lang, old, nw] of IDX35_COUNTRIES) {
    const re = new RegExp('("' + lang + '"[\\s\\S]*?"index\\.35":\\s*")' + old.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(")');
    if (re.test(c)) {
      c = c.replace(re, '$1' + nw + '$2');
      nRules++;
      changes.push(f + ' ' + lang + '.index.35 countries +UG+UAE');
    } else {
      console.log('CTRY MISS ' + f + ' ' + lang + '.index.35 :: ' + JSON.stringify(old.slice(0, 70)));
    }
  }
  write(f, c);
}

for (const f of dictFiles) {
  fixDictFile(f);
  fixDictCountryList(f);
}

// africa_network.30 (KE card 4->5) + .57 (KE badge 4->5) per lang
const AN_FIXES = [
  ['en', 'africa_network.30', '4 subsidiaries', '5 subsidiaries'],
  ['en', 'africa_network.57', '4 Subsidiaries', '5 Subsidiaries'],
  ['fr', 'africa_network.30', '4 filiales', '5 filiales'],
  ['fr', 'africa_network.57', '4 Filiales', '5 Filiales'],
  ['pt', 'africa_network.30', '4 subsidi\u00E1rias', '5 subsidi\u00E1rias'],
  ['pt', 'africa_network.57', '4 Subsidi\u00E1rias', '5 Subsidi\u00E1rias'],
  ['es', 'africa_network.30', '4 subsidiarias', '5 subsidiarias'],
  ['es', 'africa_network.57', '4 Subsidiarias', '5 Subsidiarias'],
  ['sw', 'africa_network.30', 'matawi 4', 'matawi 5'],
  ['sw', 'africa_network.57', 'Matawi 4', 'Matawi 5'],
  ['ar', 'africa_network.30', '\u0664 \u0634\u0631\u0643\u0627\u062A \u062A\u0627\u0628\u0639\u0629', '\u0665 \u0634\u0631\u0643\u0627\u062A \u062A\u0627\u0628\u0639\u0629'],
  ['ar', 'africa_network.57', '\u0664 \u0634\u0631\u0643\u0627\u062A \u062A\u0627\u0628\u0639\u0629', '\u0665 \u0634\u0631\u0643\u0627\u062A \u062A\u0627\u0628\u0639\u0629'],
];
for (const f of dictFiles) {
  let c = read(f);
  for (const [lang, key, old, nw] of AN_FIXES) {
    const re = new RegExp('("' + lang + '"[\\s\\S]*?"' + key + '":\\s*")' + old + '(")');
    if (re.test(c)) {
      c = c.replace(re, '$1' + nw + '$2');
      nRules++;
      changes.push(f + ' ' + lang + '.' + key + ' 4->5');
    } else {
      console.log('AN MISS ' + f + ' ' + lang + '.' + key + ' :: ' + JSON.stringify(old));
    }
  }
  write(f, c);
}

// six sectors (services.4, services.5, index.45, ose.s5.eyebrow) per lang
const SECTOR_WORDS = {
  en: ['eight sectors', 'six sectors', 'eight sectors, one vision', 'six sectors, one vision', 'Eight Sectors', 'Six Sectors', 'Eight Sectors. One Vision.', 'Six Sectors. One Vision.'],
  fr: ['huit secteurs', 'six secteurs', 'huit secteurs, une vision', 'six secteurs, une vision', 'Huit Secteurs', 'Six Secteurs', 'Huit secteurs. Une vision.', 'Six secteurs. Une vision.'],
  pt: ['oito setores', 'seis setores', 'oito setores, uma vis\u00E3o', 'seis setores, uma vis\u00E3o', 'Oito Setores', 'Seis Setores', 'Oito setores. Uma vis\u00E3o.', 'Seis setores. Uma vis\u00E3o.'],
  es: ['ocho sectores', 'seis sectores', 'ocho sectores, una visi\u00F3n', 'seis sectores, una visi\u00F3n', 'Ocho Sectores', 'Seis Sectores', 'Ocho sectores. Una visi\u00F3n.', 'Seis sectores. Una visi\u00F3n.'],
  sw: ['sekta nane', 'sekta sita', 'sekta nane, dira moja', 'sekta sita, dira moja', 'Sekta Nane', 'Sekta Sita', 'Sekta nane. Dira moja.', 'Sekta sita. Dira moja.'],
  ar: ['\u062B\u0645\u0627\u0646\u064A\u0629 \u0642\u0637\u0627\u0639\u0627\u062A', '\u0633\u062A\u0629 \u0642\u0637\u0627\u0639\u0627\u062A', '\u062B\u0645\u0627\u0646\u064A\u0629 \u0642\u0637\u0627\u0639\u0627\u062A\u060C \u0631\u0624\u064A\u0629 \u0648\u0627\u062D\u062F\u0629', '\u0633\u062A\u0629 \u0642\u0637\u0627\u0639\u0627\u062A\u060C \u0631\u0624\u064A\u0629 \u0648\u0627\u062D\u062F\u0629', '\u062B\u0645\u0627\u0646\u064A\u0629 \u0642\u0637\u0627\u0639\u0627\u062A', '\u0633\u062A\u0629 \u0642\u0637\u0627\u0639\u0627\u062A', '\u062B\u0645\u0627\u0646\u064A\u0629 \u0642\u0637\u0627\u0639\u0627\u062A. \u0631\u0624\u064A\u0629 \u0648\u0627\u062D\u062F\u0629.', '\u0633\u062A\u0629 \u0642\u0637\u0627\u0639\u0627\u062A. \u0631\u0624\u064A\u0629 \u0648\u0627\u062D\u062F\u0629.'],
};

for (const f of dictFiles) {
  let c = read(f);
  for (const lang of ['en', 'fr', 'pt', 'es', 'sw', 'ar']) {
    const w = SECTOR_WORDS[lang];
    // services.4 / ose.s5.eyebrow: "eight sectors, one vision" -> "six sectors, one vision"
    for (const key of ['services.4', 'ose.s5.eyebrow']) {
      const re = new RegExp('("' + lang + '"[\\s\\S]*?"' + key + '":\\s*")' + w[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(")');
      if (re.test(c)) {
        c = c.replace(re, '$1' + w[2] + '$2');
        nRules++;
        changes.push(f + ' ' + lang + '.' + key + ' eight->six sectors');
      } else {
        console.log('SEC MISS ' + f + ' ' + lang + '.' + key + ' :: ' + JSON.stringify(w[0]));
      }
    }
    // services.5 / index.45: "Eight Sectors..." -> "Six Sectors..."
    for (const key of ['services.5', 'index.45']) {
      const re = new RegExp('("' + lang + '"[\\s\\S]*?"' + key + '":\\s*")' + w[4].replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(")');
      if (re.test(c)) {
        c = c.replace(re, '$1' + w[6] + '$2');
        nRules++;
        changes.push(f + ' ' + lang + '.' + key + ' Eight->Six Sectors');
      } else {
        console.log('SEC2 MISS ' + f + ' ' + lang + '.' + key + ' :: ' + JSON.stringify(w[4]));
      }
    }
  }
  write(f, c);
}

console.log('---');
console.log('rules applied:', nRules);
console.log(changes.join('\n'));