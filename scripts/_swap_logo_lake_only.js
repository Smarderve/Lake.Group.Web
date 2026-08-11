/* Swap navbar + footer Lake Group logo to lake-only version across all pages.
 * Matches index.html's already-applied pattern (navbar + footer use LAKE_LOGO_LAKE_ONLY.png).
 * Deliberately leaves untouched:
 *   - meta og:image / twitter:image (social share, full logo URL)
 *   - JSON-LD "logo" references
 *   - decorative finale logos (experience-3d-finale-logo, aramco-card-logo)
 *   - about.html's ose-photo story image (full logo lockup on purpose)
 */
'use strict';
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const pages = fs.readdirSync(root).filter((f) => /\.html$/.test(f));

const OLD = 'assets/images/logos/LAKE_GROUP_LOGO.png';
const NEW = 'assets/images/logos/LAKE_LOGO_LAKE_ONLY.png';

// 1) Navbar logo: <img src="...LAKE_GROUP_LOGO.png" alt="Lake Group" width="180" height="48" decoding="async">
const NAV_RE = /(<img src="assets\/images\/logos\/LAKE_GROUP_LOGO\.png" alt="Lake Group" width="180" height="48" decoding="async">)/g;

// 2) Footer logo: <img src="...LAKE_GROUP_LOGO.png" alt="Lake Group"> (no width/height attrs)
const FOOT_RE = /(<img src="assets\/images\/logos\/LAKE_GROUP_LOGO\.png" alt="Lake Group">)/g;

// 3) 404 / offline logo-wrap (width 180 height 44)
const WRAP_RE = /(src="assets\/images\/logos\/LAKE_GROUP_LOGO\.png" alt="Lake Group" width="180" height="44")/g;

let navCount = 0, footCount = 0, wrapCount = 0;
const changed = [];

for (const page of pages) {
  const fp = path.join(root, page);
  let html = fs.readFileSync(fp, 'utf8');
  const before = html;

  const navMatches = (html.match(NAV_RE) || []).length;
  html = html.replace(NAV_RE, (m) => m.replace(OLD, NEW));
  navCount += navMatches;

  const footMatches = (html.match(FOOT_RE) || []).length;
  html = html.replace(FOOT_RE, (m) => m.replace(OLD, NEW));
  footCount += footMatches;

  const wrapMatches = (html.match(WRAP_RE) || []).length;
  html = html.replace(WRAP_RE, (m) => m.replace(OLD, NEW));
  wrapCount += wrapMatches;

  if (html !== before) {
    fs.writeFileSync(fp, html);
    changed.push(`${page} (nav:${navMatches}, footer:${wrapMatches ? 'wrap' : footMatches})`);
  }
}

console.log(`Pages changed: ${changed.length}`);
changed.forEach((c) => console.log('  ' + c));
console.log(`Totals -> navbar:${navCount} footer:${footCount} logo-wrap:${wrapCount}`);
