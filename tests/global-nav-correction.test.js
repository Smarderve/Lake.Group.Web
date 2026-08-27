const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const logoLoop = read('assets/components/logo-loop-mount.js');
const home = read('index.html');
const i18n = read('assets/i18n.js');
const navCss = read('assets/phase-01-navbar.css');

assert.match(logoLoop, /gulf-aggregates-blue\.png/);
assert.doesNotMatch(logoLoop, /gulf-aggregates\.png\?v=69/);
assert.match(home, /<a href="about\.html" class="hero-link">/);

for (const [code, label] of [['en', 'English'], ['fr', 'French'], ['sw', 'Swahili'], ['pt', 'Portuguese'], ['es', 'Spanish'], ['ar', 'Arabic']]) {
  assert.match(i18n, new RegExp(`${code}: ['"]${label}['"]`));
}
assert.match(i18n, /const SUPPORTED = \['en', 'fr', 'sw', 'pt', 'es', 'ar'\]/);
assert.match(i18n, /Translation for/);
assert.match(i18n, /lang-status/);
assert.match(navCss, /\.site-nav\[data-phase01-navbar\] \.lang-menu[\s\S]*?right: 0/);
assert.match(navCss, /\.site-nav\[data-phase01-navbar\] \.lang-status/);

console.log('Global nav correction checks loaded');
