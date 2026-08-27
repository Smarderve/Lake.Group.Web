'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const about = fs.readFileSync(path.join(ROOT, 'about.html'), 'utf8');
const navbar = fs.readFileSync(path.join(ROOT, 'assets/phase-01-navbar.css'), 'utf8');

assert.match(
  navbar,
  /body\.about \.site-nav\[data-phase01-navbar\][\s\S]*?background:\s*transparent\s*!important/,
  'About navbar must be transparent over the photographic hero'
);
assert.match(
  about,
  /<h2 class="ose-display ose-xl">Built in Africa\.<br>Growing with purpose\.<\/h2>/,
  'About hero headline must use one deliberate responsive line break'
);
assert.match(
  about,
  /\.ose-scene\s*\{[\s\S]*?transition:\s*opacity 0\.5s ease/,
  'About scenes must use a real opacity transition in both directions'
);
assert.match(about, /\.ose-text\s*\{[^}]*max-width:\s*900px/);
assert.match(about, /\.ose-xl\s*\{\s*font-size:\s*clamp\(1\.55rem/);

console.log('About final correction regression checks passed');
