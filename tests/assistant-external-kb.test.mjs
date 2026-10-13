import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { publishExternalRecord, retireExternalRecord, validateExternalIndex } from '../scripts/manage-assistant-external-kb.mjs';

function record(id, verification, text, extra = {}) {
  return {
    id,
    entity: 'Lake Oil Ltd.',
    topic: 'market share',
    pageTitle: 'Regulator report',
    sourceTitle: 'Regulator report',
    sourceUrl: 'https://ewura.go.tz/report.pdf',
    publisher: 'EWURA',
    publicationDate: '2025-01',
    checkedAt: '2026-10-13',
    entityInSource: 'Lake Oil',
    reportingPeriod: 'FY 2024/25',
    limitations: 'Scoped to the regulator metric and period.',
    sourceClass: 'regulator_report',
    confidence: 'high',
    verification,
    text,
    contentHash: createHash('sha256').update(text).digest('hex'),
    ...extra,
  };
}

function testIndex(records) { return { schemaVersion: 2, generatedAt: '2026-10-13T00:00:00.000Z', records }; }

test('reviewed replacement publishes new evidence and soft-retires its predecessor atomically', () => {
  const oldRecord = record('old-fact', 'PUBLISHED', 'An old regulator value.', { confidence: 'medium' });
  const replacement = record('new-fact', 'REVIEW', 'A replacement regulator value.', { supersedes: 'old-fact' });
  const index = testIndex([oldRecord, replacement]);
  const published = publishExternalRecord(index, {
    id: 'new-fact', reviewer: 'Lake Group Compliance', reason: 'Checked against the primary report.', reviewedAt: '2026-10-13T10:00:00.000Z',
  });
  assert.equal(published.verification, 'PUBLISHED');
  assert.equal(published.reviewedBy, 'Lake Group Compliance');
  assert.equal(oldRecord.verification, 'RETIRED');
  assert.match(oldRecord.retirementReason, /Superseded by new-fact/);
  assert.doesNotThrow(() => validateExternalIndex(index));
});

test('retirement retains source history and requires an accountable reviewer and reason', () => {
  const source = record('retire-me', 'PUBLISHED', 'A claim that is no longer current.');
  const index = testIndex([source]);
  assert.throws(() => retireExternalRecord(index, { id: source.id, reviewer: '', reason: 'Stale' }), /reviewer/);
  const retired = retireExternalRecord(index, { id: source.id, reviewer: 'Legal reviewer', reason: 'Source is superseded.', retiredAt: '2026-10-13T11:00:00.000Z' });
  assert.equal(retired.verification, 'RETIRED');
  assert.equal(index.records.length, 1);
  assert.equal(retired.retiredBy, 'Legal reviewer');
  assert.doesNotThrow(() => validateExternalIndex(index));
});

test('external evidence requires explicit confidence and valid hashes', () => {
  const item = record('invalid-confidence', 'PUBLISHED', 'Verified evidence.');
  item.confidence = 'certain';
  assert.throws(() => validateExternalIndex(testIndex([item])), /confidence/);
});
