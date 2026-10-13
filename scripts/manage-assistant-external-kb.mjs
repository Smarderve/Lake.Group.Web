#!/usr/bin/env node
import { createHash, randomUUID } from 'node:crypto';
import { readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const indexPath = resolve(root, 'ai/knowledge/lake-group-external-index.json');
const allowedHosts = new Set(['ewura.go.tz', 'www.ewura.go.tz', 'cqs.ewura.go.tz', 'epra.go.ke', 'new.kenyalaw.org', 'businessdailyafrica.com', 'www.businessdailyafrica.com']);
const requiredFields = ['id', 'entity', 'topic', 'sourceTitle', 'sourceUrl', 'publisher', 'checkedAt', 'reportingPeriod', 'limitations', 'sourceClass', 'confidence', 'text'];

function sha(text) { return createHash('sha256').update(text).digest('hex'); }
function normalized(text) { return String(text || '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim(); }
function validateRecord(record) {
  for (const field of requiredFields) if (!String(record?.[field] || '').trim()) throw new Error(`External record is missing required field: ${field}`);
  let url;
  try { url = new URL(record.sourceUrl); } catch { throw new Error(`Invalid source URL in ${record.id}.`); }
  if (url.protocol !== 'https:' || !allowedHosts.has(url.hostname) || url.username || url.password) throw new Error(`Source host is not allowlisted for ${record.id}.`);
  if (record.publicationDate != null && !/^\d{4}(?:-\d{2}(?:-\d{2})?)?$/.test(record.publicationDate)) throw new Error(`Invalid publication date in ${record.id}.`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(record.checkedAt)) throw new Error(`Invalid checkedAt date in ${record.id}.`);
  if (!['high', 'medium', 'low'].includes(record.confidence)) throw new Error(`External record ${record.id} must have confidence=high, medium, or low.`);
  if (!['PUBLISHED', 'REVIEW', 'RETIRED'].includes(record.verification)) throw new Error(`${record.id} must have verification=PUBLISHED, REVIEW, or RETIRED.`);
  if (record.verification === 'RETIRED' && (!record.retiredAt || !record.retiredBy || !record.retirementReason)) throw new Error(`Retired record ${record.id} must include retirement metadata.`);
}

export function validateExternalIndex(index) {
  if (index?.schemaVersion !== 2 || !Array.isArray(index.records)) throw new Error('Unsupported external knowledge index schema.');
  const ids = new Set();
  const texts = new Set();
  for (const record of index.records) {
    validateRecord(record);
    if (ids.has(record.id)) throw new Error(`Duplicate record ID: ${record.id}`);
    ids.add(record.id);
    if (record.contentHash !== sha(record.text)) throw new Error(`Content hash mismatch: ${record.id}`);
    if (record.verification !== 'RETIRED') {
      const key = normalized(record.text);
      if (texts.has(key)) throw new Error(`Duplicate normalized factual text: ${record.id}`);
      texts.add(key);
    }
  }
  return index;
}

function reviewerMetadata(reviewer, reason) {
  const reviewerName = String(reviewer || '').trim();
  const reviewReason = String(reason || '').trim();
  if (!reviewerName || reviewerName.length > 120) throw new Error('Supply --reviewer as an accountable reviewer or role (max 120 characters).');
  if (!reviewReason || reviewReason.length > 500) throw new Error('Supply --reason (1–500 characters).');
  return { reviewerName, reviewReason };
}

function retireInIndex(index, record, { reviewerName, reviewReason }, retiredAt) {
  if (record.verification !== 'PUBLISHED') throw new Error(`Only a published record can be retired: ${record.id}`);
  record.verification = 'RETIRED';
  record.retiredAt = retiredAt;
  record.retiredBy = reviewerName;
  record.retirementReason = reviewReason;
  return record;
}

export function retireExternalRecord(index, { id, reviewer, reason, retiredAt = new Date().toISOString() } = {}) {
  validateExternalIndex(index);
  const record = index.records.find((item) => item.id === id);
  if (!record) throw new Error(`External record not found: ${id}`);
  retireInIndex(index, record, reviewerMetadata(reviewer, reason), retiredAt);
  index.generatedAt = retiredAt;
  return record;
}

export function publishExternalRecord(index, { id, reviewer, reason, reviewedAt = new Date().toISOString() } = {}) {
  validateExternalIndex(index);
  const record = index.records.find((item) => item.id === id);
  if (!record) throw new Error(`External record not found: ${id}`);
  if (record.verification !== 'REVIEW') throw new Error(`Only a record awaiting review can be published: ${id}`);
  const metadata = reviewerMetadata(reviewer, reason);
  if (record.supersedes) {
    const prior = index.records.find((item) => item.id === record.supersedes);
    if (!prior) throw new Error(`Superseded record not found: ${record.supersedes}`);
    retireInIndex(index, prior, { ...metadata, reviewReason: `Superseded by ${id}: ${metadata.reviewReason}` }, reviewedAt);
  }
  record.verification = 'PUBLISHED';
  record.reviewedAt = reviewedAt;
  record.reviewedBy = metadata.reviewerName;
  record.reviewNote = metadata.reviewReason;
  index.generatedAt = reviewedAt;
  validateExternalIndex(index);
  return record;
}

async function load() {
  return validateExternalIndex(JSON.parse(await readFile(indexPath, 'utf8')));
}

async function save(index) {
  validateExternalIndex(index);
  const tempPath = `${indexPath}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(tempPath, `${JSON.stringify(index, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
    await rename(tempPath, indexPath);
  } finally {
    await unlink(tempPath).catch(() => {});
  }
}

async function check() {
  const index = await load();
  const texts = new Map();
  const sources = new Map();
  const warnings = [];
  for (const record of index.records) {
    const textKey = normalized(record.text);
    if (record.verification !== 'RETIRED') {
      if (texts.has(textKey)) warnings.push(`Near duplicate factual text: ${texts.get(textKey)} and ${record.id}`);
      texts.set(textKey, record.id);
      const sourceKey = `${record.sourceUrl}\n${textKey}`;
      if (sources.has(sourceKey)) warnings.push(`Duplicate source claim: ${sources.get(sourceKey)} and ${record.id}`);
      sources.set(sourceKey, record.id);
    }
    if (record.verification === 'REVIEW') warnings.push(`Not published (review required): ${record.id}`);
    if (record.verification === 'RETIRED') warnings.push(`Retired (excluded from retrieval): ${record.id} — ${record.retirementReason}`);
    if (record.verification === 'PUBLISHED') {
      const checked = new Date(`${record.checkedAt}T00:00:00Z`);
      if ((Date.now() - checked.getTime()) > 365 * 24 * 60 * 60 * 1000) warnings.push(`Source review due (>365 days since checked): ${record.id}`);
    }
  }
  process.stdout.write(`External knowledge: ${index.records.length} records; ${index.records.filter((record) => record.verification === 'PUBLISHED').length} published, ${index.records.filter((record) => record.verification === 'REVIEW').length} awaiting review, ${index.records.filter((record) => record.verification === 'RETIRED').length} retired.\n`);
  warnings.forEach((warning) => process.stdout.write(`REVIEW: ${warning}\n`));
  return warnings.some((warning) => warning.startsWith('Near duplicate') || warning.startsWith('Duplicate source claim')) ? 1 : 0;
}

async function stage(inputPath) {
  const payload = JSON.parse(await readFile(resolve(inputPath), 'utf8'));
  const candidates = Array.isArray(payload) ? payload : [payload];
  if (!candidates.length) throw new Error('No external knowledge records were supplied.');
  const index = await load();
  const ids = new Set(index.records.map((record) => record.id));
  const texts = new Set(index.records.filter((record) => record.verification !== 'RETIRED').map((record) => normalized(record.text)));
  const staged = [];
  for (const candidate of candidates) {
    const record = { ...candidate, verification: 'REVIEW' };
    delete record.reviewedAt; delete record.reviewedBy; delete record.reviewNote;
    delete record.retiredAt; delete record.retiredBy; delete record.retirementReason;
    validateRecord(record);
    if (ids.has(record.id)) throw new Error(`Record ID already exists: ${record.id}`);
    if (texts.has(normalized(record.text))) throw new Error(`Duplicate factual text: ${record.id}`);
    record.contentHash = sha(record.text);
    ids.add(record.id); texts.add(normalized(record.text)); staged.push(record);
  }
  index.records.push(...staged);
  index.generatedAt = new Date().toISOString();
  await save(index);
  process.stdout.write(`Staged ${staged.length} record(s) as REVIEW. They remain unavailable to retrieval until an accountable reviewer publishes them.\n`);
}

function option(args, name) {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
}

async function main(args) {
  const [command, ...rest] = args;
  if (command === 'check') process.exitCode = await check();
  else if (command === 'stage' && option(rest, 'input')) await stage(option(rest, 'input'));
  else if (command === 'publish') {
    const index = await load();
    const record = publishExternalRecord(index, { id: option(rest, 'id'), reviewer: option(rest, 'reviewer'), reason: option(rest, 'reason') });
    await save(index);
    process.stdout.write(`Published ${record.id} after review.\n`);
  } else if (command === 'retire') {
    const index = await load();
    const record = retireExternalRecord(index, { id: option(rest, 'id'), reviewer: option(rest, 'reviewer'), reason: option(rest, 'reason') });
    await save(index);
    process.stdout.write(`Retired ${record.id}; its provenance remains recorded but retrieval will exclude it.\n`);
  } else {
    process.stderr.write('Usage:\n  node scripts/manage-assistant-external-kb.mjs check\n  node scripts/manage-assistant-external-kb.mjs stage --input <record.json>\n  node scripts/manage-assistant-external-kb.mjs publish --id <id> --reviewer <role> --reason <reason>\n  node scripts/manage-assistant-external-kb.mjs retire --id <id> --reviewer <role> --reason <reason>\n');
    process.exitCode = 2;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`External knowledge workflow failed: ${error.message}\n`);
    process.exitCode = 1;
  });
}
