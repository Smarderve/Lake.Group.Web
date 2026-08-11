/* Bump cache versions after the modern navbar redesign:
   flagship.css v92->v93, theme.css v92->v93, tokens.css v62->v63. */
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
  if (!/(?:flagship|theme)\.css\?v=92|tokens\.css\?v=62/.test(s)) continue;
  const next = s
    .replace(/flagship\.css\?v=92/g, 'flagship.css?v=94')
    .replace(/theme\.css\?v=92/g, 'theme.css?v=93')
    .replace(/tokens\.css\?v=62/g, 'tokens.css?v=63');
  if (next !== s) {
    fs.writeFileSync(file, next);
    n++;
    console.log('updated', path.relative(root, file));
  }
}
console.log(`Done. ${n} files -> flagship/theme.css?v=93, tokens.css?v=63`);
