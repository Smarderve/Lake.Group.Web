'use strict';
/* Final ACFS integration:
 * 1. Add contact.div.cfs i18n key in all 6 languages (after contact.div.icd)
 * 2. services.html: insert ACFS div-row after AFICD (12), renumber div-no >= 13
 * 3. contact.html: insert ACFS ct-dir-item after the AFICD card
 * 4. Normalize the ACFS nav link indentation across all pages
 */
const fs = require('fs');

/* ---------- 1. i18n ---------- */
const I18N = 'assets/i18n-content.js';
let i18n = fs.readFileSync(I18N, 'utf8');
const cfsKeys = {
  en: 'Logistics · Container Freight Station',
  fr: 'Logistique · Station de fret de conteneurs',
  sw: 'Usafirishaji · Kituo cha Mizigo ya Kontena',
  pt: 'Logística · Estação de Carga de Contêineres',
  es: 'Logística · Estación de Carga de Contenedores',
  ar: 'اللوجستيات · محطة شحن الحاويات',
};
let i18nCount = 0;
for (const [lang, val] of Object.entries(cfsKeys)) {
  if (i18n.includes('"contact.div.cfs"')) break; // already added somewhere
  const re = new RegExp('("contact\\.div\\.icd": "[^"]*")');
  const m = i18n.match(re);
  if (!m) { console.log('i18n: contact.div.icd not found for lang ' + lang); continue; }
  i18n = i18n.replace(m[1], m[1] + ',\r\n  "' + 'contact.div.cfs' + '": "' + val + '"');
  i18nCount++;
}
fs.writeFileSync(I18N, i18n);
console.log('i18n: contact.div.cfs added (' + i18nCount + ' replacement passes)');

/* ---------- 2. services.html ---------- */
const SERVICES = 'services.html';
let svc = fs.readFileSync(SERVICES, 'utf8');
const afRow = svc.indexOf('href="aficd.html" class="div-row"');
const acfsRow =
  '      <a href="acfs.html" class="div-row"><div class="div-no">13</div><div class="div-main"><h3><span class="div-glyph" aria-hidden="true"><img src="assets/images/logos/companies/acfs.png" alt="" loading="lazy" decoding="async"></span> <span>ACFS</span></h3></div><div class="div-side"><p data-i18n="services.desc.acfs">African Cargo Freight Station - container freight station and empty container depot services at Tazara, Pugu Road, Dar es Salaam.</p><span class="svc-link" data-i18n="common.learnMore">Learn more</span></div></a>\n';
if (afRow > -1 && !svc.includes('href="acfs.html" class="div-row"')) {
  const insertAt = svc.indexOf('\n', afRow) + 1;
  svc = svc.slice(0, insertAt) + acfsRow + svc.slice(insertAt);
  // renumber every div-no >= 13 (old AFICD row was 12; new ACFS took 13)
  svc = svc.replace(/<div class="div-no">(1[3-9]|[2-9][0-9])<\/div>/g, (m, n) => {
    const v = parseInt(n, 10);
    return '<div class="div-no">' + (v + 1) + '</div>';
  });
  fs.writeFileSync(SERVICES, svc);
  console.log('services.html: ACFS row added + renumbered');
} else {
  console.log('services.html: ' + (afRow > -1 ? 'ALREADY has ACFS row' : 'AFICD row not found'));
}

/* ---------- 3. contact.html ---------- */
const CONTACT = 'contact.html';
let ct = fs.readFileSync(CONTACT, 'utf8');
const acfsCard =
  '      <article class="ct-dir-item" id="acfs">\n' +
  '        <div class="ct-dir-logo"><img src="assets/images/logos/companies/acfs.png" alt="ACFS" loading="lazy" decoding="async"></div>\n' +
  '        <div class="ct-dir-meta">\n' +
  '          <h3>ACFS</h3>\n' +
  '          <div class="ct-dir-div" data-i18n="contact.div.cfs">Logistics · Container Freight Station</div>\n' +
  '          <div class="ct-dir-lines">\n' +
  '            <span class="ct-line"><iconify-icon icon="mdi:map-marker" width="16" height="16" aria-hidden="true"></iconify-icon>Tazara, Pugu Road, Dar es Salaam (rail link to port)</span>\n' +
  '            <a class="ct-line" href="tel:+255222780510"><iconify-icon icon="mdi:phone" width="16" height="16" aria-hidden="true"></iconify-icon>+255 222 780 510</a>\n' +
  '            <a class="ct-line" href="mailto:admin@lakeoilgroup.com"><iconify-icon icon="mdi:email" width="16" height="16" aria-hidden="true"></iconify-icon>admin@lakeoilgroup.com</a>\n' +
  '            <a class="ct-line" href="acfs.html"><iconify-icon icon="mdi:open-in-new" width="16" height="16" aria-hidden="true"></iconify-icon><span data-i18n="contact.companyPage">Company page</span></a>\n' +
  '          </div>\n' +
  '          <span class="ct-src ct-src--hq" data-i18n="contact.src.hqPhones">Source: lakeoilgroup.com · HQ phones</span>\n' +
  '        </div>\n' +
  '      </article>\n';
if (!ct.includes('id="acfs"')) {
  const anchor = '<article class="ct-dir-item" id="aill">';
  const at = ct.indexOf(anchor);
  if (at > -1) {
    ct = ct.slice(0, at) + acfsCard + ct.slice(at);
    fs.writeFileSync(CONTACT, ct);
    console.log('contact.html: ACFS card added before AILL');
  } else {
    console.log('contact.html: AILL anchor not found');
  }
} else {
  console.log('contact.html: already has ACFS card');
}

/* ---------- 4. Normalize nav link indentation (cosmetic) ---------- */
const pages = fs.readdirSync('.').filter((f) => /\.html$/.test(f));
let fixed = 0;
for (const p of pages) {
  let h = fs.readFileSync(p, 'utf8');
  const re = /\n\s*<a href="acfs\.html" class="mm-company"[^>]*>[\s\S]*?<\/a>\n?/g;
  const norm = '\n                  <a href="acfs.html" class="mm-company" role="menuitem"><img src="assets/images/logos/companies/acfs.png" alt="ACFS" loading="lazy" width="56" height="32"><span data-i18n="nav.co.acfs">ACFS</span></a>\n';
  const before = h;
  h = h.replace(re, norm);
  // also normalize the mobile nav link if it has odd indentation
  const mRe = /\n\s*<a href="acfs\.html"[^>]*class="mm-sub"?[^>]*>[\s\S]*?<\/a>\n?/g;
  if (h !== before) {
    fs.writeFileSync(p, h);
    fixed++;
  }
}
console.log('nav indentation normalized on ' + fixed + ' pages');
