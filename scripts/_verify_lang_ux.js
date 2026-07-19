#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const theme = fs.readFileSync(path.join(root, 'assets/theme.css'), 'utf8');
const flag = fs.readFileSync(path.join(root, 'assets/flagship.css'), 'utf8');
const i18n = fs.readFileSync(path.join(root, 'assets/i18n.js'), 'utf8');
const data = JSON.parse(fs.readFileSync(path.join(root, 'assets/i18n-content.json'), 'utf8'));

const checks = [];
function ok(name, pass, detail) {
  checks.push({ name, pass: !!pass, detail: detail || '' });
}

ok('no EN|SW quick pair', !/lang-quick|lang-pipe/.test(index));
ok('has lang-current label', /data-lang-label/.test(index) && /lang-current/.test(index));
ok('globe after label in markup', /lang-current[\s\S]{0,200}lang-icons[\s\S]{0,80}lang-globe/.test(index));
ok('no \\r\\r\\n', !index.includes('\r\r\n'));
ok('theme yellow current', /lang-current[\s\S]{0,120}--color-yellow-accent/.test(theme));
ok('theme yellow active item', /lang-menu-item\.active[\s\S]{0,120}--color-yellow-accent/.test(theme));
ok('no blue-light active theme', !/lang-menu-item\.active[\s\S]{0,80}brand-blue-light/.test(theme));
ok('flagship yellow active', /lang-menu-item\.active[\s\S]{0,120}--color-yellow-accent/.test(flag));
ok('hover open in i18n.js', /mouseenter/.test(i18n) && /canHoverOpen/.test(i18n));
ok('sync label in i18n.js', /data-lang-label/.test(i18n) && /LANG_LABELS/.test(i18n));
ok('premium menu styles', /lang-menu-check/.test(theme) && /border-radius:\s*12px/.test(theme));
ok('contact dir keys', 'contact.dir.title' in data.en && data.sw['contact.dir.title']);
ok('hi/ar subsidiaries', /सहायक|الشركات/.test(data.hi['nav.companies'] + data.ar['nav.companies']));
ok('services learnMore wired', /data-i18n="common.learnMore"/.test(fs.readFileSync(path.join(root, 'services.html'), 'utf8')));
ok('company cta wired', /data-i18n="company.cta.lede"/.test(fs.readFileSync(path.join(root, 'lake-oil.html'), 'utf8')));

let failed = 0;
for (const c of checks) {
  console.log((c.pass ? 'PASS' : 'FAIL') + '  ' + c.name + (c.detail ? ' — ' + c.detail : ''));
  if (!c.pass) failed++;
}
console.log(failed ? '\n' + failed + ' failed' : '\nAll checks passed');
process.exit(failed ? 1 : 0);
