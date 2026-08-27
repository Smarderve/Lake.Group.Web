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
assert.match(css, /\.mm-sector-icon/);
assert.match(css, /\.mm-cat::before\s*\{[\s\S]*?display:\s*none\s*!important/);
assert.match(js, /sectorAnimations/);
assert.match(js, /lottie\/energies-in-reveal\.json/);
assert.match(js, /lottie\/manufacturing-in-reveal\.json/);
assert.match(js, /createElement\(['"]lord-icon['"]\)/);
assert.match(js, /playSectorIcon/);
assert.match(js, /prefers-reduced-motion/);
assert.match(css, /\.nav-megamenu\s*\{[\s\S]*?overflow:\s*hidden auto\s*!important/);
assert.match(css, /\.mm-company:hover img[\s\S]*?transform:\s*scale\(1\.05\)/);
assert.doesNotMatch(css, /\.nav-megamenu \.mm-company:hover[\s\S]*?border-bottom-color:\s*rgba/);
assert.match(css, /\.site-nav\[data-phase01-navbar\] \.lang-menu[\s\S]*?background:\s*var\(--nav-menu-surface\)\s*!important/);
assert.match(js, /languageTrigger\.removeAttribute\(['"]disabled['"]\)/);
assert.match(i18n, /setAttribute\('role', 'menuitemradio'\)/);

console.log('Global navigation consistency checks passed');
