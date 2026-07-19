#!/usr/bin/env node
'use strict';
/**
 * One-shot: unify navbar to home look across flagship.css + theme.css,
 * shrink logo ~17% (72→60), reset company logo overrides, bump sw, etc.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function read(p) { return fs.readFileSync(p, 'utf8'); }
function write(p, s) { fs.writeFileSync(p, s, 'utf8'); console.log('wrote', path.relative(ROOT, p)); }

function replaceOnce(src, find, repl, label) {
  if (!src.includes(find)) {
    console.error('MISS:', label);
    return src;
  }
  return src.replace(find, repl);
}

/* --------------------------------------------------------------------------
   1. nav template logo height 72 → 60
   -------------------------------------------------------------------------- */
{
  const p = path.join(ROOT, 'scripts/templates/nav.html');
  let s = read(p);
  s = replaceOnce(s, 'style="height:72px;width:auto"', 'style="height:60px;width:auto"', 'nav template logo');
  write(p, s);
}

/* --------------------------------------------------------------------------
   2. index.html inline tokens + logo + active pill
   -------------------------------------------------------------------------- */
{
  const p = path.join(ROOT, 'index.html');
  let s = read(p);
  if (!s.includes('--nav-logo-h')) {
    s = replaceOnce(
      s,
      '      --nav-h: 72px;\n      --radius: 4px;',
      '      --nav-h: 72px;\n      --nav-logo-h: 60px;\n      --nav-logo-h-scrolled: 45px;\n      --radius: 4px;',
      'index tokens lf'
    );
    if (!s.includes('--nav-logo-h')) {
      s = replaceOnce(
        s,
        '      --nav-h: 72px;\r\n      --radius: 4px;',
        '      --nav-h: 72px;\r\n      --nav-logo-h: 60px;\r\n      --nav-logo-h-scrolled: 45px;\r\n      --radius: 4px;',
        'index tokens crlf'
      );
    }
  }
  s = s.replace(/\.nav-logo img \{\s*height: 48px;/m, '.nav-logo img {\n      height: var(--nav-logo-h);');
  s = s.replace(
    /\.nav-links>li>a:hover,\s*\.nav-links>li>a\.active \{\s*color: var\(--yellow\);\s*background: rgba\(255, 255, 255, 0\.07\);\s*\}/m,
    '.nav-links>li>a:hover,\n    .nav-links>li>a.active {\n      color: var(--yellow);\n      background: rgba(255, 255, 255, 0.16);\n      border-radius: 999px;\n    }'
  );
  write(p, s);
}

/* --------------------------------------------------------------------------
   3. theme.css - tokens, logo size, company reset, sentence-case links, pill active, home lang switcher
   -------------------------------------------------------------------------- */
{
  const p = path.join(ROOT, 'assets/theme.css');
  let s = read(p);

  s = s.replace(
    /  --nav-h:\s*80px;\n  --radius:\s*4px;/,
    '  --nav-h:   72px;\n  --nav-logo-h: 60px;          /* ~17% below prior 72px global mark */\n  --nav-logo-h-scrolled: 45px;\n  --radius:  4px;'
  );
  if (!s.includes('--nav-logo-h')) {
    s = s.replace(
      /  --nav-h:\s*80px;\r\n  --radius:\s*4px;/,
      '  --nav-h:   72px;\r\n  --nav-logo-h: 60px;\r\n  --nav-logo-h-scrolled: 45px;\r\n  --radius:  4px;'
    );
  }

  // Logo sizes + company overrides block
  const oldCompanyBlock = `/* Tighter desktop nav rhythm (logo sizes untouched). */
.nav-links { gap: 0; }
.nav-links > li > a {
  color: rgba(255,255,255,0.85);
  padding: 8px 8px;
  letter-spacing: 0.08em;
  gap: 4px;
  transition: color 0.2s ease, background 0.2s ease, transform 0.2s var(--ease-out);
}
.nav-links > li > a:hover,
.nav-links > li > a.active { color: var(--yellow); background: rgba(255,255,255,0.07); transform: translateY(-1px); }

.nav-logo { transition: transform var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) ease; }
.nav-logo:hover { transform: translateY(-2px) scale(1.02); box-shadow: var(--shadow-md); }
.nav-logo img { height: 72px !important; width: auto; object-fit: contain; transition: transform var(--dur-fast) var(--ease-out), height 0.3s var(--ease-smooth); }
/* Company pages: massive nav mark (112 / scrolled 80). Tall bar so it does not clip. */
body[data-company-logo] {
  --nav-h: 128px;
}
body[data-company-logo] .site-nav {
  height: var(--nav-h);
  overflow: visible;
}
body[data-company-logo] .site-nav.nav-scrolled {
  height: 96px;
}
body[data-company-logo] .site-nav.nav-scrolled .nav-links > li {
  height: 96px;
}
.nav-logo.nav-logo--company,
body[data-company-logo] .site-nav .nav-logo {
  max-width: none;
  overflow: visible;
}
.nav-logo.nav-logo--company img,
body[data-company-logo] .site-nav .nav-logo img {
  height: 112px !important;
  width: auto !important;
  max-width: none !important;
  max-height: none !important;
  object-fit: contain;
}
.site-nav.nav-scrolled .nav-logo.nav-logo--company img,
body[data-company-logo] .site-nav.nav-scrolled .nav-logo img {
  height: 80px !important;
}`;

  const newCompanyBlock = `/* Desktop nav rhythm - home sentence-case + soft pill active */
.nav-links { gap: 2px; }
.nav-links > li > a {
  color: rgba(255,255,255,0.85);
  padding: 9px 13px;
  font-size: 0.86rem;
  font-weight: 500;
  letter-spacing: normal;
  text-transform: none;
  gap: 5px;
  border-radius: 999px;
  transition: color 0.2s ease, background 0.2s ease;
}
.nav-links > li > a:hover,
.nav-links > li > a.active {
  color: var(--yellow);
  background: rgba(255,255,255,0.16);
  transform: none;
}

.nav-logo { transition: transform var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) ease; }
.nav-logo:hover { transform: translateY(-2px) scale(1.02); box-shadow: var(--shadow-md); }
.nav-logo img {
  height: var(--nav-logo-h) !important;
  width: auto;
  object-fit: contain;
  transition: transform var(--dur-fast) var(--ease-out), height 0.3s var(--ease-smooth);
}
.site-nav.nav-scrolled .nav-logo img { height: var(--nav-logo-h-scrolled) !important; }
/* Company pages: same logo size as group mark (swap via site.js) */
body[data-company-logo] { --nav-h: 72px; }
body[data-company-logo] .site-nav { height: var(--nav-h); overflow: visible; }
.nav-logo.nav-logo--company,
body[data-company-logo] .site-nav .nav-logo {
  max-width: none;
  overflow: visible;
}
.nav-logo.nav-logo--company img,
body[data-company-logo] .site-nav .nav-logo img {
  height: var(--nav-logo-h) !important;
  width: auto !important;
  max-width: none !important;
  max-height: none !important;
  object-fit: contain;
}
.site-nav.nav-scrolled .nav-logo.nav-logo--company img,
body[data-company-logo] .site-nav.nav-scrolled .nav-logo img {
  height: var(--nav-logo-h-scrolled) !important;
}`;

  if (s.includes(oldCompanyBlock)) {
    s = s.replace(oldCompanyBlock, newCompanyBlock);
  } else {
    console.error('MISS: theme company/nav links block - applying regex fallbacks');
    s = s.replace(/\.site-nav\.nav-scrolled \.nav-logo img \{ height: 54px !important; \}/, '.site-nav.nav-scrolled .nav-logo img { height: var(--nav-logo-h-scrolled) !important; }');
    s = s.replace(/\.nav-logo img \{ height: 72px !important;/, '.nav-logo img { height: var(--nav-logo-h) !important;');
    s = s.replace(/letter-spacing: 0\.08em;\n  gap: 4px;/, 'letter-spacing: normal;\n  text-transform: none;\n  gap: 5px;');
    s = s.replace(
      /\.nav-links > li > a:hover,\n\.nav-links > li > a\.active \{ color: var\(--yellow\); background: rgba\(255,255,255,0\.07\); transform: translateY\(-1px\); \}/,
      '.nav-links > li > a:hover,\n.nav-links > li > a.active { color: var(--yellow); background: rgba(255,255,255,0.16); transform: none; border-radius: 999px; }'
    );
    s = s.replace(/body\[data-company-logo\] \{\n  --nav-h: 128px;\n\}/, 'body[data-company-logo] {\n  --nav-h: 72px;\n}');
    s = s.replace(
      /body\[data-company-logo\] \.site-nav\.nav-scrolled \{\n  height: 96px;\n\}\nbody\[data-company-logo\] \.site-nav\.nav-scrolled \.nav-links > li \{\n  height: 96px;\n\}\n/,
      ''
    );
    s = s.replace(
      /\.nav-logo\.nav-logo--company img,\nbody\[data-company-logo\] \.site-nav \.nav-logo img \{\n  height: 112px !important;/,
      '.nav-logo.nav-logo--company img,\nbody[data-company-logo] .site-nav .nav-logo img {\n  height: var(--nav-logo-h) !important;'
    );
    s = s.replace(
      /\.site-nav\.nav-scrolled \.nav-logo\.nav-logo--company img,\nbody\[data-company-logo\] \.site-nav\.nav-scrolled \.nav-logo img \{\n  height: 80px !important;\n\}/,
      '.site-nav.nav-scrolled .nav-logo.nav-logo--company img,\nbody[data-company-logo] .site-nav.nav-scrolled .nav-logo img {\n  height: var(--nav-logo-h-scrolled) !important;\n}'
    );
  }

  // Also fix earlier scrolled rule if still 54px
  s = s.replace(
    '.site-nav.nav-scrolled .nav-logo img { height: 54px !important; }',
    '.site-nav.nav-scrolled .nav-logo img { height: var(--nav-logo-h-scrolled) !important; }'
  );

  // Language switcher - home yellow pill style
  const oldLang = `/* Language switcher - no capsule/plate; active via color + underline */
.lang-switcher {
  display: flex; align-items: center; gap: 2px; margin-left: 10px;
  border: none; border-radius: 0; overflow: visible;
  background: transparent;
}
.lang-btn {
  -webkit-appearance: none; appearance: none;
  background: transparent; border: none; color: rgba(255,255,255,0.7);
  padding: 6px 7px; font-size: 0.68rem; font-weight: 700; letter-spacing: 0.08em;
  cursor: pointer; line-height: 1; text-decoration: none;
  transition: color var(--dur-fast) ease, transform var(--dur-fast) var(--ease-out);
}
.lang-btn + .lang-btn { border-left: none; }
.lang-btn.active {
  background: transparent; color: var(--yellow);
  text-decoration: underline; text-underline-offset: 4px; text-decoration-thickness: 2px;
}
.lang-btn:hover:not(.active) { color: #fff; background: transparent; transform: translateY(-1px); }
.lang-btn:focus-visible { outline: 2px solid var(--yellow); outline-offset: 2px; }`;

  const newLang = `/* Language switcher - home yellow pill buttons */
.lang-switcher {
  display: flex; align-items: center; gap: 3px; margin-left: 10px; margin-right: 6px;
  border: none; border-radius: 0; overflow: visible;
  background: transparent;
}
.lang-btn {
  -webkit-appearance: none; appearance: none;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.25);
  color: rgba(255,255,255,0.85);
  padding: 5px 8px; font-size: 0.7rem; font-weight: 700;
  cursor: pointer; line-height: 1; text-decoration: none;
  border-radius: 3px; font-family: inherit;
  transition: all 0.15s ease;
}
.lang-btn + .lang-btn { border-left: 1px solid rgba(255,255,255,0.25); }
.lang-btn.active,
.lang-btn:hover {
  background: var(--yellow); color: var(--blue); border-color: var(--yellow);
  text-decoration: none;
}
.lang-btn:focus-visible { outline: 2px solid var(--yellow); outline-offset: 2px; }`;

  if (s.includes(oldLang)) s = s.replace(oldLang, newLang);
  else console.error('MISS: theme lang-switcher block');

  write(p, s);
}

/* --------------------------------------------------------------------------
   4. flagship.css - replace ink drafting nav with home blue bar
   -------------------------------------------------------------------------- */
{
  const p = path.join(ROOT, 'assets/flagship.css');
  let s = read(p);

  s = s.replace(
    /  \/\* Chrome \*\/\n  --nav-h: 84px;/,
    '  /* Chrome - aligned to home (index.html) nav bar */\n  --nav-h: 72px;\n  --nav-logo-h: 60px;          /* ~17% below prior 72px global mark */\n  --nav-logo-h-scrolled: 45px;'
  );
  if (!s.includes('--nav-logo-h')) {
    s = s.replace(/--nav-h: 84px;/, '--nav-h: 72px;\n  --nav-logo-h: 60px;\n  --nav-logo-h-scrolled: 45px;');
  }

  // Body base type closer to home
  s = s.replace(
    /body \{\n  font-family: var\(--font-body\);\n  font-size: var\(--fs-body\);\n  line-height: 1\.75;/,
    'body {\n  font-family: var(--font-body);\n  font-size: 16px;\n  line-height: 1.7;'
  );

  const navStart = '/* --------------------------------------------------------------------------\n   6. NAV  ink drafting bar\n   -------------------------------------------------------------------------- */';
  const navEnd = '/* --------------------------------------------------------------------------\n   6b. MEGA MENU';
  const i0 = s.indexOf(navStart);
  const i1 = s.indexOf(navEnd);
  if (i0 === -1 || i1 === -1) {
    console.error('MISS: flagship nav section markers', i0, i1);
  } else {
    const newNav = `/* --------------------------------------------------------------------------
   6. NAV  brand blue bar (matches home / index.html)
   -------------------------------------------------------------------------- */
.site-nav {
  position: fixed; top: 0; left: 0; right: 0; z-index: 1000;
  height: var(--nav-h);
  background: var(--blue);
  border-bottom: 3px solid var(--yellow);
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  transition: transform var(--dur-2) var(--ease-out), box-shadow 0.3s ease, background-color 0.3s ease, height 0.3s var(--ease-out);
  will-change: transform;
}
.site-nav::after { display: none; } /* home uses full yellow border-bottom, not meridian tick */
.site-nav.nav-scrolled {
  height: 60px;
  background: rgba(1,102,148,0.96);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: 0 8px 30px rgba(4,10,34,0.35);
}
.site-nav.nav-hidden { transform: translateY(-100%); }

.nav-inner { max-width: 1340px; margin: 0 auto; padding: 0 28px; display: flex; align-items: center; width: 100%; height: 100%; }
.nav-logo { display: flex; align-items: center; flex-shrink: 0; background: transparent; padding: 0; border-radius: 0; transition: transform var(--dur-2) var(--ease-out), box-shadow var(--dur-2) ease; }
.nav-logo:hover { transform: translateY(-2px) scale(1.02); box-shadow: none; }
.nav-logo img {
  height: var(--nav-logo-h) !important;
  width: auto; display: block; object-fit: contain;
  transition: transform var(--dur-2) var(--ease-out), height 0.3s var(--ease-out);
}
.site-nav.nav-scrolled .nav-logo { padding: 0; }
.site-nav.nav-scrolled .nav-logo img { height: var(--nav-logo-h-scrolled) !important; }
/* Company pages: same size as group mark (data-company-logo swap via site.js) */
body[data-company-logo] { --nav-h: 72px; }
body[data-company-logo] .site-nav { overflow: visible; }
body[data-company-logo] .site-nav.nav-scrolled { height: 60px; }
body[data-company-logo] .site-nav.nav-scrolled .nav-links > li { height: 60px; }
.nav-logo.nav-logo--company,
body[data-company-logo] .site-nav .nav-logo {
  max-width: none;
  overflow: visible;
}
.nav-logo.nav-logo--company img,
body[data-company-logo] .site-nav .nav-logo img {
  height: var(--nav-logo-h) !important;
  width: auto !important;
  max-width: none !important;
  max-height: none !important;
  object-fit: contain;
}
.site-nav.nav-scrolled .nav-logo.nav-logo--company img,
body[data-company-logo] .site-nav.nav-scrolled .nav-logo img {
  height: var(--nav-logo-h-scrolled) !important;
}

.nav-links { display: flex; align-items: center; gap: 2px; list-style: none; margin-left: auto; }
.nav-links > li { position: relative; height: var(--nav-h); display: flex; align-items: center; }
.site-nav.nav-scrolled .nav-links > li { height: 60px; }
.nav-links > li > a {
  position: relative;
  display: flex; align-items: center; gap: 5px;
  padding: 9px 13px;
  border-radius: 999px;
  color: rgba(255,255,255,0.85);
  font-size: 0.86rem; font-weight: 500;
  letter-spacing: normal; text-transform: none;
  transition: color var(--dur-1) ease, background var(--dur-1) ease;
}
/* Hide flagship-era chevron glyph; markup already includes ▾ */
.nav-links > li.has-dropdown > a::before { content: none; display: none; }
.nav-links > li > a::after { display: none; } /* no underline active - pill bg instead */
.nav-links > li > a:hover,
.nav-links > li > a.active {
  color: var(--yellow);
  background: rgba(255,255,255,0.16);
}

.has-dropdown:hover .nav-dropdown, .has-dropdown:focus-within .nav-dropdown {
  opacity: 1; pointer-events: auto; transform: translateY(0);
}
.nav-dropdown {
  position: absolute; top: calc(100% + 6px); left: 0;
  background: linear-gradient(180deg, rgba(1,102,148,0.96), rgba(1,63,92,0.98));
  backdrop-filter: blur(18px) saturate(1.25);
  -webkit-backdrop-filter: blur(18px) saturate(1.25);
  border: 1px solid rgba(255,255,255,0.12);
  border-top: 2px solid var(--yellow);
  border-radius: 10px;
  padding: 8px;
  min-width: 220px;
  box-shadow:
    0 28px 56px -20px rgba(0,0,0,0.55),
    0 10px 22px -12px rgba(0,0,0,0.4),
    inset 0 1px 0 rgba(255,255,255,0.08);
  opacity: 0; pointer-events: none; transform: translateY(-6px);
  transform-origin: top center;
  transition: opacity 0.22s var(--ease-out), transform 0.22s var(--ease-out);
}
.nav-dropdown::before { display: none; }
.nav-dropdown::after { /* hover bridge */
  content: ''; position: absolute; top: -12px; left: 0; right: 0; height: 12px;
}
.has-dropdown:hover .nav-dropdown,
.has-dropdown:focus-within .nav-dropdown,
.has-dropdown.is-open .nav-dropdown {
  transform: translateY(0);
  transition: opacity var(--dur-1) var(--ease-out), transform 0.22s var(--ease-out);
}
.nav-dropdown a {
  display: flex; align-items: center; padding: 9px 14px;
  color: rgba(255,255,255,0.8); font-size: 0.84rem; font-weight: 500;
  border-radius: 4px;
  border-left: 0 solid transparent;
  transition: color var(--dur-1) ease, background var(--dur-1) ease;
}
.nav-dropdown a:hover, .nav-dropdown a:focus-visible {
  color: var(--yellow); background: rgba(255,242,0,0.12); padding-left: 14px;
}
.dd-label {
  padding: 10px 14px 3px; margin-bottom: 0;
  font-size: 0.68rem; letter-spacing: 0.1em; text-transform: uppercase;
  color: rgba(255,255,255,0.3); font-weight: 700;
  border-bottom: none;
}

/* Click-to-open / keyboard-open state, set by assets/site.js. :hover and
   :focus-within already open the panel via the rule above; this adds the
   same open state for a JS-driven click toggle so touch/click users (who
   get no :hover) and Enter/Space on the trigger both work, and lets the
   panel be explicitly closed on Escape even while the mouse still hovers. */
.has-dropdown.is-open .nav-dropdown {
  opacity: 1; pointer-events: auto; transform: translateY(0);
}

`;
    s = s.slice(0, i0) + newNav + s.slice(i1);
  }

  // Mobile nav + lang switcher (still in flagship after mega menu)
  s = s.replace(
    /\.nav-mobile \{\n  display: none !important;\n  position: fixed; top: var\(--nav-h\); left: 0; right: 0; z-index: 999;\n  background: var\(--ink-2\);\n  border-bottom: 2px solid var\(--gold\);/,
    '.nav-mobile {\n  display: none !important;\n  position: fixed; top: var(--nav-h); left: 0; right: 0; z-index: 999;\n  background: var(--blue2);\n  border-bottom: 2px solid var(--yellow);'
  );

  const oldFsLang = `/* Language switcher - no capsule/plate; active via color + underline */
.lang-switcher {
  display: flex; align-items: center; gap: 2px; margin-left: var(--sp-3);
  border: none; border-radius: 0; overflow: visible;
  background: transparent;
}
.lang-btn {
  -webkit-appearance: none; appearance: none;
  background: transparent; border: none; color: rgba(233,237,248,0.6);
  padding: 6px 7px; font-size: 0.68rem; font-weight: 700; letter-spacing: 0.08em;
  cursor: pointer; font-family: var(--font-body); line-height: 1;
  text-decoration: none;
  transition: color var(--dur-1) ease;
}
.lang-btn + .lang-btn { border-left: none; }
.lang-btn.active {
  background: transparent; color: var(--gold);
  text-decoration: underline; text-underline-offset: 4px; text-decoration-thickness: 2px;
}
.lang-btn:hover:not(.active) { color: #fff; background: transparent; }
.lang-btn:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }`;

  const newFsLang = `/* Language switcher - home yellow pill buttons */
.lang-switcher {
  display: flex; align-items: center; gap: 3px; margin-left: 10px; margin-right: 6px;
  border: none; border-radius: 0; overflow: visible;
  background: transparent;
}
.lang-btn {
  -webkit-appearance: none; appearance: none;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.25);
  color: rgba(255,255,255,0.85);
  padding: 5px 8px; font-size: 0.7rem; font-weight: 700;
  cursor: pointer; font-family: var(--font-body); line-height: 1;
  text-decoration: none; border-radius: 3px;
  transition: all 0.15s ease;
}
.lang-btn + .lang-btn { border-left: 1px solid rgba(255,255,255,0.25); }
.lang-btn.active,
.lang-btn:hover {
  background: var(--yellow); color: var(--blue); border-color: var(--yellow);
  text-decoration: none;
}
.lang-btn:focus-visible { outline: 2px solid var(--yellow); outline-offset: 2px; }`;

  if (s.includes(oldFsLang)) s = s.replace(oldFsLang, newFsLang);
  else console.error('MISS: flagship lang-switcher');

  // Soften nav-cta to home yellow/blue
  s = s.replace(
    /\.nav-cta \{\n  margin-left: var\(--sp-3\);\n  background: var\(--gold\) !important; color: var\(--ink\) !important;\n  padding: 10px 20px !important; font-weight: 700 !important;\n\}/,
    '.nav-cta {\n  margin-left: 12px;\n  background: var(--yellow) !important; color: var(--blue) !important;\n  padding: 9px 18px !important; font-weight: 700 !important;\n  border-radius: 4px !important;\n}'
  );

  write(p, s);
}

/* --------------------------------------------------------------------------
   5. site.js comment + ensure logo size note
   -------------------------------------------------------------------------- */
{
  const p = path.join(ROOT, 'assets/site.js');
  let s = read(p);
  s = s.replace(
    '// Match homepage Lake Group nav mark (72px / 54px scrolled via CSS).',
    '// Match homepage Lake Group nav mark (60px / 45px scrolled via CSS).'
  );
  write(p, s);
}

/* --------------------------------------------------------------------------
   6. bump sw.js VERSION
   -------------------------------------------------------------------------- */
{
  const p = path.join(ROOT, 'sw.js');
  let s = read(p);
  s = s.replace("const VERSION = 'v26';", "const VERSION = 'v27';");
  write(p, s);
}

console.log('\\n_unify_nav.js complete');
