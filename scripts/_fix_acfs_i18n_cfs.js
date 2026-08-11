'use strict';
/* Fix: add contact.div.cfs in ALL 6 language sections (each after its own contact.div.icd line) */
const fs = require('fs');
const f = 'assets/i18n-content.js';
let s = fs.readFileSync(f, 'utf8');

const pairs = [
  ['Logistics · Inland Container Depot', 'Logistics · Container Freight Station'],
  ['Logistique · Dépôt de conteneurs intérieur', 'Logistique · Station de fret de conteneurs'],
  ['Usafirishaji · Depo ya Kontena Ndani', 'Usafirishaji · Kituo cha Mizigo ya Kontena'],
  ['Logística · Depósito de Contêineres Interior', 'Logística · Estação de Carga de Contêineres'],
  ['Logística · Depósito Interior de Contenedores', 'Logística · Estación de Carga de Contenedores'],
  ['اللوجستيات · مستودع حاويات داخلي', 'اللوجستيات · محطة شحن الحاويات'],
];

let added = 0;
for (const [icdVal, cfsVal] of pairs) {
  const line = '    "contact.div.icd": "' + icdVal + '",';
  const idx = s.indexOf(line);
  if (idx > -1 && !s.includes('"contact.div.cfs": "' + cfsVal + '"')) {
    const insert = '    "contact.div.cfs": "' + cfsVal + '",\r\n';
    s = s.slice(0, idx + line.length) + '\r\n' + insert + s.slice(idx + line.length);
    added++;
  }
}
fs.writeFileSync(f, s);
console.log('inserted cfs after', added, 'language sections');

// validate JSON
const j = s.replace(/window\.__LAKE_I18N_CONTENT__\s*=\s*/, '').replace(/;\s*$/, '');
JSON.parse(j);
console.log('JSON valid, total contact.div.cfs keys:', (s.match(/"contact\.div\.cfs"/g) || []).length);
