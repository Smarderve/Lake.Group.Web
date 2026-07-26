const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name === '.git' || ent.name === '_live_probe') continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (/\.(html|js|css)$/i.test(ent.name)) out.push(p);
  }
  return out;
}

let n = 0;
for (const file of walk(root)) {
  let s = fs.readFileSync(file, 'utf8');
  if (!/(?:flagship|theme)\.css\?v=84/.test(s)) continue;
  const next = s
    .replace(/flagship\.css\?v=84/g, 'flagship.css?v=87')
    .replace(/theme\.css\?v=84/g, 'theme.css?v=87');
  if (next !== s) {
    fs.writeFileSync(file, next);
    n++;
    console.log('updated', path.relative(root, file));
  }
}
console.log(`Done. ${n} files -> css?v=85`);
