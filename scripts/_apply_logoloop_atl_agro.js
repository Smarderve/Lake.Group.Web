#!/usr/bin/env node
'use strict';
/**
 * Applies LogoLoop contrast + nav/footer sizing tokens, wires ATL/Lake Agro
 * internal pages into templates, services, contact, and regenerates nav chrome.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');

function read(p) {
  return fs.readFileSync(path.join(ROOT, p), 'utf8');
}
function write(p, s) {
  fs.writeFileSync(path.join(ROOT, p), s);
  console.log('wrote', p);
}
function ensureAgroLogo() {
  const src = path.join(ROOT, 'scripts', '_scraped', 'agro_logoresizey.png');
  const dest = path.join(ROOT, 'assets', 'images', 'logos', 'companies', 'lake-agro.png');
  if (!fs.existsSync(src)) throw new Error('missing agro_logoresizey.png scrape');
  fs.copyFileSync(src, dest);
  const b = fs.readFileSync(dest);
  console.log('agro logo', b.readUInt32BE(16) + 'x' + b.readUInt32BE(20));
  if (!fs.existsSync(path.join(ROOT, 'assets', 'images', 'logos', 'companies', 'atl.png'))) {
    throw new Error('missing atl.png');
  }
}

function patchTokens() {
  let s = read('assets/tokens.css');
  if (!s.includes('--footer-logo-height')) {
    s = s.replace(
      /(--nav-logo-letterbox-scale:\s*1\.75;)/,
      `$1\n  /* Footer mark: visual weight near nav (was hard-coded 40px) */\n  --footer-logo-height:            56px;\n  --footer-logo-height-mobile:     48px;`
    );
  }
  if (!s.includes('--color-agro-green')) {
    s = s.replace(
      /(--color-light:\s*#EFF2FB;)/,
      `$1\n\n  /* Lake Agro brand greens (sampled from lakeagro.com style.css + logo) */\n  --color-agro-green:         #008435;\n  --color-agro-green-deep:    #004b1e;\n  --color-agro-green-bright:  #489f10;\n  --color-agro-orange:        #e67e22;`
    );
  }
  // Document letterbox: after trim, most company logos are wide (~2.56:1); scale kept as fallback
  if (!s.includes('Optical note')) {
    s = s.replace(
      /(\/\* Letterboxed 1:1 company PNGs need optical scale so the mark matches group height \*\/)/,
      `/* Optical note: square letterboxed assets were trimmed; scale remains for any leftover 1:1 marks */`
    );
  }
  write('assets/tokens.css', s);
}

function patchFooterCss(file) {
  let s = read(file);
  s = s.replace(
    /\.footer-logo img \{ height: 40px; width: auto; display: block; \}/g,
    '.footer-logo img { height: var(--footer-logo-height, 56px); width: auto; display: block; max-width: min(280px, 100%); object-fit: contain; }'
  );
  if (!s.includes('footer-logo-height-mobile')) {
    s = s.replace(
      /(\.footer-logo img \{ height: var\(--footer-logo-height, 56px\);[^\n]+\n)/,
      `$1@media (max-width: 720px) {\n  .footer-logo img { height: var(--footer-logo-height-mobile, 48px); }\n}\n`
    );
  }
  write(file, s);
}

function patchIndexMarquee() {
  let s = read('index.html');
  s = s.replace(
    /\/\* HERO LOGO TICKER \(yellow bar shell; content via LogoLoop\) \*\/\s*\.marquee-wrap \{\s*background: var\(--yellow\);\s*padding: 13px 0;\s*overflow: hidden;\s*width: 100%;\s*\}/,
    `/* HERO LOGO TICKER (brand-blue bar for yellow/white logo contrast; LogoLoop) */
    .marquee-wrap {
      background: var(--color-brand-blue);
      padding: 13px 0;
      overflow: hidden;
      width: 100%;
      border-top: 2px solid var(--color-yellow-accent);
      border-bottom: 2px solid var(--color-yellow-accent);
      box-sizing: border-box;
    }`
  );
  s = s.replace(
    /\.marquee-wrap \.logoloop \{\s*--logoloop-fadeColorAuto: var\(--color-yellow-accent\);\s*\}/,
    `.marquee-wrap .logoloop {
      --logoloop-fadeColorAuto: var(--color-brand-blue);
    }`
  );
  // Footer inline on home
  s = s.replace(
    /\.footer-logo img \{\s*height: 44px;\s*width: auto;\s*\}/,
    `.footer-logo img {
      height: var(--footer-logo-height, 56px);
      width: auto;
      max-width: min(280px, 100%);
      object-fit: contain;
    }`
  );
  s = s.replace(/LogoLoop\.css\?v=\d+/g, 'LogoLoop.css?v=46');
  s = s.replace(/logo-loop-mount\.js\?v=\d+/g, 'logo-loop-mount.js?v=46');
  s = s.replace(/tokens\.css\?v=\d+/g, 'tokens.css?v=46');
  s = s.replace(/theme\.css\?v=\d+/g, 'theme.css?v=46');
  s = s.replace(/site\.js\?v=\d+/g, 'site.js?v=46');
  write('index.html', s);
}

function patchMount() {
  let s = read('assets/components/logo-loop-mount.js');
  const logos = `  var SUBSIDIARY_LOGOS = [
    { src: 'assets/images/logos/companies/lake-oil.png', alt: 'Lake Oil', title: 'Lake Oil', href: 'lake-oil.html' },
    { src: 'assets/images/logos/companies/lake-gas.png', alt: 'Lake Gas', title: 'Lake Gas', href: 'lake-gas.html' },
    { src: 'assets/images/logos/companies/lake-lubes.png', alt: 'Lake Lubes', title: 'Lake Lubes', href: 'lake-lubes.html' },
    { src: 'assets/images/logos/companies/lake-steel.png', alt: 'Lake Steel', title: 'Lake Steel', href: 'lake-steel.html' },
    { src: 'assets/images/logos/companies/lake-trans.png', alt: 'Lake Trans', title: 'Lake Trans', href: 'lake-trans.html' },
    { src: 'assets/images/logos/companies/lake-aviation.png', alt: 'Lake Aviation', title: 'Lake Aviation', href: 'lake-aviation.html' },
    { src: 'assets/images/logos/companies/lake-buildings.png', alt: 'Lake Buildings', title: 'Lake Buildings', href: 'lake-buildings.html' },
    { src: 'assets/images/logos/companies/lake-plastics.png', alt: 'Lake Plastics', title: 'Lake Plastics', href: 'lake-plastics.html' },
    { src: 'assets/images/logos/companies/lake-premix-cement.png', alt: 'Lake Premix & Cement', title: 'Lake Premix & Cement', href: 'lake-premix-cement.html' },
    { src: 'assets/images/logos/companies/gulf-aggregates.png', alt: 'Gulf Aggregates', title: 'Gulf Aggregates', href: 'gulf-aggregates.html' },
    { src: 'assets/images/logos/companies/atl.png', alt: 'ATL', title: 'ATL Aluminium Trailers', href: 'atl.html' },
    { src: 'assets/images/logos/companies/lake-agro.png', alt: 'Lake Agro', title: 'Lake Agro', href: 'lake-agro.html' },
    { src: 'assets/images/logos/companies/cross-country.png', alt: 'Cross Country', title: 'Cross Country', href: 'cross-country.html' },
    { src: 'assets/images/logos/companies/ocean-galleria.png', alt: 'Ocean Galleria', title: 'Ocean Galleria', href: 'ocean-galleria.html' }
  ];`;
  s = s.replace(/var SUBSIDIARY_LOGOS = \[[\s\S]*?\];/, logos);
  s = s.replace(/fadeOutColor: 'var\(--color-yellow-accent\)'/, "fadeOutColor: 'var(--color-brand-blue)'");
  s = s.replace(/logoHeight: 44,/, 'logoHeight: 48,');
  s = s.replace(/logoHeightMobile: 32,/, 'logoHeightMobile: 36,');
  write('assets/components/logo-loop-mount.js', s);
}

const EXT_SVG =
  '<svg class="mm-ext-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M14 4h6v6"/><path d="M20 4 11 13"/><path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6"/></svg>';
const MOB_EXT_SVG =
  '<svg class="mob-ext-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M14 4h6v6"/><path d="M20 4 11 13"/><path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6"/></svg>';
const DIV_EXT_SVG =
  '<svg class="div-ext-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M14 4h6v6"/><path d="M20 4 11 13"/><path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6"/></svg>';

function patchNavTemplates() {
  let nav = read('scripts/templates/nav.html');
  nav = nav.replace(
    new RegExp(
      `<a href="https://atl-tz\\.com"[^>]*>[\\s\\S]*?</a>`,
      'g'
    ),
    `<a href="atl.html" class="mm-company" role="menuitem"><img src="assets/images/logos/companies/atl.png" alt="ATL" loading="lazy" width="110" height="68"><span data-i18n="nav.co.atl">ATL</span></a>`
  );
  nav = nav.replace(
    new RegExp(`<a href="https://lakeagro\\.com/?"[^>]*>[\\s\\S]*?</a>`, 'g'),
    `<a href="lake-agro.html" class="mm-company" role="menuitem"><img src="assets/images/logos/companies/lake-agro.png" alt="Lake Agro" loading="lazy" width="110" height="68"><span data-i18n="nav.co.lakeAgro">Lake Agro</span></a>`
  );
  write('scripts/templates/nav.html', nav);

  let mob = read('scripts/templates/mobile_nav.html');
  mob = mob.replace(
    /<a href="https:\/\/atl-tz\.com"[^>]*>[\s\S]*?<\/a>/,
    `<a href="atl.html" data-i18n="nav.co.atl">ATL</a>`
  );
  mob = mob.replace(
    /<a href="https:\/\/lakeagro\.com\/?"[^>]*>[\s\S]*?<\/a>/,
    `<a href="lake-agro.html" data-i18n="nav.co.lakeAgro">Lake Agro</a>`
  );
  write('scripts/templates/mobile_nav.html', mob);
}

function patchServices() {
  let s = read('services.html');
  s = s.replace(
    /<a href="https:\/\/atl-tz\.com" class="div-row div-external"[^>]*>[\s\S]*?<\/a>/,
    `<a href="atl.html" class="div-row"><div class="div-no">10</div><div class="div-main"><h3><span class="div-glyph" aria-hidden="true"><img src="assets/images/logos/companies/atl.png" alt="" loading="lazy"></span> <span>ATL (Aluminium Trailers)</span></h3></div><div class="div-side"><p data-i18n="services.desc.atl">Tanzania's aluminium fuel tanker and custom trailer manufacturer — engineered for African routes.</p><span class="svc-link" data-i18n="common.learnMore">Learn more</span></div></a>`
  );
  s = s.replace(
    /<a href="https:\/\/lakeagro\.com\/?" class="div-row div-external"[^>]*>[\s\S]*?<\/a>/,
    `<a href="lake-agro.html" class="div-row"><div class="div-no">17</div><div class="div-main"><h3><span class="div-glyph" aria-hidden="true"><img src="assets/images/logos/companies/lake-agro.png" alt="" loading="lazy"></span> <span>Lake Agro</span></h3></div><div class="div-side"><p data-i18n="services.desc.lakeAgro">Agribusiness plantations and integrated Ag Parks — creating customers and food for life across Africa.</p><span class="svc-link" data-i18n="common.learnMore">Learn more</span></div></a>`
  );
  write('services.html', s);
}

function patchContact() {
  let s = read('contact.html');
  s = s.replace(
    /src="assets\/images\/logos\/companies\/lake-group-placeholder\.png" alt="ATL"/,
    'src="assets/images/logos/companies/atl.png" alt="ATL"'
  );
  s = s.replace(
    /src="assets\/images\/logos\/companies\/lake-group-placeholder\.png" alt="Lake Agro"/,
    'src="assets/images/logos/companies/lake-agro.png" alt="Lake Agro"'
  );
  s = s.replace(
    /<a href="https:\/\/atl-tz\.com" target="_blank" rel="noopener noreferrer">atl-tz\.com<\/a>/,
    '<a href="atl.html">ATL company page</a>'
  );
  s = s.replace(
    /<a href="https:\/\/lakeagro\.com\/?" target="_blank" rel="noopener noreferrer">lakeagro\.com<\/a>/,
    '<a href="lake-agro.html">Lake Agro company page</a>'
  );
  write('contact.html', s);
}

function bumpCssJsVersions() {
  const files = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html'));
  for (const f of files) {
    let s = read(f);
    const next = s
      .replace(/tokens\.css\?v=\d+/g, 'tokens.css?v=46')
      .replace(/flagship\.css\?v=\d+/g, 'flagship.css?v=46')
      .replace(/theme\.css\?v=\d+/g, 'theme.css?v=46')
      .replace(/site\.js\?v=\d+/g, 'site.js?v=46');
    if (next !== s) write(f, next);
  }
}

function siteJsComment() {
  let s = read('assets/site.js');
  s = s.replace(
    /\/\/ Tight group mark is ~2\.6:1; square letterboxed company PNGs are ~1:1\.\r?\n\s*\/\/ Scale those up so the visible mark matches --nav-logo-height optically\./,
    `// Tight group mark is ~2.6:1. Legacy square letterboxed company PNGs (~1:1 with ~18% mark fill)
    // were trimmed to wide assets; letterbox scale remains as a fallback for any leftover squares.`
  );
  write('assets/site.js', s);
}

ensureAgroLogo();
patchTokens();
patchFooterCss('assets/flagship.css');
patchFooterCss('assets/theme.css');
patchIndexMarquee();
patchMount();
patchNavTemplates();
patchServices();
patchContact();
siteJsComment();
execFileSync('node', [path.join(ROOT, 'scripts', 'normalize_nav.js')], { stdio: 'inherit' });
bumpCssJsVersions();
console.log('apply complete');
