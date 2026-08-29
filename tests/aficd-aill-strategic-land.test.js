const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

const aficd = read('aficd.html');
const aill = read('aill.html');

// --- AFICD Tests ---

test('AFICD: 200,000 sqm potential development footprint present', () => {
  assert.ok(aficd.includes('200,000'), 'AFICD should contain 200,000');
  assert.ok(aficd.includes('SQM'), 'AFICD should contain SQM label');
  assert.ok(aficd.includes('Potential Development Footprint'), 'AFICD should label as potential');
});

test('AFICD: 200,000 sqm is explicitly presented as potential/future, not current', () => {
  // Should NOT say "200,000 sqm facility" or "200,000 sqm operating area"
  assert.doesNotMatch(aficd, /200,000\s*sqm\s*(facility|operating|current|existing)/i,
    'Should not present 200,000 sqm as current operating space');
  // Should contain "potential" near the 200,000 reference
  assert.ok(aficd.includes('potential to develop'), 'Should describe as potential development');
});

test('AFICD: Combined 400,000 sqm context present', () => {
  assert.ok(aficd.includes('400,000'), 'AFICD should mention combined 400,000 sqm');
  assert.ok(aficd.includes('Together with AILL'), 'Should reference combined with AILL');
});

test('AFICD: Future use categories mentioned', () => {
  assert.ok(aficd.includes('warehousing'), 'Should mention warehousing');
  assert.ok(aficd.includes('container handling'), 'Should mention container handling');
  assert.ok(aficd.includes('value-added'), 'Should mention value-added services');
});

// --- AILL Tests ---

test('AILL: 200,000 sqm potential development footprint present', () => {
  assert.ok(aill.includes('200,000'), 'AILL should contain 200,000');
  assert.ok(aill.includes('SQM'), 'AILL should contain SQM label');
  assert.ok(aill.includes('Potential Development Footprint'), 'AILL should label as potential');
});

test('AILL: 200,000 sqm is explicitly presented as potential/future, not current', () => {
  assert.doesNotMatch(aill, /200,000\s*sqm\s*(facility|operating|current|existing)/i,
    'Should not present 200,000 sqm as current operating space');
  assert.ok(aill.includes('potential to develop'), 'Should describe as potential development');
});

test('AILL: Combined 400,000 sqm context present', () => {
  assert.ok(aill.includes('400,000'), 'AILL should mention combined 400,000 sqm');
  assert.ok(aill.includes('Together with AFICD'), 'Should reference combined with AFICD');
});

test('AILL: Future use categories mentioned', () => {
  assert.ok(aill.includes('bulk cargo handling'), 'Should mention bulk cargo handling');
  assert.ok(aill.includes('warehousing'), 'Should mention warehousing');
  assert.ok(aill.includes('distribution'), 'Should mention distribution');
  assert.ok(aill.includes('integrated logistics'), 'Should mention integrated logistics');
});

// --- Combined Tests ---

test('Combined 400,000 sqm only appears in correct combined context', () => {
  // Both pages should reference 400,000 sqm as a combined figure with the other company
  assert.ok(aficd.includes('400,000'), 'AFICD page should mention combined 400,000');
  assert.ok(aill.includes('400,000'), 'AILL page should mention combined 400,000');
});

test('No unsupported timeline or construction claims', () => {
  // Should not contain completion dates for the 200,000 sqm development
  assert.doesNotMatch(aficd, /200,000.*completion/i, 'Should not claim completion date for 200k sqm');
  assert.doesNotMatch(aill, /200,000.*completion/i, 'Should not claim completion date for 200k sqm');
  assert.doesNotMatch(aficd, /under construction.*200,000/i, 'Should not say 200k sqm under construction');
  assert.doesNotMatch(aill, /under construction.*200,000/i, 'Should not say 200k sqm under construction');
});

test('Existing current operational data preserved on AILL', () => {
  // AILL should still have its current 201,000 sqm operating yard reference
  assert.ok(aill.includes('201,000'), 'AILL should retain current 201,000 sqm yard reference');
  assert.ok(aill.includes('331,000'), 'AILL should retain 331,000 sqm planned reference');
});

test('AFICD existing operational data preserved', () => {
  // AFICD should still reference its operational capabilities
  assert.ok(aficd.includes('365'), 'AFICD should retain 365 days operations');
  assert.ok(aficd.includes('24 / 7') || aficd.includes('24/7'), 'AFICD should retain 24/7 readiness');
});
