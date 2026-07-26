const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const targets = [];

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name === '.git') continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p);
    else if (/\.(html|js)$/i.test(ent.name)) targets.push(p);
  }
}
walk(root);

let files = 0, hits = 0;
for (const file of targets) {
  let s = fs.readFileSync(file, 'utf8');
  if (!/cross-country\.png/.test(s)) continue;
  const next = s.replace(/cross-country\.png(\?v=\d+)?/g, 'cross-country.png?v=62');
  if (next !== s) {
    fs.writeFileSync(file, next);
    files++;
    hits += (s.match(/cross-country\.png(\?v=\d+)?/g) || []).length;
    console.log('updated', path.relative(root, file));
  }
}
console.log(`Done. ${files} files, ~${hits} refs -> v=62`);
