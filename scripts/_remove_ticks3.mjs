// One-off follow-up: CRLF-tolerant replacement of the AFICD ✓ pseudo-element list.
// Temporary helper with a leading underscore per repo rules; removed after use.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.join(ROOT, 'aficd.html');
let src = readFileSync(file, 'utf8');

const liRuleRe = /\.aficd-list li\{[^}]*border-bottom:1px solid var\(--line-2\)[^}]*\}\s*\.aficd-list li::before\{[^}]*\u2713[^}]*\}/;
const NEW = '.aficd-list li{position:relative;padding:9px 0 9px 18px;color:var(--muted);line-height:1.55}';
if (liRuleRe.test(src)) {
  src = src.replace(liRuleRe, NEW);
  writeFileSync(file, src);
  console.log('aficd.html: aficd-list replaced');
} else {
  console.log('aficd.html: PATTERN NOT MATCHED');
  process.exitCode = 1;
}
