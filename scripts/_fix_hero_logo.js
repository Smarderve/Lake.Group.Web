'use strict';
/**
 * Global hero photo+overlay + nav logo size enforcement.
 * Run from repo root: node scripts/_fix_hero_logo.js
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const HERO_PHOTOS = {
  // Company pages missing hero-media element
  'aill.html': 'assets/images/banner/LakeTrans.jpg',
  'cross-country.html': 'assets/images/merm/photo_1.jpg',
  'lake-aviation.html': 'assets/images/n-slider/2.jpg',
  'lake-buildings.html': 'assets/images/ccp/photo_1.jpg',
  'lake-cylinders.html': 'assets/images/banner/LakeGas.jpg',
  'lake-plastics.html': 'assets/images/merm/photo_3.jpg',
  'ocean-galleria.html': 'assets/images/merm/photo_2.jpg',
  'station-locator.html': 'assets/images/banner/LakeOil.jpg',
  // Flat interior pages
  'about.html': 'assets/images/n-slider/1.jpg',
  'contact.html': 'assets/images/n-slider/2.jpg',
  'csr.html': 'assets/images/n-slider/7.jpg',
  'dashboard.html': 'assets/images/n-slider/4.jpg',
  'fleet.html': 'assets/images/banner/LakeTrans.jpg',
  'gallery.html': 'assets/images/n-slider/3.jpg',
  'history.html': 'assets/images/leadership/group-event-2018.jpg',
  'investors.html': 'assets/images/n-slider/6.jpg',
  'leadership.html': 'assets/images/leadership/annual-event.jpg',
  'media-center.html': 'assets/images/n-slider/8.jpg',
  'projects.html': 'assets/images/ccp/photo_2.jpg',
  'sustainability.html': 'assets/images/n-slider/9.jpg',
};

const PER_PAGE_HERO_MEDIA_CSS =
  /^\.page-hero \.hero-media\{position:absolute;inset:0;background-size:cover;background-position:center;opacity:\.15;filter:saturate\(\.72\) contrast\(1\.06\)\}\r?\n?/gm;

const CAREERS_AFRICA_PHOTO_CSS = /\/\* hero photo layers[\s\S]*?\.page-hero-overlay\{[^}]+\}\r?\n?/g;

function stripInlineLogo(html) {
  return html.replace(
    /(<a href="index\.html" class="nav-logo">\s*<img src="[^"]+" alt="[^"]*")[^>]*(>)/g,
    '$1$2'
  );
}

function ensureHeroLayers(html, photoUrl) {
  // Migrate careers/africa-network photo class names
  html = html.replace(
    /<div class="page-hero-photo" style="background-image:url\('([^']+)'\)"><\/div>\s*<div class="page-hero-overlay"><\/div>/g,
    `<div class="hero-media" style="background-image:url('$1')" aria-hidden="true"></div>\n  <div class="hero-overlay" aria-hidden="true"></div>`
  );

  // Already has hero-media - ensure overlay follows it
  if (/class="hero-media"/.test(html) && /class="page-hero"/.test(html)) {
    if (!/class="hero-overlay"/.test(html)) {
      html = html.replace(
        /(<div class="hero-media"[^>]*><\/div>)/,
        '$1\n  <div class="hero-overlay" aria-hidden="true"></div>'
      );
    }
    return html;
  }

  // Inject media + overlay at start of page-hero
  if (photoUrl && /class="page-hero"/.test(html)) {
    const inject =
      `<div class="hero-media" style="background-image:url('${photoUrl}')" aria-hidden="true"></div>\n  <div class="hero-overlay" aria-hidden="true"></div>\n  `;
    // <section class="page-hero"> or <section class="page-hero"><div class="container"
    html = html.replace(
      /(<section class="page-hero">)(\s*)(<div class="container")/,
      `$1\n  ${inject}$3`
    );
    // also handle <section class="page-hero">\n  <div class="container"
    if (!html.includes(`background-image:url('${photoUrl}')`)) {
      html = html.replace(
        /(<section class="page-hero">)/,
        `$1\n  ${inject.trimEnd()}\n`
      );
    }
  }
  return html;
}

function fixLakeLubesHero(html) {
  // Prefer a photographic banner over product PNG if LakeGas/Oil available nearby
  return html.replace(
    /hero-media" style="background-image:url\('assets\/images\/lakelubes\/products\/LAKE_GREASE_MP_3_2\.png'\)"/,
    `hero-media" style="background-image:url('assets/images/n-slider/4.jpg')"`
  );
}

function processHtmlFile(file) {
  let html = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const before = html;

  html = html.replace(PER_PAGE_HERO_MEDIA_CSS, '');
  html = html.replace(CAREERS_AFRICA_PHOTO_CSS, '');
  html = stripInlineLogo(html);

  if (file === 'lake-lubes.html') html = fixLakeLubesHero(html);

  if (/class="page-hero"/.test(html)) {
    const photo = HERO_PHOTOS[file] || null;
    html = ensureHeroLayers(html, photo);
  }

  // Ensure container sits above overlay
  html = html.replace(
    /(<section class="page-hero">[\s\S]*?<div class="container)(?![^>]*style=)/,
    (m) => m // leave as-is; CSS z-index handles it
  );

  if (html !== before) {
    fs.writeFileSync(path.join(ROOT, file), html, 'utf8');
    return true;
  }
  return false;
}

function patchTokens() {
  const p = path.join(ROOT, 'assets', 'tokens.css');
  let s = fs.readFileSync(p, 'utf8');
  if (!s.includes('--hero-overlay-gradient')) {
    s = s.replace(
      /  --color-hero-bg:\s+var\(--color-brand-blue\);/,
      `  --color-hero-bg:              var(--color-brand-blue-darkest); /* fallback under photo only */\n  --hero-overlay-gradient:      linear-gradient(105deg,\n                                  rgba(1, 63, 92, 0.92) 0%,\n                                  rgba(1, 129, 187, 0.75) 45%,\n                                  rgba(1, 129, 187, 0.22) 100%);`
    );
    fs.writeFileSync(p, s, 'utf8');
    return true;
  }
  return false;
}

function patchFlagship() {
  const p = path.join(ROOT, 'assets', 'flagship.css');
  let s = fs.readFileSync(p, 'utf8');

  // Collapse logo rules to single token-driven declaration
  s = s.replace(
    /\.nav-logo img \{\n  height: var\(--nav-logo-height\) !important;\n  width: auto; display: block; object-fit: contain;\n  transition: transform var\(--dur-2\) var\(--ease-out\), height 0\.3s var\(--ease-out\);\n\}\n\.site-nav\.nav-scrolled \.nav-logo \{ padding: 0; \}\n\.site-nav\.nav-scrolled \.nav-logo img \{ height: var\(--nav-logo-height-scrolled\) !important; \}\n\/\* Company pages: same size as group mark \(data-company-logo swap via site\.js\) \*\/\nbody\[data-company-logo\] \{ --nav-h: var\(--navbar-height\); \}\nbody\[data-company-logo\] \.site-nav \{ overflow: visible; \}\nbody\[data-company-logo\] \.site-nav\.nav-scrolled \{ height: var\(--navbar-height-scrolled\); \}\nbody\[data-company-logo\] \.site-nav\.nav-scrolled \.nav-links > li \{ height: var\(--navbar-height-scrolled\); \}\n\.nav-logo\.nav-logo--company,\nbody\[data-company-logo\] \.site-nav \.nav-logo \{\n  max-width: none;\n  overflow: visible;\n\}\n\.nav-logo\.nav-logo--company img,\nbody\[data-company-logo\] \.site-nav \.nav-logo img \{\n  height: var\(--nav-logo-height\) !important;\n  width: auto !important;\n  max-width: none !important;\n  max-height: none !important;\n  object-fit: contain;\n\}\n\.site-nav\.nav-scrolled \.nav-logo\.nav-logo--company img,\nbody\[data-company-logo\] \.site-nav\.nav-scrolled \.nav-logo img \{\n  height: var\(--nav-logo-height-scrolled\) !important;\n\}/,
    `.nav-logo img,
.site-nav .nav-logo img {
  height: var(--nav-logo-height) !important;
  width: auto !important;
  max-height: var(--nav-logo-height);
  display: block;
  object-fit: contain;
  transition: transform var(--dur-2) var(--ease-out), height 0.3s var(--ease-out);
}
.site-nav.nav-scrolled .nav-logo { padding: 0; }
.site-nav.nav-scrolled .nav-logo img {
  height: var(--nav-logo-height-scrolled) !important;
  max-height: var(--nav-logo-height-scrolled);
}
/* Company pages: same size as group mark (data-company-logo swap via site.js) */
body[data-company-logo] { --nav-h: var(--navbar-height); }
body[data-company-logo] .site-nav { overflow: visible; }
body[data-company-logo] .site-nav.nav-scrolled { height: var(--navbar-height-scrolled); }
body[data-company-logo] .site-nav.nav-scrolled .nav-links > li { height: var(--navbar-height-scrolled); }
.nav-logo.nav-logo--company,
body[data-company-logo] .site-nav .nav-logo {
  max-width: none;
  overflow: visible;
}`
  );

  // Replace page-hero shell
  s = s.replace(
    /\/\* --------------------------------------------------------------------------\n   7\. PAGE HERO  oversized editorial masthead on brand blue \(tokens\)\n   -------------------------------------------------------------------------- \*\/\n\.page-hero \{\n  background: var\(--color-hero-bg\);\n  padding: calc\(var\(--navbar-height\) \+ var\(--sp-20\)\) 0 var\(--sp-20\);\n  position: relative; overflow: hidden;\n\}/,
    `/* --------------------------------------------------------------------------
   7. PAGE HERO - full-bleed photography + shared navy/blue gradient overlay
   -------------------------------------------------------------------------- */
.page-hero {
  background: var(--color-hero-bg); /* darkest blue fallback under photo */
  padding: calc(var(--navbar-height) + var(--sp-20)) 0 var(--sp-20);
  position: relative; overflow: hidden;
}
/* Shared photo layer - opacity 1 so photography stays visible */
.page-hero .hero-media,
.page-hero .page-hero-photo {
  position: absolute;
  inset: 0;
  z-index: 0;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  opacity: 1;
  filter: saturate(0.92) contrast(1.05);
  pointer-events: none;
}
/* Shared gradient overlay - brand blue/navy → transparent (no candy red) */
.page-hero .hero-overlay,
.page-hero .page-hero-overlay {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background: var(--hero-overlay-gradient);
}`
  );

  // Soften decorative ::before/::after so they don't hide the photo
  s = s.replace(
    /\.page-hero::before \{ \/\* faint meridian grid \*\/\n  content: ''; position: absolute; inset: 0;\n  background-image:\n    linear-gradient\(to right, var\(--ink-line-2\) 1px, transparent 1px\),\n    linear-gradient\(to bottom, var\(--ink-line-2\) 1px, transparent 1px\);\n  background-size: 120px 120px;\n  mask-image: radial-gradient\(ellipse 90% 100% at 50% 0%, black 30%, transparent 78%\);\n  -webkit-mask-image: radial-gradient\(ellipse 90% 100% at 50% 0%, black 30%, transparent 78%\);\n\}/,
    `.page-hero::before { /* faint meridian grid - sit above photo, under text */
  content: ''; position: absolute; inset: 0; z-index: 1;
  background-image:
    linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px);
  background-size: 120px 120px;
  mask-image: radial-gradient(ellipse 90% 100% at 50% 0%, black 30%, transparent 78%);
  -webkit-mask-image: radial-gradient(ellipse 90% 100% at 50% 0%, black 30%, transparent 78%);
  pointer-events: none;
  opacity: 0.45;
}
.page-hero:has(.hero-media)::before,
.page-hero:has(.page-hero-photo)::before { opacity: 0.25; }`
  );

  s = s.replace(
    /\.page-hero::after \{ \/\* gold meridian line descending from nav tick \*\/\n  content: ''; position: absolute; top: 0; left: var\(--sp-8\);\n  width: 1px; height: 38%; background: linear-gradient\(var\(--gold\), transparent\);\n  opacity: 0\.55;\n\}/,
    `.page-hero::after { /* gold meridian line descending from nav tick */
  content: ''; position: absolute; top: 0; left: var(--sp-8); z-index: 2;
  width: 1px; height: 38%; background: linear-gradient(var(--gold), transparent);
  opacity: 0.45; pointer-events: none;
}`
  );

  fs.writeFileSync(p, s, 'utf8');
  return true;
}

function patchTheme() {
  const p = path.join(ROOT, 'assets', 'theme.css');
  let s = fs.readFileSync(p, 'utf8');

  s = s.replace(
    /\.page-hero \{ background: var\(--color-hero-bg\); \}/,
    `.page-hero { background: var(--color-hero-bg); position: relative; overflow: hidden; }
/* Shared hero photography + gradient (also defined in flagship.css) */
.page-hero .hero-media,
.page-hero .page-hero-photo {
  position: absolute; inset: 0; z-index: 0;
  background-size: cover; background-position: center; background-repeat: no-repeat;
  opacity: 1; filter: saturate(0.92) contrast(1.05); pointer-events: none;
}
.page-hero .hero-overlay,
.page-hero .page-hero-overlay {
  position: absolute; inset: 0; z-index: 1; pointer-events: none;
  background: var(--hero-overlay-gradient);
}
.page-hero .container { position: relative; z-index: 2; }`
  );

  // Single logo declaration - remove duplicate company height blocks
  s = s.replace(
    /\.site-nav\.nav-scrolled \.nav-logo img \{ height: var\(--nav-logo-height-scrolled\) !important; \}/,
    `.site-nav.nav-scrolled .nav-logo img {
  height: var(--nav-logo-height-scrolled) !important;
  max-height: var(--nav-logo-height-scrolled);
}`
  );

  s = s.replace(
    /\.nav-logo img \{ height: var\(--nav-logo-height\) !important; width: auto; object-fit: contain; transition: transform var\(--dur-fast\) var\(--ease-out\), height 0\.3s var\(--ease-smooth\); \}\n\/\* Company pages: same logo size as group mark \(swap via site\.js\) \*\/\nbody\[data-company-logo\] \{\n  --nav-h: var\(--navbar-height\);\n\}\nbody\[data-company-logo\] \.site-nav \{\n  height: var\(--nav-h\);\n  overflow: visible;\n\}\n\.nav-logo\.nav-logo--company,\nbody\[data-company-logo\] \.site-nav \.nav-logo \{\n  max-width: none;\n  overflow: visible;\n\}\n\.nav-logo\.nav-logo--company img,\nbody\[data-company-logo\] \.site-nav \.nav-logo img \{\n  height: var\(--nav-logo-height\) !important;\n  width: auto !important;\n  max-width: none !important;\n  max-height: none !important;\n  object-fit: contain;\n\}\n\.site-nav\.nav-scrolled \.nav-logo\.nav-logo--company img,\nbody\[data-company-logo\] \.site-nav\.nav-scrolled \.nav-logo img \{\n  height: var\(--nav-logo-height-scrolled\) !important;\n\}/,
    `.nav-logo img,
.site-nav .nav-logo img {
  height: var(--nav-logo-height) !important;
  width: auto !important;
  max-height: var(--nav-logo-height);
  object-fit: contain;
  transition: transform var(--dur-fast) var(--ease-out), height 0.3s var(--ease-smooth);
}
/* Company pages: same logo size as group mark (swap via site.js - src/alt only) */
body[data-company-logo] {
  --nav-h: var(--navbar-height);
}
body[data-company-logo] .site-nav {
  height: var(--nav-h);
  overflow: visible;
}
.nav-logo.nav-logo--company,
body[data-company-logo] .site-nav .nav-logo {
  max-width: none;
  overflow: visible;
}`
  );

  fs.writeFileSync(p, s, 'utf8');
  return true;
}

function patchSiteJs() {
  const p = path.join(ROOT, 'assets', 'site.js');
  let s = fs.readFileSync(p, 'utf8');
  const old = `    img.removeAttribute('width');
    img.removeAttribute('height');
    img.style.removeProperty('height');
    img.style.removeProperty('width');
    img.style.removeProperty('max-width');
    img.style.removeProperty('max-height');
    img.style.width = 'auto';
    img.style.maxWidth = 'none';
    img.style.objectFit = 'contain';`;
  const neu = `    img.removeAttribute('width');
    img.removeAttribute('height');
    img.style.removeProperty('height');
    img.style.removeProperty('width');
    img.style.removeProperty('max-width');
    img.style.removeProperty('max-height');
    // Size comes only from --nav-logo-height in tokens.css - never set here.`;
  if (s.includes(old)) {
    s = s.replace(old, neu);
    fs.writeFileSync(p, s, 'utf8');
    return true;
  }
  return false;
}

function patchNavTemplate() {
  const p = path.join(ROOT, 'scripts', 'templates', 'nav.html');
  let s = fs.readFileSync(p, 'utf8');
  const next = s.replace(
    /style="height:60px;width:auto"/g,
    ''
  ).replace(
    /<img src="assets\/images\/logos\/LAKE_GROUP_LOGO\.png" alt="Lake Group"\s*>/,
    '<img src="assets/images/logos/LAKE_GROUP_LOGO.png" alt="Lake Group">'
  );
  if (next !== s) {
    fs.writeFileSync(p, next, 'utf8');
    return true;
  }
  return false;
}

function patchIndexHero() {
  const p = path.join(ROOT, 'index.html');
  let s = fs.readFileSync(p, 'utf8');
  // Align home hero photo opacity with shared pattern (was 0.18 washed out)
  s = s.replace(
    /\.hero-photo \{\n      position: absolute;\n      inset: 0;\n      background-image: url\("assets\/images\/banner\/LakeOil\.jpg"\);\n      background-size: cover;\n      background-position: center;\n      opacity: 0\.18;\n    \}/,
    `.hero-photo {
      position: absolute;
      inset: 0;
      z-index: 0;
      background-image: url("assets/images/banner/LakeOil.jpg");
      background-size: cover;
      background-position: center;
      opacity: 1;
      filter: saturate(0.92) contrast(1.05);
    }`
  );
  s = s.replace(
    /\.hero-overlay \{\n      position: absolute;\n      inset: 0;\n      background: linear-gradient\(90deg,\n          rgba\(1, 63, 92, 0\.95\) 0%,\n          rgba\(1, 63, 92, 0\.6\) 60%,\n          rgba\(1, 63, 92, 0\.2\) 100%\);\n    \}/,
    `.hero-overlay {
      position: absolute;
      inset: 0;
      z-index: 1;
      background: var(--hero-overlay-gradient, linear-gradient(105deg,
          rgba(1, 63, 92, 0.92) 0%,
          rgba(1, 129, 187, 0.75) 45%,
          rgba(1, 129, 187, 0.22) 100%));
    }`
  );
  // Index nav logo: use token + important to match interiors
  s = s.replace(
    /\.nav-logo img \{\n      height: var\(--nav-logo-height\);\n      width: auto;\n      display: block;\n    \}/,
    `.nav-logo img,
    .site-nav .nav-logo img {
      height: var(--nav-logo-height) !important;
      width: auto !important;
      max-height: var(--nav-logo-height);
      display: block;
    }`
  );
  s = stripInlineLogo(s);
  fs.writeFileSync(p, s, 'utf8');
  return true;
}

function bumpSw() {
  const p = path.join(ROOT, 'sw.js');
  let s = fs.readFileSync(p, 'utf8');
  const m = s.match(/const VERSION = 'v(\d+)'/);
  if (!m) throw new Error('VERSION not found');
  const next = 'v' + (parseInt(m[1], 10) + 1);
  s = s.replace(/const VERSION = 'v\d+'/, `const VERSION = '${next}'`);
  fs.writeFileSync(p, s, 'utf8');
  return next;
}

function main() {
  const changed = [];
  if (patchTokens()) changed.push('assets/tokens.css');
  if (patchFlagship()) changed.push('assets/flagship.css');
  if (patchTheme()) changed.push('assets/theme.css');
  if (patchSiteJs()) changed.push('assets/site.js');
  if (patchNavTemplate()) changed.push('scripts/templates/nav.html');
  if (patchIndexHero()) changed.push('index.html');

  const htmls = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html') && f !== 'index.html');
  for (const f of htmls) {
    if (processHtmlFile(f)) changed.push(f);
  }

  const ver = bumpSw();
  console.log('SW VERSION →', ver);
  console.log('Changed files:', changed.length);
  changed.forEach((f) => console.log(' -', f));
}

main();
