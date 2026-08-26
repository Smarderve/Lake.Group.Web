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
  assert.equal(pages.length, 47, 'audit every remaining root public HTML page after approved removals');
  for (const file of pages) {
    const source = fs.readFileSync(path.join(ROOT, file), 'utf8').replace(/\r*\n/g, '\n');
    const nav = block(source, /<nav class="site-nav"[^>]*>/, 'nav');
    const mobile = block(source, /<div class="nav-mobile" id="nav-mobile"[^>]*>/, 'div');
    assert.equal((source.match(/<nav class="site-nav"/g) || []).length, 1, `${file}: exactly one canonical desktop navbar`);
    assert.equal((source.match(/<div class="nav-mobile" id="nav-mobile"/g) || []).length, 1, `${file}: exactly one canonical mobile navbar`);
    assert.doesNotMatch(source, /id="navigation1"|#navigation1/i, `${file}: no legacy navigation system`);
    const canonicalLogo = navTemplate.match(/<a href="index\.html" class="nav-logo"[\s\S]*?<\/a>/)[0];
    const normalizedNav = nav.replace(/<a href="index\.html" class="nav-logo(?: [^"]+)?"[\s\S]*?<\/a>/, canonicalLogo);
    assert.equal(normalizedNav, navTemplate, `${file}: canonical desktop navbar structure with contextual brand slot`);
    assert.equal(mobile, mobileTemplate, `${file}: canonical mobile navbar`);
    assert.match(source, /assets\/phase-01-navbar\.css/, `${file}: shared navbar styling`);
    assert.match(source, /assets\/phase-01-navbar\.js/, `${file}: shared navbar behavior`);
  }
  for (const file of ['la-home.html', 'la-projects.html']) {
    const source = fs.readFileSync(path.join(ROOT, file), 'utf8');
    assert.doesNotMatch(source, /[ \t]+\r*\n/, `${file}: no trailing spaces or tabs`);
    assert.doesNotMatch(source, /\r\r\n/, `${file}: no CRCRLF line endings`);
  }
});

test('Phase 01 navbar follows launch constraints and all logo destinations resolve', () => {
  assert.match(navTemplate, /LAKE_LOGO_LAKE_ONLY\.png/);
  assert.doesNotMatch(navTemplate, /LAKE_GROUP_LOGO|placeholder/i);
  assert.match(navTemplate, /href="contact\.html"[^>]*>Contact Us<\/a>/);
  assert.match(navTemplate, /class="lang-switcher"/);
  assert.match(navTemplate, /aria-label="Language: English" disabled/);
  assert.doesNotMatch(navTemplate, /nav-stripes/);
  assert.match(mobileTemplate, /href="contact\.html">Contact Us<\/a>/);
  assert.match(mobileTemplate, /class="mob-language"[^>]*>English<\/div>/);
  for (const match of navTemplate.matchAll(/<img src="([^"]+)"/g)) {
    assert.equal(fs.existsSync(path.join(ROOT, match[1])), true, `${match[1]} exists`);
  }
  for (const match of navTemplate.matchAll(/href="([\w-]+\.html)"/g)) {
    assert.equal(fs.existsSync(path.join(ROOT, match[1])), true, `${match[1]} exists`);
  }
});

test('subsidiary coverage uses unique supplied company marks and includes ACFS', () => {
  const imageBacked = [
    'lake-oil.html', 'lake-aviation.html', 'lake-gas.html', 'lake-lubes.html',
    'lake-buildings.html', 'lake-plastics.html', 'lake-steel.html', 'lake-cylinders.html',
    'gulf-aggregates.html', 'lake-premix-cement.html',
    'aficd.html', 'acfs.html', 'aill.html', 'lake-trans.html',
    'cross-country.html', 'ocean-galleria.html', 'lake-agro.html',
  ];
  const desktopLinks = [...navTemplate.matchAll(/<a href="([\w-]+\.html)" class="mm-company(?: [^"]+)?"><img src="([^"]+)"/g)];
  assert.deepEqual(desktopLinks.map((match) => match[1]), imageBacked);
  assert.equal(new Set(desktopLinks.map((match) => match[2])).size, desktopLinks.length, 'no repeated fallback logo');
  assert.equal(desktopLinks.some((match) => /LAKE_LOGO_LAKE_ONLY|placeholder/i.test(match[2])), false, 'company cards use only company-specific marks');
  assert.match(navTemplate, /href="acfs\.html" class="mm-company"><img src="assets\/images\/logos\/companies\/acfs\.png"/);
  assert.match(mobileTemplate, /href="acfs\.html">ACFS<\/a>/);
  const automotive = ['assembly-tech.html', 'agrinova-tech.html', 'nextdrive-motors.html'];
  for (const file of automotive) {
    assert.match(navTemplate, new RegExp(`<a href="${file}" class="mm-company mm-company--wordmark">`), `${file}: desktop target`);
    assert.match(mobileTemplate, new RegExp(`href="${file}"`), `${file}: mobile target`);
  }
  assert.match(navTemplate, /id="mm-tab-automotive"/);
  assert.match(mobileTemplate, /mob-acc-automotive/);
  assert.doesNotMatch(navTemplate, /lake-group-placeholder|LAKE_LOGO_LAKE_ONLY\.png" alt="(?:Assembly|AgriNova|NextDrive)/i);
});

test('shared glass navbar and active-page state remain consistent', () => {
  const css = fs.readFileSync(path.join(ROOT, 'assets/phase-01-navbar.css'), 'utf8');
  const script = fs.readFileSync(path.join(ROOT, 'assets/phase-01-navbar.js'), 'utf8');
  assert.match(css, /backdrop-filter:blur\(15px\)/);
  assert.match(css, /rgba\(1,63,92,\.72\)/);
  assert.doesNotMatch(css, /background:#0181bb!important/);
  assert.doesNotMatch(css, /\.nav-links>li>a\.active\{[^}]*border-(?:bottom|top|left|right)/);
  assert.match(script, /link\.classList\.add\('active'\)/);
  assert.match(script, /setAttribute\('aria-current', 'page'\)/);
  assert.match(script, /link\.classList\.remove\('active'\)/);
  assert.match(script, /companyPages\.has\(page\)/);
  assert.match(script, /mouseenter/);
});

test('legacy active-link pseudo elements cannot render underline bars', () => {
  const phaseCss = fs.readFileSync(path.join(ROOT, 'assets/phase-01-navbar.css'), 'utf8');
  assert.match(phaseCss, />a::before[^}]*content:none!important/);
  assert.match(phaseCss, />a::after[^}]*content:none!important/);
});
