#!/usr/bin/env node
/** Final cleanup: old page-name headings/IDs, hero-3d JS entries, deleted script entry. */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const htmlPath = path.join(root, 'docs', 'developer-guide.html');
const pyPath = path.join(root, 'docs', '_gen_developer_guide.py');

function readFile(p) { return fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n'); }
function writeWithRetry(p, s, attempts) {
  for (let i = 0; i < attempts; i++) {
    try { fs.writeFileSync(p, s, 'utf8'); return true; }
    catch (e) { if (i === attempts - 1) throw e; }
  }
  return false;
}

const RENAME = {
  'concrete.html': 'lake-premix-cement.html',
  'container-services.html': 'aficd.html',
  'fuel.html': 'lake-oil.html',
  'logistics.html': 'lake-trans.html',
  'lpg.html': 'lake-gas.html',
  'lubricants.html': 'lake-lubes.html',
  'steel.html': 'lake-steel.html',
};
const IDMAP = {
  'page-concrete': 'page-lake-premix-cement',
  'page-container-services': 'page-aficd',
  'page-fuel': 'page-lake-oil',
  'page-logistics': 'page-lake-trans',
  'page-lpg': 'page-lake-gas',
  'page-lubricants': 'page-lake-lubes',
  'page-steel': 'page-lake-steel',
};

let html = readFile(htmlPath);
let py = readFile(pyPath);
let htmlApplied = 0;

// 1) Page-ref article IDs in §5
for (const [oldId, newId] of Object.entries(IDMAP)) {
  if (html.includes(`id="${oldId}"`)) {
    html = html.split(`id="${oldId}"`).join(`id="${newId}"`);
    htmlApplied++;
  }
}
// 2) Page-ref / extended / essay headings (only standalone <h3>old.html</h3>)
for (const [oldName, newName] of Object.entries(RENAME)) {
  const pat = `<h3>${oldName}</h3>`;
  const re = new RegExp(pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
  if (re.test(html)) {
    html = html.replace(re, `<h3>${newName}</h3>`);
    htmlApplied++;
  }
  // essay headings are <h3>fuel.html</h3> as well (same form)
}
// 3) §24 extended JS articles for hero-3d (with trailing "See Section 6" text)
const heroJsOld = '<article class="js-ref"><h3>assets/hero-3d.js</h3><p>Three.js module (bundled to hero-3d.bundle.js). See Section 9.</p><p>See Section 6 for summary. Source in repository assets/ directory.</p></article>';
const heroJsNew = '<article class="js-ref"><h3>assets/hero-globe/ (React island)</h3><p>React + react-globe.gl hero source (HeroGlobe.jsx, mount.jsx, locations.js). See Section 8.</p><p>See Section 6 for summary. Source in repository assets/ directory.</p></article>';
if (html.includes(heroJsOld)) { html = html.split(heroJsOld).join(heroJsNew); htmlApplied++; }
const heroBundleOld = '<article class="js-ref"><h3>assets/hero-3d.bundle.js</h3><p>esbuild output: hero-3d.js + three.module.min.js as classic script. ~0.5MB. Rebuild via scripts/build_hero_bundle.sh.</p><p>See Section 6 for summary. Source in repository assets/ directory.</p></article>';
const heroBundleNew = '<article class="js-ref"><h3>assets/hero-globe.bundle.js</h3><p>esbuild output: React + react-globe.gl as classic IIFE. ~2MB. Rebuild via npm run build:hero-globe.</p><p>See Section 6 for summary. Source in repository assets/ directory.</p></article>';
if (html.includes(heroBundleOld)) { html = html.split(heroBundleOld).join(heroBundleNew); htmlApplied++; }

// 4) §40 encyclopedia: drop the deleted build_hero_bundle.sh entry article
const encStart = html.indexOf('<article class="script-ref page-break">\n<h3>scripts/build_hero_bundle.sh</h3>');
if (encStart >= 0) {
  const encEnd = html.indexOf('</article>', encStart) + '</article>'.length;
  const after = html.slice(encEnd);
  const next = after.indexOf('<article class="script-ref');
  const end = next === -1 ? after.length : next;
  html = html.slice(0, encStart) + after.slice(0, end) + after.slice(end);
  htmlApplied++;
}

// 5) §24 extended i18n note (html side)
const i18nNoteOld = 'Dispatches <code>lake-i18n-applied</code> CustomEvent with detail.lang after each apply. hero-3d.js and assistant.js listen for this to refresh localized strings.';
const i18nNoteNew = 'Dispatches <code>lake-i18n-applied</code> CustomEvent with detail.lang after each apply. hero-globe and assistant.js listen for this to refresh localized strings.';
if (html.includes(i18nNoteOld)) { html = html.split(i18nNoteOld).join(i18nNoteNew); htmlApplied++; }

// 6) i18n-content.js description: { en, fr, sw } → 6 languages (rendered + generator)
const icOld = 'window.__LAKE_I18N_CONTENT__ = { en: {...}, fr: {...}, sw: {...} }. ~1,442 keys.';
const icNew = 'window.__LAKE_I18N_CONTENT__ = { en, fr, sw, pt, es, ar }. ~1,442+ keys.';
if (html.includes(icOld)) { html = html.split(icOld).join(icNew); htmlApplied++; }
if (py.includes(icOld)) { py = py.split(icOld).join(icNew); }

console.log('html cleanup applied:', htmlApplied);
console.log('html write ok:', writeWithRetry(htmlPath, html, 200));
console.log('py write ok:', writeWithRetry(pyPath, py, 200));
