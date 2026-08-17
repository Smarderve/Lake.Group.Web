const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const REQUIRED = [
  'SECURITY-ARCHITECTURE.md',
  'SECURITY-THREAT-MODEL.md',
  'SECURITY-ASSET-INVENTORY.md',
  'SECURITY-CONTROLS.md',
  'SECURITY-TEST-PLAN.md',
  'SECURITY-REGRESSION-MATRIX.md',
  'INCIDENT-RESPONSE.md',
  'SECURITY-OPERATIONS.md',
  'SECURITY-ACCEPTANCE-REPORT.md',
];

test('all security-plan evidence documents exist and are substantive', () => {
  for (const file of REQUIRED) {
    const source = fs.readFileSync(path.resolve('docs', file), 'utf8');
    assert.ok(source.length > 500, `${file} is incomplete`);
  }
});

test('the derived threat model covers T001 through T300 exactly once by range', () => {
  const matrix = fs.readFileSync(path.resolve('docs', 'SECURITY-REGRESSION-MATRIX.md'), 'utf8');
  const ranges = [...matrix.matchAll(/^\| T(\d{3})–T(\d{3}) \|/gm)]
    .map((match) => [Number(match[1]), Number(match[2])]);
  assert.equal(ranges.length, 30);
  ranges.forEach(([start, end], index) => {
    assert.equal(start, index * 10 + 1);
    assert.equal(end, index * 10 + 10);
  });
});

test('external infrastructure controls are not represented as repository PASS', () => {
  const report = fs.readFileSync(path.resolve('docs', 'SECURITY-ACCEPTANCE-REPORT.md'), 'utf8');
  assert.match(report, /External-only gates/);
  assert.match(report, /Not asserted from this checkout/);
  assert.doesNotMatch(report, /Database not publicly exposed\s+PASS/);
});
