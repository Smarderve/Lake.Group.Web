'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..');
const navTemplate = fs.readFileSync(path.join(ROOT, 'scripts/templates/nav.html'), 'utf8').replace(/\r\n/g, '\n').trimEnd();
const mobileTemplate = fs.readFileSync(path.join(ROOT, 'scripts/templates/mobile_nav.html'), 'utf8').replace(/\r\n/g, '\n').trimEnd();
const NON_CORPORATE_SURFACES = new Set([
  '404.html',
  'offline.html',
  'la-home.html',
  'la-projects.html',
  'lake-group-financial-dashboard.html',
  'lake-group-org-chart.html',
]);
const pages = fs.readdirSync(ROOT)
  .filter((file) => file.endsWith('.html') && !NON_CORPORATE_SURFACES.has(file))
  .sort();

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
  assert.equal(pages.length, 50, 'audit every root production corporate page');
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

test('standalone, legacy, and demo surfaces retain their independent chrome', () => {
  for (const file of NON_CORPORATE_SURFACES) {
    const source = fs.readFileSync(path.join(ROOT, file), 'utf8');
    assert.doesNotMatch(source, /data-phase01-navbar|phase-01-navbar\.(?:css|js)/, `${file}: excluded from corporate navbar synchronization`);
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
