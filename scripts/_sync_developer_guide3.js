#!/usr/bin/env node
/** Final pass: remaining stale references in the main developer guide. */
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

// ---------------- HTML only ----------------
const htmlPairs = [
  // §24 extended i18n.js note
  ['Dispatches <code>lake-i18n-applied</code> CustomEvent with detail.lang after each apply. hero-3d.js and assistant.js listen for this to refresh localized strings.',
   'Dispatches <code>lake-i18n-applied</code> CustomEvent with detail.lang after each apply. hero-globe and assistant.js listen for this to refresh localized strings.'],
  // §25.3 workflow
  ['<li>Edit SITES and/or FACILITIES in hero-3d.js</li>\n<li>Update SITE_NAMES for en/fr/sw</li>\n<li>bash scripts/build_hero_bundle.sh</li>',
   '<li>Edit LOCATIONS in assets/hero-globe/locations.js</li>\n<li>npm run build:hero-globe</li>'],
  // §36 ADR contexts: 29 → 48 pages
  ['<p><strong>Context:</strong> Corporate site with 29 pages, SEO requirements, offline PWA, and limited dev team.</p>',
   '<p><strong>Context:</strong> Corporate site with 48 pages, SEO requirements, offline PWA, and limited dev team.</p>'],
  ['<p><strong>Context:</strong> Full visual redesign (Meridian) cannot ship atomically for 29 pages.</p>',
   '<p><strong>Context:</strong> Full visual redesign (Meridian) cannot ship atomically for 48 pages.</p>'],
  // §39 index essay — hero bundle name
  ['An inline IntersectionObserver script (not in a separate file) loads hero-3d.bundle.js only when the section approaches the viewport, with a generous 600px rootMargin so the bundle begins downloading before the user arrives.',
   'An inline IntersectionObserver script (not in a separate file) loads hero-globe.bundle.js only when the section approaches the viewport, with a generous 600px rootMargin so the bundle begins downloading before the user arrives.'],
  ['Notably absent from initial load: hero-3d.bundle.js (lazy), Leaflet, news-data.js.',
   'Notably absent from initial load: hero-globe.bundle.js (lazy), Leaflet, news-data.js.'],
  // §40 script encyclopedia — build_hero_bundle.sh superseded
  ['<p>Shell wrapper invoking esbuild to bundle hero-3d.js with three.module.min.js into hero-3d.bundle.js as IIFE classic script.</p>',
   '<p>Superseded by <code>build_hero_globe.js</code> (React + react-globe.gl bundle). The old Three.js wrapper is retired.</p>'],
];

// ---------------- Python only ----------------
const pyPairs = [
  // §20 Firebase section → Vercel (whole section block in py)
  [
    '    # --- Firebase hosting ---\n    parts.append("""\n<section id="sec-20" class="chapter page-break">\n<h2>20. Firebase Hosting Configuration</h2>\n<p>package.json defines:</p>\n<pre class="code-block">{\n  "scripts": {\n    "serve": "npx firebase emulators:start --only hosting",\n    "deploy": "npx firebase deploy --only hosting"\n  },\n  "devDependencies": {\n    "firebase-tools": "^13.35.1"\n  }\n}</pre>\n<p>A typical <code>firebase.json</code> (create locally) serves the repo root as public directory:</p>\n<pre class="code-block">{\n  "hosting": {\n    "public": ".",\n    "ignore": ["firebase.json", "**/.*", "**/node_modules/**", "lake-3d/**", "scripts/_chrome_profile*/**"],\n    "headers": [\n      {\n        "source": "/sw.js",\n        "headers": [{ "key": "Cache-Control", "value": "no-cache" }]\n      },\n      {\n        "source": "**/*.@(js|css)",\n        "headers": [{ "key": "Cache-Control", "value": "public,max-age=3600" }]\n      }\n    ],\n    "rewrites": [\n      { "source": "/", "destination": "/index.html" }\n    ]\n  }\n}</pre>\n<p><strong>Important:</strong> sw.js must be served with no-cache or short TTL so updates propagate. Production domain: www.lakeoilgroup.com.</p>\n</section>',
    '    # --- Vercel hosting ---\n    parts.append("""\n<section id="sec-20" class="chapter page-break">\n<h2>20. Vercel Hosting Configuration</h2>\n<p>Deployment is driven by <code>vercel.json</code> at the repo root (committed). Key behaviours:</p>\n<ul>\n<li><strong>Permanent redirects</strong> for renamed pages — fuel.html → lake-oil.html, lpg.html → lake-gas.html, steel.html → lake-steel.html, concrete.html → lake-premix-cement.html, logistics.html → lake-trans.html, lubricants.html → lake-lubes.html, container-services.html → aficd.html, legacy leadership names, lake-story-assets/* → assets/images/our-story/*</li>\n<li><strong>Cache headers</strong> — sw.js and manifest no-cache; core assets no-cache/must-revalidate; fonts/vendor immutable (1y); images/icons swr (7d)</li>\n<li><strong>Service-Worker-Allowed: /</strong> on sw.js so the SW scope covers the whole site</li>\n</ul>\n<p><strong>Important:</strong> sw.js is served with no-cache so updates propagate; <code>?v=</code> query bumps on assets force fresh fetches. Production domain: www.lakeoilgroup.com.</p>\n</section>',
  ],
  // §24 extended i18n.js note
  ['Dispatches <code>lake-i18n-applied</code> CustomEvent with detail.lang after each apply. hero-3d.js and assistant.js listen for this to refresh localized strings.',
   'Dispatches <code>lake-i18n-applied</code> CustomEvent with detail.lang after each apply. hero-globe and assistant.js listen for this to refresh localized strings.'],
  // §39 index essay
  ['An inline IntersectionObserver script (not in a separate file) loads hero-3d.bundle.js only when the section approaches the viewport, with a generous 600px rootMargin so the bundle begins downloading before the user arrives.',
   'An inline IntersectionObserver script (not in a separate file) loads hero-globe.bundle.js only when the section approaches the viewport, with a generous 600px rootMargin so the bundle begins downloading before the user arrives.'],
  ['Notably absent from initial load: hero-3d.bundle.js (lazy), Leaflet, news-data.js.',
   'Notably absent from initial load: hero-globe.bundle.js (lazy), Leaflet, news-data.js.'],
  // §40 script encyclopedia
  ['"build_hero_bundle.sh": "Shell wrapper invoking esbuild to bundle hero-3d.js with three.module.min.js into hero-3d.bundle.js as IIFE classic script.",',
   '"build_hero_globe.js": "esbuild bundle of the React hero-globe island (mount.jsx + react-globe.gl) into hero-globe.bundle.js as a classic IIFE. Supersedes the retired build_hero_bundle.sh / hero-3d pipeline.",'],
];

function applyPairs(text, pairs) {
  let t = text; let applied = 0;
  for (const [o, n] of pairs) {
    if (t.includes(o)) { t = t.split(o).join(n); applied++; }
    else console.log('  MISS:', o.slice(0, 70).replace(/\n/g, '\\n'), '…');
  }
  return { t, applied };
}

let html = readFile(htmlPath);
let py = readFile(pyPath);
const r1 = applyPairs(html, htmlPairs);
const r2 = applyPairs(py, pyPairs);
console.log('html applied:', r1.applied, '/', htmlPairs.length);
console.log('py applied:', r2.applied, '/', pyPairs.length);
console.log('html write ok:', writeWithRetry(htmlPath, r1.t, 200));
console.log('py write ok:', writeWithRetry(pyPath, r2.t, 200));
