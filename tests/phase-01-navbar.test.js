'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..');
const navTemplate = fs.readFileSync(path.join(ROOT, 'scripts/templates/nav.html'), 'utf8').replace(/\r\n/g, '\n').trimEnd();
const mobileTemplate = fs.readFileSync(path.join(ROOT, 'scripts/templates/mobile_nav.html'), 'utf8').replace(/\r\n/g, '\n').trimEnd();
const pages = fs.readdirSync(ROOT).filter((file) => file.endsWith('.html')).sort();

function balanced(source, start, tag) {
  const token = new RegExp(`<${tag}\\b|</${tag}>`, 'g');
  token.lastIndex = start;
  let depth = 0;
  let match;
  while ((match = token.exec(source))) {
    depth += match[0].startsWith('</') ? -1 : 1;
    if (depth === 0) return source.slice(start, token.lastIndex);
  }
  throw new Error(`Unclosed ${tag}`);
}

function block(source, pattern, tag) {
  const match = pattern.exec(source);
  assert.ok(match, `missing ${tag} block`);
  return balanced(source, match.index, tag);
}

test('Phase 01 navbar chrome is canonical on every root public page', () => {
  assert.equal(pages.length, 56, 'audit every root public HTML page');
  for (const file of pages) {
    const source = fs.readFileSync(path.join(ROOT, file), 'utf8').replace(/\r*\n/g, '\n');
    const nav = block(source, /<nav class="site-nav"[^>]*>/, 'nav');
    const mobile = block(source, /<div class="nav-mobile" id="nav-mobile"[^>]*>/, 'div');
    assert.equal(nav, navTemplate, `${file}: canonical desktop navbar`);
    assert.equal(mobile, mobileTemplate, `${file}: canonical mobile navbar`);
    assert.match(source, /assets\/phase-01-navbar\.css/, `${file}: shared navbar styling`);
    assert.match(source, /assets\/phase-01-navbar\.js/, `${file}: shared navbar behavior`);
  }
});

test('Phase 01 navbar follows launch constraints and all logo destinations resolve', () => {
  assert.match(navTemplate, /LAKE_LOGO_LAKE_ONLY\.png/);
  assert.doesNotMatch(navTemplate, /LAKE_GROUP_LOGO|lang-switcher|lang-trigger|contact\.html|placeholder|loading="lazy"/i);
  assert.match(navTemplate, /<span class="nav-stripes"[^>]*><i><\/i><i><\/i><i><\/i><\/span>/);
  assert.doesNotMatch(mobileTemplate, /contact\.html|lang-/i);
  for (const match of navTemplate.matchAll(/<img src="([^"]+)"/g)) {
    assert.equal(fs.existsSync(path.join(ROOT, match[1])), true, `${match[1]} exists`);
  }
  for (const match of navTemplate.matchAll(/href="([\w-]+\.html)"/g)) {
    assert.equal(fs.existsSync(path.join(ROOT, match[1])), true, `${match[1]} exists`);
  }
});

test('subsidiary coverage uses unique supplied company marks and includes ACFS', () => {
  const expected = [
    'lake-oil.html', 'lake-aviation.html', 'lake-gas.html', 'lake-lubes.html',
    'lake-buildings.html', 'lake-plastics.html', 'lake-steel.html', 'lake-cylinders.html',
    'gulf-aggregates.html', 'atl.html', 'lake-premix-cement.html',
    'aficd.html', 'acfs.html', 'aill.html', 'lake-trans.html',
    'cross-country.html', 'ocean-galleria.html', 'lake-agro.html',
  ];
  const desktopLinks = [...navTemplate.matchAll(/<a href="([\w-]+\.html)" class="mm-company"><img src="([^"]+)"/g)];
  assert.deepEqual(desktopLinks.map((match) => match[1]), expected);
  assert.equal(new Set(desktopLinks.map((match) => match[2])).size, desktopLinks.length, 'no repeated fallback logo');
  assert.equal(desktopLinks.some((match) => /LAKE_LOGO_LAKE_ONLY|placeholder/i.test(match[2])), false, 'company cards use only company-specific marks');
  assert.match(navTemplate, /href="acfs\.html" class="mm-company"><img src="assets\/images\/logos\/companies\/acfs\.png"/);
  assert.match(mobileTemplate, /href="acfs\.html">ACFS<\/a>/);
  assert.doesNotMatch(navTemplate, /assembly-tech|agrinova-tech|nextdrive-motors/i);
});

test('Agro overrides and active-page state cannot override Phase 01 navbar chrome', () => {
  const css = fs.readFileSync(path.join(ROOT, 'assets/phase-01-navbar.css'), 'utf8');
  const script = fs.readFileSync(path.join(ROOT, 'assets/phase-01-navbar.js'), 'utf8');
  const agroPage = fs.readFileSync(path.join(ROOT, 'lake-agro.html'), 'utf8');
  assert.match(agroPage, /body\.co-theme-agro \.site-nav/);
  assert.match(css, /body\.co-theme-agro \.site-nav\[data-phase01-navbar\].*background:#0181bb!important/);
  assert.match(css, /body\.co-theme-agro \.nav-mobile\[data-phase01-navbar-mobile\].*background:#013f5c!important/);
  assert.match(css, /\.nav-links>li>a\.active\{font-weight:700!important\}/);
  assert.doesNotMatch(css, /\.nav-links>li>a\.active\{[^}]*border-(?:bottom|top|left|right)/);
  assert.match(script, /link\.classList\.add\('active'\)/);
  assert.match(script, /setAttribute\('aria-current', 'page'\)/);
});
