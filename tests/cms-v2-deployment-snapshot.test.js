const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { verifyBundle, writeBundle } = require('../scripts/cms-v2-deployment-snapshot.js');

const canonical = (value) => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.keys(value).sort().reduce((out, key) => { out[key] = canonical(value[key]); return out; }, {}) : value;
function bundle() {
  const content = { schemaVersion: 1, documents: { 'lake-aviation': { hero: { heading: 'Lake Aviation' } } } };
  const integrity = `sha256-${crypto.createHash('sha256').update(JSON.stringify(canonical(content))).digest('base64')}`;
  const snapshot = { releaseId: 'release_test', integrity, ...content };
  return { pointer: { schemaVersion: 2, releaseId: snapshot.releaseId, integrity, snapshotUrl: `releases/${snapshot.releaseId}/content.json` }, snapshot };
}

test('CMS V2 deployment export verifies integrity and writes an atomic namespaced pointer', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lake-cms-v2-export-'));
  try {
    const input = bundle(); const pointer = writeBundle(root, input);
    assert.equal(pointer.releaseId, 'release_test');
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, 'current.json'))), input.pointer);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, 'releases', 'release_test', 'content.json'))), input.snapshot);
    const tampered = bundle(); tampered.snapshot.documents['lake-aviation'].hero.heading = 'Tampered';
    assert.throws(() => verifyBundle(tampered), /integrity/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
