#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

function read(p) {
  return fs.readFileSync(path.join(ROOT, p), 'utf8');
}
function write(p, s) {
  fs.writeFileSync(path.join(ROOT, p), s);
  console.log('wrote', p);
}

// --- contact directory ---
let contact = read('contact.html');
contact = contact.replace(
  /id="atl">[\s\S]*?<\/article>/,
  `id="atl">
        <div class="ct-dir-logo"><img src="assets/images/logos/companies/atl.png" alt="ATL" loading="lazy"></div>
        <div class="ct-dir-meta">
          <h3>ATL (Aluminium Trailers)</h3>
          <div class="ct-dir-div" data-i18n="contact.div.mfg">Manufacturing</div>
          <div class="ct-dir-lines">
            <span data-i18n="contact.note.atl">Tanzania aluminium trailer manufacturing</span>
            <a href="atl.html" data-i18n="contact.companyPage">Company page</a>
            <a href="tel:+255222780510">+255 222 780 510</a>
            <a href="mailto:admin@lakeoilgroup.com">admin@lakeoilgroup.com</a>
          </div>
          <span class="ct-src ct-src--hq">Source: Group HQ · Kipawa plant details on company page</span>
        </div>
      </article>`
);
contact = contact.replace(
  /id="lake-agro">[\s\S]*?<\/article>/,
  `id="lake-agro">
        <div class="ct-dir-logo"><img src="assets/images/logos/companies/lake-agro.png" alt="Lake Agro" loading="lazy"></div>
        <div class="ct-dir-meta">
          <h3>Lake Agro</h3>
          <div class="ct-dir-div" data-i18n="nav.dd.agro">Agro Processing</div>
          <div class="ct-dir-lines">
            <span data-i18n="contact.note.agro">Agro-processing division</span>
            <a href="lake-agro.html" data-i18n="contact.companyPage">Company page</a>
            <a href="mailto:info@lakeagro.com">info@lakeagro.com</a>
            <a href="tel:+255222780510">+255 222 780 510</a>
          </div>
          <span class="ct-src ct-src--hq">Source: Group HQ + Lake Agro · HQ phones for group enquiries</span>
        </div>
      </article>`
);
write('contact.html', contact);

// --- services rows if still external ---
let services = read('services.html');
if (/atl-tz\.com|lakeagro\.com/.test(services)) {
  services = services.replace(
    /<a href="https:\/\/atl-tz\.com"[\s\S]*?<\/a>/,
    `<a href="atl.html" class="div-row"><div class="div-no">10</div><div class="div-main"><h3><span class="div-glyph" aria-hidden="true"><img src="assets/images/logos/companies/atl.png" alt="" loading="lazy"></span> <span>ATL (Aluminium Trailers)</span></h3></div><div class="div-side"><p data-i18n="services.desc.atl">Tanzania's aluminium fuel tanker and custom trailer manufacturer — engineered for African routes.</p><span class="svc-link" data-i18n="common.learnMore">Learn more</span></div></a>`
  );
  // only first atl-tz might be nav - do careful replace for div-row
}
// Safer: target div-external rows
services = services.replace(
  /<a href="https:\/\/atl-tz\.com" class="div-row div-external"[\s\S]*?<\/a>/,
  `<a href="atl.html" class="div-row"><div class="div-no">10</div><div class="div-main"><h3><span class="div-glyph" aria-hidden="true"><img src="assets/images/logos/companies/atl.png" alt="" loading="lazy"></span> <span>ATL (Aluminium Trailers)</span></h3></div><div class="div-side"><p data-i18n="services.desc.atl">Tanzania's aluminium fuel tanker and custom trailer manufacturer — engineered for African routes.</p><span class="svc-link" data-i18n="common.learnMore">Learn more</span></div></a>`
);
services = services.replace(
  /<a href="https:\/\/lakeagro\.com\/?" class="div-row div-external"[\s\S]*?<\/a>/,
  `<a href="lake-agro.html" class="div-row"><div class="div-no">17</div><div class="div-main"><h3><span class="div-glyph" aria-hidden="true"><img src="assets/images/logos/companies/lake-agro.png" alt="" loading="lazy"></span> <span>Lake Agro</span></h3></div><div class="div-side"><p data-i18n="services.desc.lakeAgro">Agribusiness plantations and integrated Ag Parks — creating customers and food for life across Africa.</p><span class="svc-link" data-i18n="common.learnMore">Learn more</span></div></a>`
);
// bump services css if needed
services = services
  .replace(/tokens\.css\?v=\d+/g, 'tokens.css?v=46')
  .replace(/flagship\.css\?v=\d+/g, 'flagship.css?v=46')
  .replace(/site\.js\?v=\d+/g, 'site.js?v=46');
write('services.html', services);

// --- rebuild pages with flexible wrappers ---
const { execFileSync } = require('child_process');
// inline build fix
const buildPath = path.join(ROOT, 'scripts', '_build_atl_agro_pages.js');
let build = fs.readFileSync(buildPath, 'utf8');
build = build.replace(
  `const start = html.indexOf('<div class="page-wrapper">');
  const end = html.indexOf('</div>\\n<footer class="site-footer">');
  if (start < 0 || end < 0) throw new Error('page-wrapper bounds missing');
  html = html.slice(0, start) + bodyHtml + html.slice(end);`,
  `const startMatch = html.match(/<div class="page-wrapper">/);
  const endMatch = html.match(/<\\/div>\\s*<footer class="site-footer">/);
  if (!startMatch || !endMatch) throw new Error('page-wrapper bounds missing');
  const start = startMatch.index;
  const end = endMatch.index;
  html = html.slice(0, start) + bodyHtml + html.slice(end);`
);
fs.writeFileSync(buildPath, build);
execFileSync('node', [buildPath], { stdio: 'inherit', cwd: ROOT });

// normalize new pages
execFileSync('node', [path.join(ROOT, 'scripts', 'normalize_nav.js')], { stdio: 'inherit', cwd: ROOT });

// verify no external subsidiary links remain for ATL/Agro in key surfaces
const checkFiles = [
  'scripts/templates/nav.html',
  'scripts/templates/mobile_nav.html',
  'services.html',
  'contact.html',
  'index.html',
  'atl.html',
  'lake-agro.html',
  'assets/components/logo-loop-mount.js'
];
for (const f of checkFiles) {
  const s = read(f);
  const bad = [];
  if (/https:\/\/atl-tz\.com/.test(s)) bad.push('atl-tz.com');
  if (/https:\/\/lakeagro\.com/.test(s)) bad.push('lakeagro.com');
  console.log(f, bad.length ? 'STILL HAS ' + bad.join(',') : 'OK internal');
}

// leftover external in all html nav (should be none after normalize)
let remaining = 0;
for (const f of fs.readdirSync(ROOT).filter((x) => x.endsWith('.html'))) {
  const s = read(f);
  if (/mm-external[^>]*atl-tz|href="https:\/\/atl-tz|href="https:\/\/lakeagro/.test(s)) {
    console.log('REMAINING EXTERNAL', f);
    remaining++;
  }
}
console.log('remaining external pages', remaining);

// ensure agro logo correct size
const agro = fs.readFileSync(path.join(ROOT, 'assets/images/logos/companies/lake-agro.png'));
console.log('lake-agro.png', agro.readUInt32BE(16) + 'x' + agro.readUInt32BE(20));
const atl = fs.readFileSync(path.join(ROOT, 'assets/images/logos/companies/atl.png'));
console.log('atl.png', atl.readUInt32BE(16) + 'x' + atl.readUInt32BE(20));
