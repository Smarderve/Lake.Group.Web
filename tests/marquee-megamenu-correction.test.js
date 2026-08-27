'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const loopSource = fs.readFileSync(path.join(ROOT, 'assets/components/logo-loop-mount.js'), 'utf8');
const menuCss = fs.readFileSync(path.join(ROOT, 'assets/phase-01-navbar.css'), 'utf8');

const lakeLockups = [
  'lake-oil-blue.png', 'lake-gas-blue.png', 'lake-lubes-blue.png', 'lake-steel-blue.png',
  'lake-trans-blue.png', 'lake-aviation-blue.png', 'lake-buildings-blue.png',
  'lake-plastics-blue.png', 'lake-premix-cement-blue.png', 'lake-cylinders-blue.png',
  'lake-agro-blue.png',
];

test('white marquee uses full blue lake lockups with visible subsidiary lettering', async () => {
  for (const filename of lakeLockups) {
    assert.match(loopSource, new RegExp(`logos/companies/${filename.replace('.', '\\.')}`), `${filename}: marquee must use the blue lockup`);
    const image = await sharp(path.join(ROOT, 'assets/images/logos/companies', filename)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let nearWhite = 0;
    for (let i = 0; i < image.data.length; i += 4) {
      if (image.data[i + 3] > 16 && image.data[i] > 220 && image.data[i + 1] > 220 && image.data[i + 2] > 220) nearWhite++;
    }
    assert.ok(nearWhite < 50, `${filename}: blue lockup still contains invisible white lettering (${nearWhite} pixels)`);
  }
});

test('mega-menu keeps a clean corporate rail and uses animated sector icon treatment', () => {
  assert.match(menuCss, /\.site-nav\[data-phase01-navbar\] \.mm-cats,\s*\n\.site-nav\[data-phase01-navbar\] \.mm-panes[\s\S]*?background:\s*transparent\s*!important/);
  assert.match(menuCss, /\.site-nav\[data-phase01-navbar\] \.mm-cats,\s*\n\.site-nav\[data-phase01-navbar\] \.mm-panes[\s\S]*?border:\s*0\s*!important/);
  assert.match(menuCss, /\.site-nav\[data-phase01-navbar\] \.mm-sector-icon/);
  assert.match(menuCss, /\.mm-cat::before\s*\{[\s\S]*?display:\s*none\s*!important/);
  assert.doesNotMatch(menuCss, /content:\s*["'][^"']*[✦⚙⇄⌂❋◇]/);
});

console.log('Marquee and mega-menu correction checks loaded');
