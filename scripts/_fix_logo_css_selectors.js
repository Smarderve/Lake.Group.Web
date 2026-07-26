const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SKIP = new Set(['node_modules', '.git', 'docs']);

function walk(d, acc = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.(html|css)$/.test(e.name)) acc.push(p);
  }
  return acc;
}

let n = 0;
for (const f of walk(ROOT)) {
  let s = fs.readFileSync(f, 'utf8');
  const o = s;
  // Keep HTML img src cache bust (?v=61), but CSS attribute selectors should match basename only
  s = s.replace(
    /src\*="(atl|lake-agro|cross-country|ocean-galleria)\.png\?v=\d+"/g,
    'src*="$1.png"'
  );
  if (s !== o) {
    fs.writeFileSync(f, s);
    n++;
    console.log('fixed selectors', path.relative(ROOT, f));
  }
}
console.log('files', n);
