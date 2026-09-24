// One-off follow-up: CRLF-tolerant CSS replacement for aficd/lake-aviation/lake-cylinders
// and cleanup of now-inert fs-check border/margin overrides.
// Temporary helper with a leading underscore per repo rules; removed after use.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = ['aficd.html', 'lake-aviation.html', 'lake-cylinders.html'];

const NEW_CSS = [
  '.fs-check{list-style:none;display:flex;flex-direction:column;margin-top:var(--sp-6)}',
  '.fs-check li{position:relative;padding:9px 0 9px 18px;font-size:.95rem;color:var(--mute);line-height:1.65}',
].join('\n');

// Matches the old block regardless of CRLF/LF.
const oldBlockRe =
  /\.fs-check\{[^}]*\}\s*\.fs-check li\{[^}]*border-bottom:1px solid var\(--line-2\)[^}]*\}\s*\.fs-check li:first-child\{[^}]*\}\s*\.fs-check li span:first-child\{[^}]*\}/;

for (const name of files) {
  const file = path.join(ROOT, name);
  let src = readFileSync(file, 'utf8');
  const before = src;
  src = src.replace(oldBlockRe, NEW_CSS);
  if (src === before) console.log(`${name}: CSS BLOCK NOT MATCHED`);
  else console.log(`${name}: replaced`);
  writeFileSync(file, src);
}

// Now-inert overrides referencing the removed tick/rule styles.
const overrides = [
  ['lake-cylinders.html', '.fs-on-dark .fs-check li {\n  border-bottom-color: rgba(255,255,255,0.15) !important;\n}\n.fs-on-dark .fs-check li:first-child {\n  border-top-color: rgba(255,255,255,0.15) !important;\n}'],
  ['lake-lubes.html', '.lubes-objectives .fs-check li{color:rgba(255,255,255,.92);border-color:rgba(255,255,255,.16)}\n.lubes-objectives .fs-check li span:first-child{color:var(--gold)}'],
];
for (const [name, block] of overrides) {
  const file = path.join(ROOT, name);
  let src = readFileSync(file, 'utf8');
  if (src.includes(block)) {
    src = src.replace(block, '');
    writeFileSync(file, src);
    console.log(`${name}: override removed`);
  } else {
    console.log(`${name}: override not found verbatim (check manually)`);
  }
}
