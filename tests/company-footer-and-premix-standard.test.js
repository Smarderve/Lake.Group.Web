'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const test = require('node:test');

const ROOT = path.join(__dirname, '..');
const CORPORATE_LOGO = 'assets/images/logos/LAKE_GROUP_LOGO.png';
const legacyPremix = /Lake Premix\s*(?:&(?:amp;)?|and)\s*Cement/i;

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

test('every shared public footer keeps the Lake Group corporate logo', () => {
  const publicPages = fs.readdirSync(ROOT).filter((file) => file.endsWith('.html'));
  for (const page of publicPages) {
    const html = read(page);
    if (!/data-shared-footer="true"/.test(html)) continue;
    const footer = html.match(/<footer\b[^>]*class="site-footer"[\s\S]*?<\/footer>/i)?.[0] || '';
    assert.match(footer, new RegExp(CORPORATE_LOGO.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `${page}: footer uses the Lake Group logo`);
    assert.doesNotMatch(footer, /assets\/images\/logos\/companies\//i, `${page}: footer must not use a subsidiary logo`);
  }
  const site = read('assets/site.js');
  assert.doesNotMatch(site, /footerImg\.src\s*=\s*companySrc/, 'runtime branding must not replace the corporate footer mark');
});

test('public navigation and content use Lake Premix, never the legacy company name', () => {
  for (const page of fs.readdirSync(ROOT).filter((file) => file.endsWith('.html'))) {
    assert.doesNotMatch(read(page), legacyPremix, `${page}: no legacy Lake Premix name`);
  }
  for (const asset of ['assets/i18n-content.js', 'assets/i18n-content.json', 'assets/assistant-kb.js', 'assets/news-data.js']) {
    assert.doesNotMatch(read(asset), legacyPremix, `${asset}: no legacy Lake Premix name`);
    assert.match(read(asset), /Lake Premix/, `${asset}: canonical Lake Premix name retained`);
  }
});

test('manufacturing navigation uses the approved company display names', () => {
  const navigation = read('scripts/templates/nav.html');
  const mobileNavigation = read('scripts/templates/mobile_nav.html');
  for (const source of [navigation, mobileNavigation]) {
    assert.match(source, /Lake Building Solution/);
    assert.match(source, /Lake Pipes/);
    assert.match(source, /Lake Steel/);
    assert.match(source, /Lake Cylinders/);
    assert.match(source, /Lake Premix/);
    assert.match(source, /Gulf Aggregates/);
  }
});

test('standardized company pages load the scoped editorial refinement layer', () => {
  const companyPages = [
    'lake-oil.html', 'lake-gas.html', 'lake-lubes.html', 'lake-steel.html',
    'lake-cylinders.html', 'lake-pipes.html', 'lake-buildings.html',
    'lake-premix-cement.html', 'lake-trans.html', 'aficd.html', 'aill.html',
    'cross-country.html', 'gulf-aggregates.html', 'lake-agro.html', 'lake-aviation.html'
  ];
  for (const page of companyPages) {
    const html = read(page);
    assert.match(html, /assets\/company-page-standard\.css/, `${page}: loads the shared company-page layer`);
    assert.match(html, /<body\b[^>]*\bcompany-standard\b/i, `${page}: opts into the scoped company-page layer`);
  }
});
