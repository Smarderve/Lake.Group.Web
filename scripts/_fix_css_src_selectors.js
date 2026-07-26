const fs = require('fs');
for (const f of ['assets/theme.css', 'assets/flagship.css']) {
  let s = fs.readFileSync(f, 'utf8');
  const o = s;
  s = s.replace(/\.png\?v=\d+"/g, '.png"');
  if (s !== o) {
    fs.writeFileSync(f, s);
    console.log('fixed', f);
  } else {
    console.log('no change', f);
  }
}
