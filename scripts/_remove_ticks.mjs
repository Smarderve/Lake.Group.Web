// One-off maintenance script: removes decorative yellow tick + gray rule pattern site-wide.
// Temporary helper with a leading underscore per repo rules; removed after use.
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const list = (cmd) => execSync(cmd, { cwd: ROOT, encoding: 'utf8' }).split('\n').map((s) => s.trim()).filter(Boolean);

const mdiPages = list('grep -rl "mdi:check" --include="*.html" . | grep -v node_modules').map((p) => p.replace(/^\.\//, ''));
const staleCssPages = list('grep -rl "\\.fs-check{" --include="*.html" . | grep -v node_modules').map((p) => p.replace(/^\.\//, ''));
const pages = [...new Set([...mdiPages, ...staleCssPages])];

const OLD_CSS = [
  '.fs-check{list-style:none;display:flex;flex-direction:column;margin-top:var(--sp-6)}',
  '.fs-check li{display:flex;gap:14px;align-items:baseline;padding:12px 0;border-bottom:1px solid var(--line-2);font-size:.95rem;color:var(--mute);line-height:1.65}',
  '.fs-check li:first-child{border-top:1px solid var(--line-2)}',
  '.fs-check li span:first-child{color:var(--gold-deep);font-weight:700;flex:none}',
].join('\n');
const NEW_CSS = [
  '.fs-check{list-style:none;display:flex;flex-direction:column;margin-top:var(--sp-6)}',
  '.fs-check li{position:relative;padding:9px 0 9px 18px;font-size:.95rem;color:var(--mute);line-height:1.65}',
].join('\n');

const REPORT = [];
for (const page of pages) {
  const file = path.join(ROOT, page);
  let src = readFileSync(file, 'utf8');
  const before = src;

  // 1) Remove decorative tick spans (mdi:check or entity variant) inside fs-check lists.
  const spanRe = /<span><iconify-icon icon="mdi:check"[^>]*><\/iconify-icon><\/span>|<span>&#10003;<\/span>/g;
  const ticks = (src.match(spanRe) || []).length;
  src = src.replace(spanRe, '');

  // 2) Replace the tick+rule CSS block.
  let cssDone = false;
  if (src.includes(OLD_CSS)) {
    src = src.replace(OLD_CSS, NEW_CSS);
    cssDone = true;
  }

  // 3) AFICD ✓ pseudo-element list -> same clean list treatment.
  let aficdDone = false;
  if (page === 'aficd.html') {
    const oldAficd =
      ".aficd-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 30px;list-style:none;margin:var(--sp-6) 0 0;padding:0}\n" +
      ".aficd-list li{padding:13px 0;border-bottom:1px solid var(--line-2);color:var(--muted);line-height:1.55;position:relative;padding-left:20px}\n" +
      ".aficd-list li::before{content:'\u2713';position:absolute;left:0;color:var(--gold-deep);font-weight:800}";
    const newAficd =
      ".aficd-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 30px;list-style:none;margin:var(--sp-6) 0 0;padding:0}\n" +
      ".aficd-list li{position:relative;padding:9px 0 9px 18px;color:var(--muted);line-height:1.55}";
    if (src.includes(oldAficd)) {
      src = src.replace(oldAficd, newAficd);
      aficdDone = true;
    }
  }

  if (src !== before) {
    writeFileSync(file, src);
    REPORT.push(`${page}: ticks=${ticks} cssReplaced=${cssDone} aficdList=${aficdDone}`);
  } else {
    REPORT.push(`${page}: NO CHANGES (ticks=${ticks})`);
  }
}
console.log(REPORT.join('\n'));
console.log(`\nTotal pages touched: ${REPORT.filter((r) => !r.includes('NO CHANGES')).length}/${pages.length}`);
