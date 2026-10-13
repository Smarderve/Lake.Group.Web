#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const indexPath = resolve(root, 'ai/knowledge/lake-group-external-index.json');
const allowedHosts = new Set(['ewura.go.tz', 'www.ewura.go.tz', 'cqs.ewura.go.tz', 'epra.go.ke', 'new.kenyalaw.org', 'businessdailyafrica.com', 'www.businessdailyafrica.com']);
const requiredFields = ['id', 'entity', 'topic', 'sourceTitle', 'sourceUrl', 'publisher', 'checkedAt', 'reportingPeriod', 'limitations', 'sourceClass', 'text'];

function sha(text) { return createHash('sha256').update(text).digest('hex'); }
function normalized(text) { return String(text || '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim(); }
function validateRecord(record) {
  for (const field of requiredFields) if (!String(record?.[field] || '').trim()) throw new Error(`External record is missing required field: ${field}`);
  let url;
  try { url = new URL(record.sourceUrl); } catch { throw new Error(`Invalid source URL in ${record.id}.`); }
  if (url.protocol !== 'https:' || !allowedHosts.has(url.hostname) || url.username || url.password) throw new Error(`Source host is not allowlisted for ${record.id}.`);
  if (record.publicationDate != null && !/^\d{4}(?:-\d{2}(?:-\d{2})?)?$/.test(record.publicationDate)) throw new Error(`Invalid publication date in ${record.id}.`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(record.checkedAt)) throw new Error(`Invalid checkedAt date in ${record.id}.`);
  if (!['PUBLISHED', 'REVIEW'].includes(record.verification)) throw new Error(`${record.id} must have verification=PUBLISHED or REVIEW.`);
}

async function load() {
  const index = JSON.parse(await readFile(indexPath, 'utf8'));
  if (index.schemaVersion !== 1 || !Array.isArray(index.records)) throw new Error('Unsupported external knowledge index schema.');
  return index;
}

async function check() {
  const index = await load();
  const ids = new Set();
  const texts = new Map();
  const sources = new Map();
  const warnings = [];
  for (const record of index.records) {
    validateRecord(record);
    if (ids.has(record.id)) throw new Error(`Duplicate record ID: ${record.id}`);
    ids.add(record.id);
    if (record.contentHash !== sha(record.text)) throw new Error(`Content hash mismatch: ${record.id}`);
    const textKey = normalized(record.text);
    if (texts.has(textKey)) warnings.push(`Near duplicate factual text: ${texts.get(textKey)} and ${record.id}`);
    texts.set(textKey, record.id);
    const sourceKey = `${record.sourceUrl}\n${textKey}`;
    if (sources.has(sourceKey)) warnings.push(`Duplicate source claim: ${sources.get(sourceKey)} and ${record.id}`);
    sources.set(sourceKey, record.id);
    if (record.verification === 'REVIEW') warnings.push(`Not published (review required): ${record.id}`);
    const checked = new Date(`${record.checkedAt}T00:00:00Z`);
    if ((Date.now() - checked.getTime()) > 365 * 24 * 60 * 60 * 1000) warnings.push(`Source review due (>365 days since checked): ${record.id}`);
  }
  process.stdout.write(`External knowledge: ${index.records.length} records; ${index.records.filter((record) => record.verification === 'PUBLISHED').length} published, ${index.records.filter((record) => record.verification === 'REVIEW').length} awaiting review.\n`);
  warnings.forEach((warning) => process.stdout.write(`REVIEW: ${warning}\n`));
  return warnings.some((warning) => warning.startsWith('Near duplicate') || warning.startsWith('Duplicate source claim')) ? 1 : 0;
}

async function stage(inputPath) {
  const payload = JSON.parse(await readFile(resolve(inputPath), 'utf8'));
  const candidates = Array.isArray(payload) ? payload : [payload];
  if (!candidates.length) throw new Error('No external knowledge records were supplied.');
  const index = await load();
  const ids = new Set(index.records.map((record) => record.id));
  const texts = new Set(index.records.map((record) => normalized(record.text)));
  const staged = [];
  for (const candidate of candidates) {
    const record = { ...candidate, verification: 'REVIEW' };
    validateRecord(record);
    if (ids.has(record.id)) throw new Error(`Record ID already exists: ${record.id}`);
    if (texts.has(normalized(record.text))) throw new Error(`Duplicate factual text: ${record.id}`);
    record.contentHash = sha(record.text);
    ids.add(record.id);
    texts.add(normalized(record.text));
    staged.push(record);
  }
  index.records.push(...staged);
  index.generatedAt = new Date().toISOString();
  await writeFile(indexPath, `${JSON.stringify(index, null, 2)}\n`, { encoding: 'utf8', flag: 'w' });
  process.stdout.write(`Staged ${staged.length} record(s) as REVIEW. They are not available to retrieval until an authorized reviewer verifies them and publishes them.\n`);
}

try {
  const [command, inputFlag, inputPath] = process.argv.slice(2);
  if (command === 'check') process.exitCode = await check();
  else if (command === 'stage' && inputFlag === '--input' && inputPath) await stage(inputPath);
  else {
    process.stderr.write('Usage: node scripts/manage-assistant-external-kb.mjs check\n       node scripts/manage-assistant-external-kb.mjs stage --input <review-record.json>\n');
    process.exitCode = 2;
  }
} catch (error) {
  process.stderr.write(`External knowledge workflow failed: ${error.message}\n`);
  process.exitCode = 1;
}
