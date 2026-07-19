#!/usr/bin/env node
/**
 * Replace leadership profile text prev/next with full ld-person-card suggestions.
 * Run: node scripts/_patch_lp_nav_cards.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const LEADERS = [
  {
    id: 'ally-edha-awadh',
    name: 'Ally Edha Awadh',
    role: 'Executive Chairman &amp; Owner',
    photo: 'assets/images/leadership/ally-edha-awadh.png',
    photoLogo: false,
    nameKey: 'leadership.9',
    roleKey: 'leadership.8',
    sumKey: 'leadership.104',
    summary:
      'Forbes-featured entrepreneur who founded Lake Oil in 2006 and built Lake Group into one of East and Central Africa’s leading energy, logistics and industrial conglomerates.',
  },
  {
    id: 'sibtian-ansari',
    name: 'Sibtian Ansari',
    role: 'CEO · Manufacturing Division',
    photo: 'assets/images/leadership/sibtian-ansari.png',
    photoLogo: false,
    nameKey: 'leadership.17',
    roleKey: 'leadership.18',
    sumKey: 'leadership.105',
    summary:
      'Leads Lake Group’s structural industrial expansions - most notably Lake Steel - spanning production infrastructure, manufacturing output, concrete products and construction supply networks.',
  },
  {
    id: 'vivek-choudhary',
    name: 'Vivek Choudhary',
    role: 'Director of Digital Transformation',
    photo: 'assets/images/leadership/vivek-choudhary.png',
    photoLogo: false,
    nameKey: 'leadership.20',
    roleKey: 'leadership.21',
    sumKey: 'leadership.106',
    summary:
      'Owns enterprise technology architecture and digital strategy - from centralised SAP environments to logistics intelligence and cross-border data security.',
  },
  {
    id: 'bhaskar-shetty',
    name: 'Bhaskar S. Shetty',
    role: 'Managing Director · ATL',
    photo: 'assets/images/leadership/bhaskar-shetty.png',
    photoLogo: false,
    nameKey: 'leadership.23',
    roleKey: 'leadership.24',
    sumKey: 'leadership.107',
    summary:
      'Directs Associated Trans Logistics Ltd (ATL), operating alongside Lake Trans as a logistical backbone for fuel fleets, heavy haulage and multi-national cargo corridors.',
  },
  {
    id: 'pankaj-kumar',
    name: 'Pankaj Kumar',
    role: 'CFO · AFICD',
    photo: 'assets/images/leadership/pankaj-kumar.png',
    photoLogo: false,
    nameKey: 'leadership.26',
    roleKey: 'leadership.27',
    sumKey: 'leadership.108',
    summary:
      'Oversees financial planning, risk analysis and corporate governance for African Inland Container Depot (AFICD) - Lake Group’s dry-port platform in Dar es Salaam.',
  },
  {
    id: 'juma-nuru',
    name: 'Juma Nuru',
    role: 'Director of Operations · Lake Group',
    photo: 'assets/images/logos/LAKE_GROUP_LOGO.png',
    photoLogo: true,
    nameKey: 'leadership.51',
    roleKey: 'leadership.52',
    sumKey: 'leadership.53',
    summary:
      'Leads Group-wide operations across Lake Group’s energy, logistics and industrial units - coordinating day-to-day execution and operational performance.',
  },
  {
    id: 'nassoro-abubakari',
    name: 'Nassoro Abubakari',
    role: 'Project Manager · Lake Agro',
    photo: 'assets/images/logos/LAKE_GROUP_LOGO.png',
    photoLogo: true,
    nameKey: 'leadership.54',
    roleKey: 'leadership.55',
    sumKey: 'leadership.56',
    summary:
      'Manages Lake Agro project delivery - greenfield development, agribusiness programmes and related Group project coordination.',
  },
];

const byId = Object.fromEntries(LEADERS.map((l) => [l.id, l]));

/** Listing-matched card styles + card-style profile nav */
const NEW_STYLE_BLOCK = `/* Leadership cards — match leadership.html directory language */
.ld-intro { max-width: 720px; margin: 0 auto var(--sp-12); text-align: center; }
.ld-intro .section-subtitle { margin-top: 14px; }
.ld-team-label { margin-bottom: var(--sp-10); text-align: center; }

a.ld-person-card {
  position: relative;
  display: flex; flex-direction: column; text-decoration: none; color: inherit;
  background: transparent;
  border: none;
  overflow: visible;
  transition: transform .28s var(--ease-out, ease);
}
a.ld-person-card:hover { transform: translateY(-3px); }
a.ld-person-card:focus-visible {
  outline: 2px solid var(--color-brand-blue, #0181BB);
  outline-offset: 4px;
  border-radius: 4px;
}

.ld-person-photo {
  position: relative;
  aspect-ratio: 5 / 4;
  border-radius: 10px;
  overflow: hidden;
  background: #EEF1F5;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ld-person-photo img {
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  object-position: center center;
  display: block;
  transition: transform .4s var(--ease-out, ease);
}
a.ld-person-card:hover .ld-person-photo img { transform: scale(1.02); }

.ld-person-photo--logo { background: #EEF1F5; }
.ld-person-photo--logo img {
  width: 42%;
  height: auto;
  max-height: 55%;
  object-fit: contain;
}
a.ld-person-card:hover .ld-person-photo--logo img { transform: none; }

.ld-person-body {
  padding: 16px 2px 0;
  display: flex; flex-direction: column; flex: 1; gap: 4px;
}
.ld-person-body h3 {
  font-family: var(--font-display, var(--font-heading));
  font-weight: 600;
  font-size: 1.08rem;
  letter-spacing: 0.01em;
  text-transform: none;
  margin: 0;
  color: #0A1628;
  line-height: 1.25;
}
.ld-person-role {
  color: #6B7280;
  font-size: 0.875rem;
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
  margin: 0;
  line-height: 1.4;
}
/* Directory hides bios; profile nav shows a short clamp */
.ld-person-sum { display: none; }
.lp-nav .ld-person-sum {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 0.875rem;
  color: var(--mute, var(--color-text-body));
  line-height: 1.5;
  margin: 6px 0 0;
  flex: 1;
}

.ld-person-more {
  margin-top: 14px;
  font-size: 0.9rem;
  font-weight: 500;
  letter-spacing: 0;
  text-transform: none;
  color: var(--color-brand-blue, #0181BB);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.ld-panel { background: var(--ink); padding: var(--sp-12) var(--sp-8); text-align: center; margin-top: var(--sp-16); }
.ld-panel h3 { color: #fff; font-family: var(--font-display, var(--font-heading)); font-weight: 400; font-size: clamp(1.7rem, 3vw, 2.4rem); text-transform: uppercase; letter-spacing: 0.02em; margin-bottom: var(--sp-3); }
.ld-panel p { color: var(--ink-text, rgba(255,255,255,.85)); max-width: 560px; margin: 0 auto; }

/* Profile page */
.lp-hero { padding: calc(var(--navbar-height, 72px) + 48px) 0 40px; background: linear-gradient(180deg, rgba(1,129,187,0.08), transparent); }
.lp-crumb { font-size: var(--breadcrumb-size, .72rem); letter-spacing: var(--breadcrumb-letter-spacing, .18em); text-transform: uppercase; color: var(--mute); margin-bottom: 18px; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.lp-crumb a { color: var(--color-brand-blue, #0181BB); text-decoration: none; }
.lp-crumb a:hover { text-decoration: underline; }
.lp-layout { display: grid; grid-template-columns: minmax(260px, 380px) 1fr; gap: clamp(32px, 5vw, 72px); align-items: start; padding-bottom: var(--sp-16); }
@media (max-width: 880px) { .lp-layout { grid-template-columns: 1fr; } }
.lp-photo-wrap { position: sticky; top: calc(var(--navbar-height, 72px) + 20px); }
@media (max-width: 880px) { .lp-photo-wrap { position: static; max-width: 420px; } }
.lp-photo { aspect-ratio: 4/5; overflow: hidden; background: var(--ink-3, #0e2433); border: 1px solid var(--line-2); }
.lp-photo img { width: 100%; height: 100%; object-fit: cover; object-position: top center; display: block; }
.lp-photo--logo { display: flex; align-items: center; justify-content: center; background: var(--surface); aspect-ratio: 1; }
.lp-photo--logo img { width: 58%; height: auto; object-fit: contain; }
.lp-unit { color: var(--gold-deep, var(--color-brand-blue)); font-size: var(--fs-micro, .72rem); font-weight: 700; letter-spacing: .18em; text-transform: uppercase; margin-bottom: 10px; }
.lp-name { font-family: var(--font-display, var(--font-heading)); font-weight: 400; font-size: clamp(2.4rem, 5vw, 3.8rem); line-height: 1; text-transform: uppercase; letter-spacing: .02em; margin: 0 0 10px; color: var(--ink, var(--color-text-heading)); }
.lp-role { font-size: 1.05rem; color: var(--mute); margin: 0 0 22px; }
.lp-lede { font-size: 1.12rem; line-height: 1.65; color: var(--ink, var(--color-text-heading)); margin: 0 0 22px; max-width: 62ch; }
.lp-body p { font-size: .98rem; line-height: 1.75; color: var(--mute, var(--color-text-body)); margin: 0 0 16px; max-width: 68ch; }
.lp-quote { font-family: var(--font-serif); font-style: italic; font-size: 1.15rem; line-height: 1.7; border-left: 3px solid var(--color-yellow-accent, #FFF200); padding: 4px 0 4px 20px; margin: 28px 0; color: var(--ink, var(--color-text-heading)); max-width: 60ch; }
.lp-mandate { list-style: none; padding: 0; margin: 28px 0; display: grid; gap: 12px; }
.lp-mandate li { display: grid; grid-template-columns: 36px 1fr; gap: 12px; align-items: start; padding: 14px 16px; background: var(--surface); border: 1px solid var(--line-2); }
.lp-mandate li span:first-child { font-weight: 700; color: var(--color-brand-blue, #0181BB); font-size: .8rem; letter-spacing: .08em; }
.lp-meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 28px 0; }
@media (max-width: 640px) { .lp-meta { grid-template-columns: 1fr; } }
.lp-meta div { padding: 16px; background: var(--surface); border: 1px solid var(--line-2); }
.lp-meta strong { display: block; font-size: 1.15rem; color: var(--ink, var(--color-text-heading)); margin-bottom: 4px; }
.lp-meta span { font-size: .82rem; color: var(--mute); }
.lp-contact { display: grid; gap: 10px; margin: 28px 0; padding: 20px; border: 1px solid var(--line-2); background: var(--surface); }
.lp-contact strong { display: block; font-size: .72rem; letter-spacing: .14em; text-transform: uppercase; color: var(--gold-deep, var(--color-brand-blue)); margin-bottom: 4px; }
.lp-contact a { color: var(--color-brand-blue, #0181BB); }
.lp-links { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 8px; }

/* Prev / next as full leadership cards */
.lp-nav {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 36px 28px;
  padding: 36px 0 12px;
  border-top: 1px solid var(--line-2);
  margin-top: 48px;
  align-items: stretch;
}
.lp-nav > a.ld-person-card { min-width: 0; }
.lp-nav-all {
  grid-column: 1 / -1;
  display: flex;
  justify-content: center;
  padding-top: 4px;
}
.lp-nav-all .btn { text-decoration: none; }
@media (max-width: 640px) {
  .lp-nav {
    grid-template-columns: 1fr;
    max-width: 320px;
    margin-left: auto;
    margin-right: auto;
    gap: 32px;
  }
}
`;

function personCard(leader) {
  const photoClass = leader.photoLogo
    ? 'ld-person-photo ld-person-photo--logo'
    : 'ld-person-photo';
  return `<a class="ld-person-card" href="leadership-${leader.id}.html">
          <div class="${photoClass}"><img src="${leader.photo}" alt="${leader.name}" data-i18n-alt="${leader.nameKey}" loading="lazy" decoding="async"></div>
          <div class="ld-person-body">
            <h3><span data-i18n="${leader.nameKey}">${leader.name}</span></h3>
            <p class="ld-person-role"><span data-i18n="${leader.roleKey}">${leader.role}</span></p>
            <p class="ld-person-sum"><span data-i18n="${leader.sumKey}">${leader.summary}</span></p>
            <span class="ld-person-more"><span data-i18n="leadership.57">Read more</span></span>
          </div>
        </a>`;
}

function navHtml(prev, next) {
  return `<nav class="lp-nav" aria-label="Related leadership profiles">
          ${personCard(prev)}
          ${personCard(next)}
          <div class="lp-nav-all">
            <a href="leadership.html" class="btn btn-outline-dark btn-sm" data-i18n="leadership.58">All leadership</a>
          </div>
        </nav>`;
}

function replaceStyle(html) {
  const start = html.indexOf('<style>');
  const end = html.indexOf('</style>');
  if (start < 0 || end < 0) throw new Error('style block not found');
  return html.slice(0, start + 7) + '\n\n' + NEW_STYLE_BLOCK + '\n' + html.slice(end);
}

function replaceNav(html, prev, next) {
  const re =
    /<div class="lp-nav">[\s\S]*?<\/div>\s*(?=<\/article>|<\/div>\s*<\/article>)/;
  const nav = navHtml(prev, next);
  if (!re.test(html)) {
    // already a <nav class="lp-nav"> from a prior run
    const reNav =
      /<nav class="lp-nav"[^>]*>[\s\S]*?<\/nav>\s*(?=<\/article>)/;
    if (!reNav.test(html)) throw new Error('lp-nav block not found');
    return html.replace(reNav, nav + '\n        ');
  }
  return html.replace(re, nav + '\n        ');
}

let updated = 0;
for (let i = 0; i < LEADERS.length; i++) {
  const leader = LEADERS[i];
  const prev = LEADERS[(i - 1 + LEADERS.length) % LEADERS.length];
  const next = LEADERS[(i + 1) % LEADERS.length];
  const file = path.join(ROOT, `leadership-${leader.id}.html`);
  let html = fs.readFileSync(file, 'utf8');
  html = replaceStyle(html);
  html = replaceNav(html, prev, next);
  // Guard: no leftover arrow text nav
  if (/←\s*<span data-i18n="leadership\./.test(html) || /→<\/a>/.test(html)) {
    throw new Error(`leftover text nav in ${file}`);
  }
  fs.writeFileSync(file, html);
  console.log('updated', path.basename(file), `← ${prev.name} | ${next.name} →`);
  updated++;
}

// Keep build script in sync for future regenerations
const buildPath = path.join(ROOT, 'scripts', 'build_leadership_pages.js');
let build = fs.readFileSync(buildPath, 'utf8');

const dirStyleStart = build.indexOf('const DIR_STYLE = `');
const dirStyleEnd = build.indexOf('`;', dirStyleStart);
if (dirStyleStart < 0 || dirStyleEnd < 0) {
  console.warn('DIR_STYLE not found in build script — skipped');
} else {
  build =
    build.slice(0, dirStyleStart) +
    'const DIR_STYLE = `\n' +
    NEW_STYLE_BLOCK +
    '`;' +
    build.slice(dirStyleEnd + 2);
}

const oldNavSnippet = `        <div class="lp-nav">
          <a href="leadership-\${prev.id}.html">← \${esc(prev.name)}</a>
          <a href="leadership.html">All leadership</a>
          <a href="leadership-\${next.id}.html">\${esc(next.name)} →</a>
        </div>`;

const newNavSnippet = `        <nav class="lp-nav" aria-label="Related leadership profiles">
          \${personCardHtml(prev)}
          \${personCardHtml(next)}
          <div class="lp-nav-all">
            <a href="leadership.html" class="btn btn-outline-dark btn-sm" data-i18n="leadership.58">All leadership</a>
          </div>
        </nav>`;

if (!build.includes(oldNavSnippet)) {
  console.warn('old lp-nav template not found exactly — trying flexible replace');
  build = build.replace(
    /<div class="lp-nav">[\s\S]*?<\/div>\n        <\/article>/,
    newNavSnippet + '\n      </article>'
  );
} else {
  build = build.replace(oldNavSnippet, newNavSnippet);
}

const helperFn = [
  'function personCardHtml(leader) {',
  "  const photoClass = leader.photoLogo",
  "    ? 'ld-person-photo ld-person-photo--logo'",
  "    : 'ld-person-photo';",
  "  const nameKey = leader.i18nName || '';",
  "  const roleKey = leader.i18nRole || '';",
  "  const sumKey = leader.i18nSum || '';",
  "  const nameAttr = nameKey ? ` data-i18n=\"${nameKey}\"` : '';",
  "  const roleAttr = roleKey ? ` data-i18n=\"${roleKey}\"` : '';",
  "  const sumAttr = sumKey ? ` data-i18n=\"${sumKey}\"` : '';",
  "  const altAttr = nameKey ? ` data-i18n-alt=\"${nameKey}\"` : '';",
  '  return `<a class="ld-person-card" href="leadership-${leader.id}.html">',
  '          <div class="${photoClass}"><img src="${esc(leader.photo)}" alt="${esc(leader.name)}"${altAttr} loading="lazy" decoding="async"></div>',
  '          <div class="ld-person-body">',
  '            <h3><span${nameAttr}>${esc(leader.name)}</span></h3>',
  '            <p class="ld-person-role"><span${roleAttr}>${esc(leader.role)}</span></p>',
  '            <p class="ld-person-sum"><span${sumAttr}>${esc(leader.summary)}</span></p>',
  '            <span class="ld-person-more"><span data-i18n="leadership.57">Read more</span></span>',
  '          </div>',
  '        </a>`;',
  '}',
  '',
  '',
].join('\n');

if (!build.includes('function personCardHtml(')) {
  const insertAt = build.indexOf('function esc(s)');
  if (insertAt < 0) throw new Error('esc() not found in build script');
  build = build.slice(0, insertAt) + helperFn + build.slice(insertAt);
}

fs.writeFileSync(buildPath, build);
console.log('updated scripts/build_leadership_pages.js');

// Sync _lp_bodies snippets if present
const bodiesDir = path.join(ROOT, 'scripts', '_lp_bodies');
if (fs.existsSync(bodiesDir)) {
  for (let i = 0; i < LEADERS.length; i++) {
    const leader = LEADERS[i];
    const prev = LEADERS[(i - 1 + LEADERS.length) % LEADERS.length];
    const next = LEADERS[(i + 1) % LEADERS.length];
    const bodyFile = path.join(bodiesDir, `leadership-${leader.id}.html.txt`);
    if (!fs.existsSync(bodyFile)) continue;
    let body = fs.readFileSync(bodyFile, 'utf8');
    const re = /<(?:div|nav) class="lp-nav"[^>]*>[\s\S]*?<\/(?:div|nav)>/;
    if (re.test(body)) {
      body = body.replace(re, navHtml(prev, next));
      fs.writeFileSync(bodyFile, body);
      console.log('updated', path.relative(ROOT, bodyFile));
    }
  }
}

console.log('done —', updated, 'profile pages');
