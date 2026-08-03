#!/usr/bin/env node
/** Second-pass patch: remaining stale references in the main developer guide. */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const htmlPath = path.join(root, 'docs', 'developer-guide.html');
const pyPath = path.join(root, 'docs', '_gen_developer_guide.py');

function readFile(p) { return fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n'); }
function writeFile(p, s) { fs.writeFileSync(p, s, 'utf8'); }

// ------------------------- HTML-only -------------------------
const htmlPairs = [
  // Tip example
  ['page names like <code>fuel.html</code>', 'page names like <code>lake-oil.html</code>'],
  // TOC entries
  ['5.</span> HTML Page Reference (All 29 Pages)', '5.</span> HTML Page Reference (All 48 Pages)'],
  ['8.</span> 3D Hero (hero-3d.js)', '8.</span> 3D Hero (hero-globe)'],
  ['20.</span> Firebase Hosting', '20.</span> Vercel Hosting'],
  // TOC: add 41/42/43 after entry 40
  [
    '  <li><a href="#sec-40"><span class="toc-num">40.</span> Build Scripts Encyclopedia</a></li>\n</ol></nav>',
    '  <li><a href="#sec-40"><span class="toc-num">40.</span> Build Scripts Encyclopedia</a></li>\n  <li><a href="#sec-41"><span class="toc-num">41.</span> Backend CMS — Self-Hosted Payload</a></li>\n  <li><a href="#sec-42"><span class="toc-num">42.</span> Shipping to the Company</a></li>\n  <li><a href="#sec-43"><span class="toc-num">43.</span> Guide Update Log</a></li>\n</ol></nav>',
  ],
  // index.html page-detail hero refs
  ['<p><code>i18n stack, site.js, assistant stack, lazy hero-3d.bundle.js, pwa.js, motion.js</code></p>',
   '<p><code>i18n stack, site.js, assistant stack, lazy hero-globe.bundle.js, pwa.js, motion.js</code></p>'],
  ['Lazy-loads hero-3d.bundle.js via IntersectionObserver with 600px rootMargin',
   'Lazy-loads hero-globe.bundle.js via IntersectionObserver with 600px rootMargin'],
  // JS module reference (section 6)
  ['<article class="js-ref"><h3>assets/hero-3d.js</h3><p>Three.js module (bundled to hero-3d.bundle.js). See Section 9.</p></article>',
   '<article class="js-ref"><h3>assets/hero-globe/ (React island)</h3><p>React + react-globe.gl hero source (HeroGlobe.jsx, mount.jsx, locations.js). See Section 8.</p></article>'],
  ['<article class="js-ref"><h3>assets/hero-3d.bundle.js</h3><p>esbuild output: hero-3d.js + three.module.min.js as classic script. ~0.5MB. Rebuild via scripts/build_hero_bundle.sh.</p></article>',
   '<article class="js-ref"><h3>assets/hero-globe.bundle.js</h3><p>esbuild output: React + react-globe.gl as classic IIFE. ~2MB. Rebuild via npm run build:hero-globe.</p></article>'],
  // Vendor table
  ['<tr><td>vendor/three.module.min.js</td><td>r16x</td><td>MIT</td><td>hero-3d.js WebGL rendering</td></tr>',
   '<tr><td>react-globe.gl (bundled)</td><td>^2.38</td><td>MIT</td><td>hero-globe React globe rendering</td></tr>'],
  // SW network-first row
  ['<tr><td>network-first-asset</td><td>Network-first</td><td>news-data.js, hero-3d.bundle.js</td></tr>',
   '<tr><td>network-first-asset</td><td>Network-first</td><td>news-data.js, hero-globe.bundle.js</td></tr>'],
  // i18n section 10
  ['<li>hero-3d.js reads LakeI18n.current for SITE_NAMES country labels</li>',
   '<li>hero-globe reads LakeI18n for localized labels</li>'],
  // Pre-deploy checklist
  ['<li>Bump <code>?v=N</code> on hero-3d.bundle.js script in index.html if bundle changed</li>',
   '<li>Bump <code>?v=N</code> on hero-globe.bundle.js script in index.html if bundle changed</li>'],
  // Accessibility section 17
  ['<li>hero-3d.js — static finale overlay instead of WebGL animation</li>',
   '<li>hero-globe — static branded overlay instead of WebGL animation</li>'],
  // i18n key conventions
  ['<tr><td>fuel.*</td><td>fuel.html content</td><td>fuel.hero.title, fuel.spec.1</td></tr>',
   '<tr><td>lake_oil.*</td><td>lake-oil.html content</td><td>lake_oil.hero.title</td></tr>'],
  // Troubleshooting nav-matching hint
  ['Ensure href="fuel.html" not href="/fuel" without extension if comparing logic expects filename.',
   'Ensure href="lake-oil.html" not href="/lake-oil" without extension if comparing logic expects filename.'],
  // File-tree snapshot lines (exact tree prefixes only)
  ['  ├── concrete.html\n', '  ├── lake-premix-cement.html\n'],
  ['  ├── fuel.html\n', '  ├── lake-oil.html\n'],
  ['  ├── lpg.html\n', '  ├── lake-gas.html\n'],
  ['  ├── steel.html\n', '  ├── lake-steel.html\n'],
  ['  ├── logistics.html\n', '  ├── lake-trans.html\n'],
  ['  ├── lubricants.html\n', '  ├── lake-lubes.html\n'],
  ['  ├── container-services.html\n', '  ├── aficd.html\n'],
  ['  ├── hero-3d.bundle.js\n', '  ├── hero-globe.bundle.js\n'],
  ['  ├── hero-3d.js\n', '  ├── hero-globe/\n'],
];

// ------------------------- Python-only -------------------------
const pyPairs = [
  // page_meta hero detection
  ['inline_hero = "hero-3d" in c', 'inline_hero = "hero-globe" in c'],
  // PAGES_DETAIL index.html
  ['(".stats-grid", "Animated counters: 4,600+ employees, 700+ trucks, 85+ stations, 8 countries."),',
   '(".stats-grid", "Animated counters: 30,000+ employees, 1,200+ trucks, 152 stations, 9 countries."),'],
  ['"unique": "Only page using theme.css + motion.js (not flagship). Lazy-loads hero-3d.bundle.js via IntersectionObserver with 600px rootMargin. Inline critical CSS in <head> (~2000 lines). Organization JSON-LD.",',
   '"unique": "Only page using theme.css + motion.js (not flagship). Lazy-loads hero-globe.bundle.js via IntersectionObserver with 600px rootMargin. Inline critical CSS in <head> (~2000 lines). Organization JSON-LD.",'],
  ['"js": "i18n stack, site.js, assistant stack, lazy hero-3d.bundle.js, pwa.js, motion.js",',
   '"js": "i18n stack, site.js, assistant stack, lazy hero-globe.bundle.js, pwa.js, motion.js",'],
  // TOC entry
  ['("8", "3D Hero Architecture (hero-3d.js)"),', '("8", "3D Hero Architecture (hero-globe)"),'],
  // Architecture diagram
  ['│  index.html … sustainability.html  (29 pages)               │',
   '│  index.html … ocean-galleria.html  (48 pages)              │'],
  ['│       └── page-specific: hero-3d, leaflet, news.js           │',
   '│       └── page-specific: hero-globe, leaflet, news.js       │'],
  // Vendor table
  ['<tr><td>vendor/three.module.min.js</td><td>r16x</td><td>MIT</td><td>hero-3d.js WebGL rendering</td></tr>',
   '<tr><td>react-globe.gl (bundled)</td><td>^2.38</td><td>MIT</td><td>hero-globe React globe rendering</td></tr>'],
  // SW network-first row
  ['<tr><td>network-first-asset</td><td>Network-first</td><td>news-data.js, hero-3d.bundle.js</td></tr>',
   '<tr><td>network-first-asset</td><td>Network-first</td><td>news-data.js, hero-globe.bundle.js</td></tr>'],
  // i18n section 10
  ['<li>hero-3d.js reads LakeI18n.current for SITE_NAMES country labels</li>',
   '<li>hero-globe reads LakeI18n for localized labels</li>'],
  // Pre-deploy checklist
  ['<li>Run <code>bash scripts/build_hero_bundle.sh</code> if hero-3d.js changed</li>',
   '<li>Run <code>npm run build:hero-globe</code> if assets/hero-globe/* changed</li>'],
  ['<li>Bump <code>?v=N</code> on hero-3d.bundle.js script in index.html if bundle changed</li>',
   '<li>Bump <code>?v=N</code> on hero-globe.bundle.js script in index.html if bundle changed</li>'],
  // Local testing block
  ['npm run serve        # Firebase hosting emulator',
   'npx serve .          # any static server (Vercel preview on git push)'],
  ['<p>Requires Firebase project configuration (firebase.json + .firebaserc — configure locally, not committed).</p>',
   '<p>Vercel is configured by <code>vercel.json</code> (permanent redirects, cache headers). No Firebase files are committed.</p>'],
  // Accessibility
  ['<li>hero-3d.js — static finale overlay instead of WebGL animation</li>',
   '<li>hero-globe — static branded overlay instead of WebGL animation</li>'],
  // Troubleshooting
  ['<li>hero-3d.bundle.js not built or 404</li>', '<li>hero-globe.bundle.js not built or 404</li>'],
  ['<p><strong>Fix:</strong> Bump VERSION in sw.js. User must accept update toast or hard-refresh twice. news-data.js and hero-3d.bundle.js use network-first specifically to avoid this.</p>',
   '<p><strong>Fix:</strong> Bump VERSION in sw.js. User must accept update toast or hard-refresh twice. news-data.js and hero-globe.bundle.js use network-first specifically to avoid this.</p>'],
  // Comment header
  ['    # Section 8 hero-3d\n', '    # Section 8 hero-globe\n'],
];

function applyPairs(text, pairs, label) {
  let t = text; let applied = 0; let missed = 0;
  for (const [o, n] of pairs) {
    if (t.includes(o)) { t = t.split(o).join(n); applied++; }
    else { missed++; console.log(`  [${label}] MISS: ${o.slice(0, 70).replace(/\n/g, '\\n')}…`); }
  }
  console.log(`[${label}] applied ${applied}, missed ${missed}`);
  return t;
}

let html = readFile(htmlPath);
let py = readFile(pyPath);
html = applyPairs(html, htmlPairs, 'html');
py = applyPairs(py, pyPairs, 'py');
writeFile(htmlPath, html);
writeFile(pyPath, py);
console.log('Done.');
