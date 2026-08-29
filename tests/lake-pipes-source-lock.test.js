const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

const page = read('lake-pipes.html');

test('No stale Lake Plastics branding in visible content', () => {
  assert.doesNotMatch(page, /Lake Plastic[s]?\b(?!.*redirect)/i, 'Should not contain Lake Plastics in page content');
});

test('Page uses Lake Pipes branding', () => {
  assert.ok(page.includes('Lake Pipes'), 'Page should reference Lake Pipes');
  assert.ok(page.includes('<title>Lake Pipes'), 'Title should use Lake Pipes');
});

test('Source-backed facts present', () => {
  assert.ok(page.includes('2019'), 'Should reference 2019 establishment');
  assert.ok(page.includes('Visiga'), 'Should reference Visiga factory');
  assert.ok(page.includes('Kibaha'), 'Should reference Kibaha location');
  assert.ok(page.includes('ISO 1452'), 'Should reference ISO 1452 standard');
  assert.ok(page.includes('200mm'), 'Should reference size range');
});

test('Source-backed products only', () => {
  assert.ok(page.includes('PVC Pipes'), 'Should have PVC Pipes');
  assert.ok(page.includes('HDPE Pipes'), 'Should have HDPE Pipes');
  assert.ok(page.includes('Water Tanks'), 'Should have Water Tanks');
  assert.ok(page.includes('U-PVC Fittings'), 'Should have U-PVC Fittings');
  // Unsupported products removed
  assert.doesNotMatch(page, /Industrial Packaging/, 'Industrial Packaging should be removed');
  assert.doesNotMatch(page, /Construction Plastics/, 'Construction Plastics should be removed');
});

test('Source-backed manufacturing capabilities', () => {
  assert.ok(page.includes('PVC / PPR / HDPE Extrusion'), 'Should have extrusion capability');
  assert.ok(page.includes('Roto Molding'), 'Should have roto molding');
  assert.ok(page.includes('Blow Molding'), 'Should have blow molding');
  assert.ok(page.includes('Quality Testing'), 'Should have quality testing');
  // Unsupported services removed
  assert.doesNotMatch(page, /Injection Molding/, 'Injection Molding should be removed');
  assert.doesNotMatch(page, /Packaging Manufacturing/, 'Packaging Manufacturing should be removed');
  assert.doesNotMatch(page, /Custom Manufacturing/, 'Custom Manufacturing should be removed');
});

test('Four correct core values', () => {
  assert.ok(page.includes('Safety First'), 'Should have Safety First value');
  assert.ok(page.includes('Quality Excellence'), 'Should have Quality Excellence value');
  assert.ok(page.includes('Customer Satisfaction'), 'Should have Customer Satisfaction value');
  assert.ok(page.includes('Integrity'), 'Should have Integrity value');
  // Wrong values removed
  assert.doesNotMatch(page, /<h4>Innovation<\/h4>/, 'Old Innovation value should be removed');
  assert.doesNotMatch(page, /<h4>Efficiency<\/h4>/, 'Old Efficiency value should be removed');
  assert.doesNotMatch(page, /<h4>Sustainability<\/h4>/, 'Old Sustainability value should be removed');
});

test('Mission and Vision from source', () => {
  assert.ok(page.includes('cost-efficiency'), 'Mission should mention cost-efficiency');
  assert.ok(page.includes('teamwork, reliability and integrity'), 'Vision should mention shared values');
});

test('No AI-generated duplicate text', () => {
  assert.doesNotMatch(page, /high-quality high-quality/, 'Should not have duplicated text');
  assert.doesNotMatch(page, /PLASTICS INNOVATION/, 'Should not have AI marketing heading');
});

test('No wrong gallery images', () => {
  assert.doesNotMatch(page, /group\/ops\/depot-fleet\.jpg/, 'Should not use group depot image');
  assert.doesNotMatch(page, /group\/ops\/tanker-loading\.jpg/, 'Should not use group tanker image');
});

test('No Lake Plastics reference in video or other sections', () => {
  assert.doesNotMatch(page, /Watch Lake Plastics/, 'Should not reference Lake Plastics');
});

test('Operations by Country shows Tanzania only', () => {
  assert.ok(page.includes('Tanzania'), 'Should show Tanzania');
  assert.ok(page.includes('Lake Pipes'), 'Should show Lake Pipes badge');
});

test('Hero text is source-backed', () => {
  assert.ok(page.includes('Est. 2019'), 'Hero should reference 2019');
  assert.ok(page.includes('water management'), 'Hero should mention water management');
  assert.ok(page.includes('irrigation'), 'Hero should mention irrigation');
});

test('No breadcrumb present', () => {
  assert.doesNotMatch(page, /class="breadcrumb"/, 'No breadcrumb class');
});
