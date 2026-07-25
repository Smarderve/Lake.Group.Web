'use strict';
/**
 * Verify Jost latin + latin-ext wiring without a browser:
 *  - font files exist for weights used
 *  - fonts.css declares unicode-range for both subsets
 *  - tokens keep Jost first with ar/hi fallbacks after
 *  - no Inter/Bebas @font-face or production CSS hardcodes
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const filesDir = path.join(root, 'assets/fonts/files');
const fontsCss = fs.readFileSync(path.join(root, 'assets/fonts/fonts.css'), 'utf8');
const tokens = fs.readFileSync(path.join(root, 'assets/tokens.css'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

const weights = [100, 300, 400, 500, 600, 700, 800];
const missing = [];
for (const w of weights) {
  for (const subset of ['latin', 'latin-ext']) {
    for (const ext of ['woff2', 'woff']) {
      const name = `jost-${subset}-${w}-normal.${ext}`;
      if (!fs.existsSync(path.join(filesDir, name))) missing.push(name);
    }
  }
}

const checks = [];
checks.push(['no missing jost files', missing.length === 0, missing.join(', ') || 'ok']);
checks.push(['fonts.css has latin-ext faces', /jost-latin-ext-400-normal\.woff2/.test(fontsCss)]);
checks.push(['fonts.css unicode-range latin', /unicode-range:\s*U\+0000-00FF/.test(fontsCss)]);
checks.push(['fonts.css unicode-range latin-ext', /unicode-range:\s*U\+0100-02BA/.test(fontsCss)]);
checks.push(['no Inter @font-face', !/font-family:\s*['"]Inter['"]/.test(fontsCss)]);
checks.push(['no Bebas @font-face', !/font-family:\s*['"]Bebas/.test(fontsCss)]);
checks.push(['tokens --font-body starts Jost', /--font-body:\s*"Jost"/.test(tokens)]);
checks.push(['tokens --font-heading starts Jost', /--font-heading:\s*"Jost"/.test(tokens)]);
checks.push(['tokens Noto Arabic after Jost', /--font-body:[\s\S]*Noto Sans Arabic/.test(tokens)]);
checks.push(['tokens Noto Devanagari after Jost', /--font-body:[\s\S]*Noto Sans Devanagari/.test(tokens)]);
checks.push(['SW precaches latin-ext-400', sw.includes('jost-latin-ext-400-normal.woff2')]);
checks.push(['SW fonts.css?v=60', sw.includes('fonts.css?v=60')]);
checks.push(['orphan Inter files gone', !fs.existsSync(path.join(filesDir, 'inter-latin-400-normal.woff2'))]);
checks.push(['orphan Bebas files gone', !fs.existsSync(path.join(filesDir, 'bebas-neue-latin-400-normal.woff2'))]);

// Sample FR accents are in latin (U+00E9 etc); latin-ext covers e.g. Š (U+0160)
const frSample = 'Avec un mélange diversifié — croître, déjà, français';
const swSample = 'Karibu Lake Group — nishati, usafirishaji na viwanda';
const extSample = 'Škoda · Łódź · Āfrica-ext';
checks.push(['FR sample uses BMP latin accents', /[éèêàçôîûù]/.test(frSample)]);
checks.push(['SW sample is Latin alphabet', /[A-Za-z]/.test(swSample)]);
checks.push(['ext sample needs latin-ext', /[\u0100-\u017F]/.test(extSample)]);

let failed = 0;
for (const [label, ok, detail] of checks) {
  const pass = !!ok;
  if (!pass) failed++;
  console.log(pass ? 'PASS' : 'FAIL', label, detail || '');
}
console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
