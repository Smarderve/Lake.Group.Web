'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'assets', 'home-hero.js'), 'utf8');
const slideshow = source.slice(0, source.indexOf('/* Stat count-up animation */'));

assert.doesNotMatch(slideshow, /setInterval\s*\(/, 'hero autoplay must not use a repeating interval');
assert.match(slideshow, /setTimeout\s*\(/, 'hero autoplay must use one scheduled tick per slide');
assert.match(slideshow, /index\s*=\s*\(index\s*\+\s*1\)\s*%\s*slides\.length/, 'hero autoplay must wrap to slide 1');
assert.match(slideshow, /function\s+schedule\s*\(/, 'hero autoplay must have one authoritative scheduler');
assert.doesNotMatch(slideshow, /new\s+IntersectionObserver/, 'hero autoplay must not be invalidated by intersection state');

console.log('Homepage hero autoplay regression checks passed');
