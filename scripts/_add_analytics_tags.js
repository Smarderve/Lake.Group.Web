/* One-off Phase 10 wiring: add the analytics beacon after the assistant.js
 * script tag on every page that includes the assistant (46 files). Idempotent —
 * pages that already reference analytics.js are left untouched. */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TAG = '<script src="assets/analytics.js?v=1" defer></script>';

let changed = 0;
let skipped = 0;
for (const file of fs.readdirSync(ROOT).filter((f) => f.endsWith('.html'))) {
  const p = path.join(ROOT, file);
  let html = fs.readFileSync(p, 'utf8');
  if (html.includes('assets/analytics.js')) { skipped += 1; continue; }
  const re = /<script src="assets\/assistant\.js[^"]*" defer><\/script>/;
  if (!re.test(html)) { skipped += 1; continue; }
  html = html.replace(re, (m) => m + '\n' + TAG);
  fs.writeFileSync(p, html);
  changed += 1;
  console.log('tagged', file);
}
console.log(`done: ${changed} tagged, ${skipped} skipped`);
