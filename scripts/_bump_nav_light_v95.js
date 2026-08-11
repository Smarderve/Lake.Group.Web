/* Bump cache versions after the light-header navbar + hero redesign.
   flagship.css v94 -> v95  (navbar light rebuild + agro fixes + hero block)
   theme.css    v93 -> v94  (full nav region rewrite to light header)
   tokens.css   v63 -> v64  (nav tokens: white bar, dark text, blue accent)  */
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const htmlFiles = fs.readdirSync(root).filter(f => f.endsWith('.html'));

const bumps = [
  ['assets/flagship.css?v=94', 'assets/flagship.css?v=95'],
  ['assets/theme.css?v=93', 'assets/theme.css?v=94'],
  ['assets/tokens.css?v=63', 'assets/tokens.css?v=64'],
];

let touched = 0;
for (const file of htmlFiles) {
  const p = path.join(root, file);
  let s = fs.readFileSync(p, 'utf8');
  let changed = false;
  for (const [from, to] of bumps) {
    if (s.includes(from)) {
      s = s.split(from).join(to);
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(p, s);
    touched++;
  }
}

// theme.css imports tokens.css?v=63 internally — bump there too
const themeCss = path.join(root, 'assets', 'theme.css');
let ts = fs.readFileSync(themeCss, 'utf8');
if (ts.includes('tokens.css?v=63')) {
  ts = ts.split('tokens.css?v=63').join('tokens.css?v=64');
  fs.writeFileSync(themeCss, ts);
  console.log('theme.css internal tokens import bumped');
}
// index.html @imports tokens.css?v=63 in its inline block too
const indexPath = path.join(root, 'index.html');
let is_ = fs.readFileSync(indexPath, 'utf8');
if (is_.includes('tokens.css?v=63')) {
  is_ = is_.split('tokens.css?v=63').join('tokens.css?v=64');
  fs.writeFileSync(indexPath, is_);
  console.log('index.html @import tokens bumped');
}

console.log(`bumped ${touched} HTML files`);
