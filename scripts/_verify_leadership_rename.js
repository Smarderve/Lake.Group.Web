#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SKIP = new Set([
  '_rename_leadership_four.js',
  '_fix_rename_leftovers.js',
]);

const BAD = [
  'Sibtian Ansari',
  'Vivek Choudhary',
  'Bhaskar S. Shetty',
  'Pankaj Kumar',
  'Sibtian',
  'Choudhary',
  'Bhaskar',
  'सिब्तियान',
  'विवेक चौधरी',
  'भास्कर',
  'पंकज कुमार',
  'سبتيان',
  'فيفيك تشودري',
  'باسكار',
  'بانكاج',
];

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'docs'].includes(ent.name)) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

const hits = [];
for (const f of walk(ROOT)) {
  const base = path.basename(f);
  if (SKIP.has(base)) continue;
  const ext = path.extname(f).toLowerCase();
  if (!['.html', '.js', '.json', '.xml', '.txt', '.md'].includes(ext)) continue;
  // redirect stubs intentionally keep old filenames as path; content is fine
  let text;
  try {
    text = fs.readFileSync(f, 'utf8');
  } catch {
    continue;
  }
  for (const b of BAD) {
    if (text.includes(b)) {
      // allow image path leftovers (sibtian-ansari.png etc.) — those are photo filenames
      if (b === 'Sibtian' || b === 'Bhaskar') {
        // check if only in image paths / comments
        const re = new RegExp(b, 'g');
        let m;
        while ((m = re.exec(text))) {
          const ctx = text.slice(Math.max(0, m.index - 40), m.index + b.length + 40);
          if (/leadership\/[a-z-]*sibtian|leadership\/[a-z-]*bhaskar|vivek-choudhary|pankaj-kumar|bhaskar-shetty/.test(ctx)) {
            continue;
          }
          if (/sibtian-ansari\.png|bhaskar-shetty\.png/.test(ctx)) continue;
          hits.push({ f: path.relative(ROOT, f), b, ctx: ctx.replace(/\s+/g, ' ') });
        }
        continue;
      }
      hits.push({ f: path.relative(ROOT, f), b, ctx: 'present' });
    }
  }
}

// Also check GOOD names present in leadership.html
const ld = fs.readFileSync(path.join(ROOT, 'leadership.html'), 'utf8');
const goods = ['Dileep Kumar', 'Sridhar Mani', 'Mohammed Khalid', 'Bibhuti Singh'];
console.log('leadership.html goods:');
for (const g of goods) console.log(' ', g, ld.includes(g));
console.log('leadership.html old full names:');
for (const b of ['Sibtian Ansari', 'Vivek Choudhary', 'Bhaskar S. Shetty', 'Pankaj Kumar']) {
  console.log(' ', b, ld.includes(b));
}

const kb = fs.readFileSync(path.join(ROOT, 'assets', 'assistant-kb.js'), 'utf8');
console.log('assistant-kb goods/bads:');
for (const g of goods) console.log('  good', g, (kb.split(g).length - 1));
for (const b of ['Sibtian Ansari', 'Vivek Choudhary', 'Bhaskar S. Shetty', 'Pankaj Kumar', 'Choudhary']) {
  console.log('  bad', b, (kb.split(b).length - 1));
}

console.log('\nRemaining hits (excl rename helpers):', hits.length);
for (const h of hits.slice(0, 40)) {
  console.log('-', h.f, '::', h.b, h.ctx ? ':: ' + String(h.ctx).slice(0, 100) : '');
}

// Confirm profile files exist
for (const id of ['dileep-kumar', 'sridhar-mani', 'mohammed-khalid', 'bibhuti-singh']) {
  const p = path.join(ROOT, `leadership-${id}.html`);
  console.log('exists', `leadership-${id}.html`, fs.existsSync(p), 'size', fs.existsSync(p) ? fs.statSync(p).size : 0);
}

// Confirm no Khalid Mohamed / Abdulrahman reintroduced as cards
console.log('Khalid Mohamed in leadership.html?', ld.includes('Khalid Mohamed'));
console.log('Abdulrahman in leadership.html?', ld.includes('Abdulrahman'));
