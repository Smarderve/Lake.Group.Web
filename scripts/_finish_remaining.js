#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');
const { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..');

function read(p) {
  return fs.readFileSync(path.join(ROOT, p), 'utf8');
}
function write(p, s) {
  fs.writeFileSync(path.join(ROOT, p), s);
  console.log('wrote', p);
}

// Bump site.js / i18n cache on key pages
for (const f of ['index.html', 'about.html', 'atl.html', 'lake-agro.html', 'services.html', 'contact.html']) {
  if (!fs.existsSync(path.join(ROOT, f))) continue;
  let s = read(f);
  const next = s
    .replace(/site\.js\?v=\d+/g, 'site.js?v=47')
    .replace(/i18n\.js\?v=\d+/g, 'i18n.js?v=47')
    .replace(/i18n-content\.js\?v=\d+/g, 'i18n-content.js?v=47')
    .replace(/tokens\.css\?v=\d+/g, 'tokens.css?v=46')
    .replace(/flagship\.css\?v=\d+/g, 'flagship.css?v=46')
    .replace(/theme\.css\?v=\d+/g, 'theme.css?v=46')
    .replace(/LogoLoop\.css\?v=\d+/g, 'LogoLoop.css?v=46')
    .replace(/logo-loop-mount\.js\?v=\d+/g, 'logo-loop-mount.js?v=46');
  if (next !== s) write(f, next);
}

// Ensure company pages exist
if (!fs.existsSync(path.join(ROOT, 'atl.html')) || !fs.existsSync(path.join(ROOT, 'lake-agro.html'))) {
  execFileSync('node', [path.join(ROOT, 'scripts', '_build_atl_agro_pages.js')], { stdio: 'inherit' });
  execFileSync('node', [path.join(ROOT, 'scripts', 'normalize_nav.js')], { stdio: 'inherit' });
}

// Contact directory ATL/Agro internal
let contact = read('contact.html');
if (/atl-tz\.com|lakeagro\.com/.test(contact) || /placeholder\.png" alt="ATL"/.test(contact)) {
  contact = contact.replace(
    /id="atl">[\s\S]*?<\/article>/,
    `id="atl">
        <div class="ct-dir-logo"><img src="assets/images/logos/companies/atl.png" alt="ATL" loading="lazy"></div>
        <div class="ct-dir-meta">
          <h3>ATL (Aluminium Trailers)</h3>
          <div class="ct-dir-div">Manufacturing</div>
          <div class="ct-dir-lines">
            <span>Tanzania aluminium trailer manufacturing</span>
            <a href="atl.html">Company page</a>
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
          <div class="ct-dir-div">Agro Processing</div>
          <div class="ct-dir-lines">
            <span>Agro-processing division</span>
            <a href="lake-agro.html">Company page</a>
            <a href="mailto:info@lakeagro.com">info@lakeagro.com</a>
            <a href="tel:+255222780510">+255 222 780 510</a>
          </div>
          <span class="ct-src ct-src--hq">Source: Group HQ + Lake Agro</span>
        </div>
      </article>`
  );
  write('contact.html', contact);
}

// Services rows
let services = read('services.html');
if (/div-external/.test(services) && /atl-tz|lakeagro/.test(services)) {
  services = services.replace(
    /<a href="https:\/\/atl-tz\.com" class="div-row div-external"[\s\S]*?<\/a>/,
    `<a href="atl.html" class="div-row"><div class="div-no">10</div><div class="div-main"><h3><span class="div-glyph" aria-hidden="true"><img src="assets/images/logos/companies/atl.png" alt="" loading="lazy"></span> <span>ATL (Aluminium Trailers)</span></h3></div><div class="div-side"><p data-i18n="services.desc.atl">Tanzania's aluminium fuel tanker and custom trailer manufacturer — engineered for African routes.</p><span class="svc-link" data-i18n="common.learnMore">Learn more</span></div></a>`
  );
  services = services.replace(
    /<a href="https:\/\/lakeagro\.com\/?" class="div-row div-external"[\s\S]*?<\/a>/,
    `<a href="lake-agro.html" class="div-row"><div class="div-no">17</div><div class="div-main"><h3><span class="div-glyph" aria-hidden="true"><img src="assets/images/logos/companies/lake-agro.png" alt="" loading="lazy"></span> <span>Lake Agro</span></h3></div><div class="div-side"><p data-i18n="services.desc.lakeAgro">Agribusiness plantations and integrated Ag Parks — creating customers and food for life across Africa.</p><span class="svc-link" data-i18n="common.learnMore">Learn more</span></div></a>`
  );
  write('services.html', services);
}

// Count remaining external ATL/Agro in html
let rem = 0;
for (const f of fs.readdirSync(ROOT).filter((x) => x.endsWith('.html'))) {
  const s = read(f);
  if (/href="https:\/\/atl-tz\.com"|href="https:\/\/lakeagro\.com/.test(s)) {
    console.log('EXTERNAL STILL', f);
    rem++;
  }
}
console.log('external remaining pages', rem);

// Verify logos + loop
const mount = read('assets/components/logo-loop-mount.js');
console.log('logoloop fade', (mount.match(/fadeOutColor:[^\n]+/) || [])[0]);
console.log('logoloop has atl', /atl\.png/.test(mount), 'agro', /lake-agro\.png/.test(mount));
const agro = fs.readFileSync(path.join(ROOT, 'assets/images/logos/companies/lake-agro.png'));
console.log('agro dims', agro.readUInt32BE(16) + 'x' + agro.readUInt32BE(20));

// Spot-check i18n
const j = JSON.parse(read('assets/i18n-content.json'));
console.log('ar hero', j.ar['hero.eyebrow']);
console.log('ar index.20 sample', j.ar['index.20'].slice(0, 120));
console.log('ar about.badge', j.ar['about.badge']);
console.log('hi index.35 has Tanzania?', /\bTanzania\b/.test(j.hi['index.35'] || ''));
console.log('ar index.35 has Tanzania?', /\bTanzania\b/.test(j.ar['index.35'] || ''));
