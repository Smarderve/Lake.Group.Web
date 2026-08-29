const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

const contact = fs.readFileSync('contact.html', 'utf8');
const logoMount = fs.readFileSync('assets/components/logo-loop-mount.js', 'utf8');
const logoCss = fs.readFileSync('assets/components/LogoLoop.css', 'utf8');
const site = fs.readFileSync('assets/site.js', 'utf8');
const i18n = JSON.parse(fs.readFileSync('assets/i18n-content.json', 'utf8'));

test('Contact presents text-only contacts by sector and the Kigamboni HQ', () => {
  for (const sector of ['Energies', 'Manufacturing', 'Logistics', 'Real Estate', 'Agro Processing']) {
    assert.match(contact, new RegExp(`<h3>${sector} Sector</h3>`));
  }
  assert.doesNotMatch(contact, /Regional Contacts|ct-dir-logo|<nav class="breadcrumb">/);
  assert.match(contact, /Plots 72 &amp; 73, Vijibweni Area, Kigamboni/);
  assert.doesNotMatch(contact, /Mikocheni[^<]{0,80}(?:Coordinates|Google Maps)/);
  assert.match(contact, /Dar%20es%20Salaam%20Kigamboni[^"<]*Lake%20Oil%20LTD/);
  assert.match(contact, /assets\/images\/contact\/contact-hero-lake-energies\.webp/);
  assert.match(contact, /assets\/images\/contact\/kigamboni-hq\.webp/);
});

test('nationalities are canonicalized to 10+ in runtime content', () => {
  assert.equal(i18n.en['about.13'], '10+ nationalities');
  assert.match(i18n.en['about.4'], /10\+ nationalities/);
  assert.doesNotMatch(i18n.en['about.4'], /21 nationalities/);
});

test('counters start visible elements on each page initialization', () => {
  assert.match(site, /if \(isInViewport\(el\)\) \{\s*startCounter\(el\)/);
});

test('logo marquee uses compositor CSS animation instead of a frame loop', () => {
  assert.match(logoCss, /@keyframes logoloop-scroll/);
  assert.match(logoCss, /translate3d/);
  assert.doesNotMatch(logoMount, /requestAnimationFrame|cancelAnimationFrame/);
});
