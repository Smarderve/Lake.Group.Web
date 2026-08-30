'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const test = require('node:test');

const ROOT = path.join(__dirname, '..');
const about = fs.readFileSync(path.join(ROOT, 'about.html'), 'utf8');
const i18n = fs.readFileSync(path.join(ROOT, 'assets', 'i18n-content.js'), 'utf8');

test('About uses the approved journey and vision headings', () => {
  assert.match(about, />What Powers Our Journey<\/h2>/);
  assert.doesNotMatch(about, /What Drives Us/);
  assert.match(about, />Our Way Forward<\/h2>/);
  assert.doesNotMatch(about, /Where We(?:'|’)re Going/);
  assert.match(about, />A Glimpse Through the Lake Group Story<\/h2>/);
  assert.doesNotMatch(about, /The Lake Group Story on Film/);
  assert.match(i18n, /"about\.22": "What Powers Our Journey"/);
  assert.match(i18n, /"about\.28": "Our Way Forward"/);
});

test('About keeps only the approved workforce and fleet metrics', () => {
  assert.match(about, />30,000\+<\/span>/);
  assert.match(about, />1,600\+<\/span>/);
  assert.match(about, /more than <strong>1,600 trucks<\/strong>/);
  assert.match(about, />10<\/span>/);
  assert.match(about, />10\+<\/span>/);
  assert.match(about, />Nationalities<\/span>/);
  assert.doesNotMatch(about, /1,200\+|18\+|21\+|21\s+nationalities/i);
  assert.match(i18n, /"about\.10": "[^"]*10\+ nationalities[\s\S]*?1,600 trucks/);
  assert.doesNotMatch(i18n, /"about\.(?:4|10|11|12|13)": "[^"]*(?:21\+|21 nationalities)/i);
});

test('About keeps the approved mission, vision, values and chairman title', () => {
  assert.match(about, /To provide customers with quality products and services in a safe, efficient and cost-effective manner without damaging the environment/);
  assert.match(about, /To become the leading regional convenience retailer and marketer of products and services while achieving continuous improvement through operational excellence/);
  ['Innovation', 'Sustainability', 'Safety', 'Collaboration'].forEach((value) => assert.match(about, new RegExp(`>${value}<`)));
  assert.match(i18n, /"about\.7": "[^"]*Founder & Chairman Ally Edha Awadh/);
  assert.doesNotMatch(i18n, /"about\.7": "[^"]*(?:Executive Chairman|Executive Founder|Owner)/i);
});
