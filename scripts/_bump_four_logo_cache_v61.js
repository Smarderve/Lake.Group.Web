const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SKIP = new Set(['node_modules', '.git', 'docs', '_tmp_chrome_type3']);

function walk(d, acc = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.(html|js|css)$/.test(e.name)) acc.push(p);
  }
  return acc;
}

const files = walk(ROOT);
let n = 0;
for (const f of files) {
  let s = fs.readFileSync(f, 'utf8');
  const o = s;
  s = s.replace(/atl\.png(\?v=\d+)?/g, 'atl.png?v=61');
  s = s.replace(/lake-agro\.png(\?v=\d+)?/g, 'lake-agro.png?v=61');
  s = s.replace(/cross-country\.png(\?v=\d+)?/g, 'cross-country.png?v=62');
  s = s.replace(/ocean-galleria\.png(\?v=\d+)?/g, 'ocean-galleria.png?v=61');
  if (s !== o) {
    fs.writeFileSync(f, s);
    n++;
    console.log('bumped', path.relative(ROOT, f));
  }
}
console.log('files updated', n);
