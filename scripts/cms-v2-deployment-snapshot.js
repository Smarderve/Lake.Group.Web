#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const canonical = (value) => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.keys(value).sort().reduce((out, key) => { out[key] = canonical(value[key]); return out; }, {}) : value;

function verifyBundle(bundle) {
  const { pointer, snapshot } = bundle || {};
  if (pointer?.schemaVersion !== 2 || snapshot?.schemaVersion !== 1 || pointer.releaseId !== snapshot.releaseId) throw new Error('CMS V2 release identity is invalid');
  if (!/^[A-Za-z0-9_-]+$/.test(pointer.releaseId) || pointer.snapshotUrl !== `releases/${pointer.releaseId}/content.json`) throw new Error('CMS V2 release path is invalid');
  const digest = `sha256-${crypto.createHash('sha256').update(JSON.stringify(canonical({ schemaVersion: snapshot.schemaVersion, documents: snapshot.documents }))).digest('base64')}`;
  if (pointer.integrity !== snapshot.integrity || digest !== pointer.integrity) throw new Error('CMS V2 release integrity is invalid');
  return { pointer, snapshot };
}

function writeBundle(output, bundle) {
  const { pointer, snapshot } = verifyBundle(bundle);
  const root = path.resolve(output); const releaseDir = path.join(root, 'releases', pointer.releaseId);
  fs.mkdirSync(releaseDir, { recursive: true });
  const releaseFile = path.join(releaseDir, 'content.json');
  if (fs.existsSync(releaseFile) && fs.readFileSync(releaseFile, 'utf8') !== `${JSON.stringify(snapshot)}\n`) throw new Error('Immutable CMS V2 release already exists with different content');
  if (!fs.existsSync(releaseFile)) fs.writeFileSync(releaseFile, `${JSON.stringify(snapshot)}\n`, { flag: 'wx' });
  const temporary = path.join(root, `.current-${process.pid}.json`);
  fs.writeFileSync(temporary, `${JSON.stringify(pointer)}\n`, { flag: 'wx' });
  fs.renameSync(temporary, path.join(root, 'current.json'));
  return pointer;
}

async function run() {
  const api = String(process.argv[2] || '').replace(/\/+$/, ''); const token = process.env.CMS_V2_DEPLOYMENT_TOKEN;
  if (!/^https:\/\//.test(api) || !token) throw new Error('HTTPS API origin and CMS_V2_DEPLOYMENT_TOKEN are required');
  const response = await fetch(`${api}/api/cms-v2-release`, { headers: { authorization: `Bearer ${token}`, accept: 'application/json' }, signal: AbortSignal.timeout(15_000) });
  if (response.status === 404) { console.log('No CMS V2 release exists yet; static page fallback retained.'); return; }
  if (!response.ok) throw new Error(`CMS V2 export returned HTTP ${response.status}`);
  const pointer = writeBundle(path.resolve('public-content/cms-v2'), await response.json());
  console.log(`Exported CMS V2 release ${pointer.releaseId}`);
}

if (require.main === module) run().catch((error) => { console.error(error.message); process.exitCode = 1; });
module.exports = { verifyBundle, writeBundle };
