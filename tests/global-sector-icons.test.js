const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const navbar = fs.readFileSync(path.join(root, 'assets/phase-01-navbar.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'assets/phase-01-navbar.css'), 'utf8');
const lottieDir = path.join(root, 'assets/icons/sectors/lottie');
const sectors = {
  energies: ['energies-in-reveal.json', 'energies-hover-pinch.json'],
  manufacturing: ['manufacturing-in-reveal.json', 'manufacturing-hover-pinch.json'],
  logistics: ['logistics-in-reveal.json', 'logistics-hover-pinch.json'],
  realestate: ['real-estate-in-reveal.json', 'real-estate-hover-pinch.json'],
  agro: ['agro-processing-in-reveal.json', 'agro-processing-hover-pinch.json'],
  automotive: ['automotive-in-reveal.json']
};

test('shared navbar maps every sector to local Lottie assets', () => {
  for (const [sector, files] of Object.entries(sectors)) {
    assert.match(navbar, new RegExp(`${sector}: \\{ reveal:`));
    for (const file of files) {
      assert.match(navbar, new RegExp(`lottie/${file.replaceAll('.', '\\.')}`));
      const data = JSON.parse(fs.readFileSync(path.join(lottieDir, file), 'utf8'));
      assert.ok(Number(data.w) > 0);
      assert.ok(Number(data.h) > 0);
    }
  }
  assert.match(navbar, /createElement\('lord-icon'\)/);
  assert.match(navbar, /playFromStart\(\)/);
  assert.match(navbar, /seekToEnd\(\)/);
  assert.match(navbar, /prefers-reduced-motion/);
});

test('sector rows have no permanent visible border and mobile sector headings receive icons', () => {
  assert.match(styles, /\.mm-cat \{[\s\S]*border: 1px solid transparent/);
  assert.match(styles, /\.mob-sector-icon/);
  assert.match(navbar, /\.mob-sector-heading\[data-mm-cat\]/);
});

test('desktop sector icons share a visible slot with static fallback and active styling', () => {
  const navTemplate = fs.readFileSync(path.join(root, 'scripts/templates/nav.html'), 'utf8');
  const sectorRows = [...navTemplate.matchAll(/class="mm-cat(?: [^"]+)?"[^>]*data-mm-cat="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(sectorRows, Object.keys(sectors));
  assert.match(styles, /\.mm-cat::before\s*\{[\s\S]*display:\s*grid\s*!important/);
  assert.match(styles, /\.mm-cat\.has-sector-icon::before\s*\{[\s\S]*display:\s*none\s*!important/);
  assert.match(styles, /@media \(min-width: 768px\)[\s\S]*\.mm-cat::before,[\s\S]*\.mm-sector-icon\s*\{[\s\S]*width:\s*30px\s*!important[\s\S]*height:\s*30px\s*!important/);
  assert.match(styles, /@media \(min-width: 768px\)[\s\S]*\.mm-sector-icon\s*\{[\s\S]*filter:\s*drop-shadow/);
  assert.match(styles, /\.mm-cat:hover \.mm-sector-icon,[\s\S]*\.mm-cat\.is-active \.mm-sector-icon/);
  assert.match(navbar, /button\.classList\.add\('has-sector-icon'\)/);
  assert.match(navbar, /aria-hidden', 'true'/);
});
