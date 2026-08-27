'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const css = fs.readFileSync(path.join(__dirname, '..', 'assets', 'phase-01-navbar.css'), 'utf8');
const js = fs.readFileSync(path.join(__dirname, '..', 'assets', 'phase-01-navbar.js'), 'utf8');
const i18n = fs.readFileSync(path.join(__dirname, '..', 'assets', 'i18n.js'), 'utf8');

assert.match(css, /\.site-nav\[data-phase01-navbar\] \.nav-megamenu[\s\S]*?background:\s*var\(--nav-menu-surface\)\s*!important/);
assert.match(css, /\.site-nav\[data-phase01-navbar\] \.nav-megamenu[\s\S]*?backdrop-filter:\s*blur\(18px\)[^;]*!important/);
assert.match(css, /\.site-nav\[data-phase01-navbar\] \.nav-megamenu[\s\S]*?border:\s*1px solid var\(--nav-menu-border\)\s*!important/);
assert.match(css, /\.mm-cat\[data-mm-cat="energies"\]::before/);
assert.match(css, /\.mm-cat\[data-mm-cat="automotive"\]::before/);
assert.match(css, /\.site-nav\[data-phase01-navbar\] \.lang-menu[\s\S]*?background:\s*var\(--nav-menu-surface\)\s*!important/);
assert.match(js, /languageTrigger\.removeAttribute\(['"]disabled['"]\)/);
assert.match(i18n, /setAttribute\('role', 'menuitemradio'\)/);

console.log('Global navigation consistency checks passed');
