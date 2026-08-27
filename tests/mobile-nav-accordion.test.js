'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const js = fs.readFileSync(path.join(root, 'assets/phase-01-navbar.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets/phase-01-navbar.css'), 'utf8');
const template = fs.readFileSync(path.join(root, 'scripts/templates/mobile_nav.html'), 'utf8');

assert.match(js, /normalizeRoute/);
assert.match(js, /mob-corporate-panel/);
assert.match(js, /let openMobileSection = null/);
assert.match(js, /toggleTopMobileSection\('subsidiaries'/);
assert.match(js, /toggleTopMobileSection\('corporate'/);
assert.match(js, /if \(open\) resetMobileAccordions\(\)/);
assert.doesNotMatch(js, /mobilePrimary\.classList\.add\('active'\)/);
assert.match(css, /mob-primary\[aria-expanded="true"\][\s\S]*?mob-corporate-trigger\[aria-expanded="true"\]/);
assert.match(css, /mob-acc-panel\.is-open[\s\S]*?max-height: var\(--mobile-panel-height/);
assert.match(css, /mob-section[\s\S]*?color: rgba\(255, 255, 255, \.62\)/);
assert.match(template, /aria-controls="mob-subsidiaries"/);
assert.match(template, /History/);

console.log('Mobile navigation accordion checks passed');
