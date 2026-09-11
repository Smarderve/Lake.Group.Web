const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Decorative tick + gray rule regression lock.
//
// Targets the repeated decorative "gold tick + hairline rule" list pattern:
//   - <iconify-icon icon="mdi:check"> spans (gold ticks on fs-check rows)
//   - literal check glyphs rendered via CSS or markup
//   - paired border-top/border-bottom rules on fs-check list rows
//
// Functional checkmarks with real meaning are intentionally allowed:
//   - assets/home-redesign.css: hero sector selector aria-selected state
//   - form success/status indicators added later with real semantics

const root = path.join(__dirname, '..');

const pages = fs
  .readdirSync(root)
  .filter((file) => file.endsWith('.html'));

test('no decorative mdi:check tick icons on public pages', () => {
  const offenders = pages.filter((file) => {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    return html.includes('mdi:check');
  });
  assert.deepEqual(offenders, [], `pages still rendering decorative ticks: ${offenders.join(', ')}`);
});

test('no literal check glyphs in markup or generated CSS content', () => {
  const offenders = [];
  for (const file of pages) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    if (/[\u2713\u2714]/.test(html)) offenders.push(file);
  }
  for (const dir of ['assets/css', 'assets']) {
    const dirPath = path.join(root, dir);
    if (!fs.existsSync(dirPath)) continue;
    for (const file of fs.readdirSync(dirPath)) {
      if (!file.endsWith('.css')) continue;
      const css = fs.readFileSync(path.join(dirPath, file), 'utf8');
      if (!/content\s*:\s*['"]\s*[\u2713\u2714]/.test(css)) continue;
      // Functional exception: the hero sector selector's selected-state confirmation.
      const cssWithCommentsStripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
      const functional =
        /aria-selected[\s\S]{0,220}content\s*:\s*['"]\s*[\u2713\u2714]/.test(cssWithCommentsStripped);
      if (!functional) offenders.push(`${dir}/${file}`);
    }
  }
  assert.deepEqual(offenders, [], `check glyphs still generated/rendered: ${offenders.join(', ')}`);
});

test('fs-check rows carry no paired decorative border rules', () => {
  const offenders = [];
  for (const file of pages) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    const oldBlock =
      /\.fs-check li\{[^}]*border-bottom:1px solid var\(--line-2\)[^}]*\}/.test(html) ||
      /\.fs-check li:first-child\{[^}]*border-top:1px solid/.test(html);
    if (oldBlock) offenders.push(file);
  }
  assert.deepEqual(offenders, [], `pages with tick+rule fs-check styling: ${offenders.join(', ')}`);
});
