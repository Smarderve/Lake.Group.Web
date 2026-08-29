const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

const page = read('lake-trans.html');

test('Hero uses new approved fleet image', () => {
  assert.ok(page.includes('lake-trans-fleet-hero.webp'), 'Hero should reference lake-trans-fleet-hero.webp');
  assert.ok(!page.includes("hero-media\" style=\"background-image:url('assets/images/laketrans/ops/fleet-inspection.jpg')"), 'Hero media should not use old fleet-inspection.jpg');
});

test('Hero text uses source-backed copy', () => {
  assert.ok(page.includes('Lake Trans Limited'), 'Hero should show full company name');
  assert.ok(page.includes('since 2011'), 'Hero should reference 2011 establishment');
  assert.ok(page.includes('ISO'), 'Hero should mention ISO certification');
  assert.ok(page.includes('1,500'), 'Hero should reference fleet size');
});

test('Fleet at a Glance shows source-backed numbers', () => {
  assert.ok(page.includes('1,500+'), 'Should show 1,500+ trucks');
  assert.ok(page.includes('2011'), 'Should show 2011');
  assert.ok(page.includes('ISO'), 'Should show ISO');
  assert.ok(page.includes('GPS'), 'Should show GPS monitoring');
});

test('Unsupported fleet numbers are removed', () => {
  // 650 should not appear as a fleet count
  assert.doesNotMatch(page, /650<\/span>.*?<p>Vehicles/s, 'Should not show 650 vehicles');
  // 2008 should not appear as establishment year
  assert.doesNotMatch(page, /2008<\/span>.*?<p>Established/s, 'Should not show 2008 established');
  // 40K L should not appear
  assert.doesNotMatch(page, /40K L/, 'Should not show 40K L capacity');
});

test('Source-locked mission and vision', () => {
  assert.ok(page.includes('environmentally responsible'), 'Mission should mention environmental responsibility');
  assert.ok(page.includes('empowering our people'), 'Mission should mention empowering people');
  assert.ok(page.includes("connect Africa"), 'Vision should mention connecting Africa');
  assert.ok(page.includes('seamless trade'), 'Vision should mention seamless trade');
});

test('Four core values present', () => {
  assert.ok(page.includes('Teamwork'), 'Should have Teamwork value');
  assert.ok(page.includes('Reliability'), 'Should have Reliability value');
  assert.ok(page.includes('Integrity'), 'Should have Integrity value');
  assert.ok(page.includes('Customer Satisfaction'), 'Should have Customer Satisfaction value');
});

test('Source-backed services only', () => {
  assert.ok(page.includes('Petroleum Tankers'), 'Should have Petroleum Tankers service');
  assert.ok(page.includes('Flatbed'), 'Should have Flatbed service');
  assert.ok(page.includes('GPS'), 'Should have GPS monitoring');
  assert.ok(page.includes('Tipper'), 'Should have Tipper trucks');
  // Unsupported services removed
  assert.doesNotMatch(page, /LPG Transport/, 'LPG Transport should be removed');
  assert.doesNotMatch(page, /Port Trucking/, 'Port Trucking should be removed');
  assert.doesNotMatch(page, /Express Road/, 'Express Road should be removed');
});

test('No unsupported client names', () => {
  assert.doesNotMatch(page, /Dalbit/, 'Should not list Dalbit as client');
  assert.doesNotMatch(page, /Trafigura/, 'Should not list Trafigura as client');
  assert.doesNotMatch(page, /MOGAS/, 'Should not list MOGAS as client');
  assert.doesNotMatch(page, /Mt\. Meru/, 'Should not list Mt. Meru as client');
  assert.doesNotMatch(page, /HASS Petroleum/, 'Should not list HASS as client');
});

test('No breadcrumb present', () => {
  assert.doesNotMatch(page, /class="breadcrumb"/, 'No breadcrumb class');
});

test('Metadata uses source-backed content', () => {
  assert.ok(page.includes('Lake Trans Limited'), 'Meta should use full company name');
  assert.doesNotMatch(page, /established in 2008/, 'Meta should not say 2008');
  assert.doesNotMatch(page, /650-vehicle/, 'Meta should not say 650 vehicles');
});

test('JSON-LD uses correct data', () => {
  assert.ok(page.includes('"name": "Lake Trans Limited"'), 'JSON-LD should use full company name');
  assert.doesNotMatch(page, /650-vehicle fleet/, 'JSON-LD should not reference 650 vehicles');
});

test('History section present with source facts', () => {
  assert.ok(page.includes('small number of trucks'), 'History should mention small beginnings');
  assert.ok(page.includes('1,500 trucks'), 'History should reference current fleet size');
  assert.ok(page.includes('fuel, steel, construction materials'), 'History should list cargo types');
});

test('Dark section contrast CSS applied', () => {
  assert.ok(page.includes('.fs-on-dark .fs-check li{color:rgba(233,237,248,0.92)'), 'Dark section check list should have readable contrast');
  assert.ok(page.includes('.fs-on-dark p{color:rgba(233,237,248,0.9)'), 'Dark section paragraphs should have readable contrast');
});
