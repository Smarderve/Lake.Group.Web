import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createDb } from '../src/db.js';
import { TARGET_LANGUAGES } from '../src/lib/cms-v2-translation.js';

const file = resolve(process.argv[2] || '../scripts/.generated/i18n-translation-manifest.json');
const manifest = JSON.parse(await readFile(file, 'utf8'));
if (manifest.manifestType !== 'lake-group-hardcoded-translation-jobs' || manifest.schemaVersion !== 1 || !Array.isArray(manifest.entries)) throw new Error('Unsupported translation manifest.');
if (JSON.stringify([...manifest.targetLanguages].sort()) !== JSON.stringify([...TARGET_LANGUAGES].sort())) throw new Error('Manifest target languages do not match the approved seven-language set.');
const manifestVersion = createHash('sha256').update(JSON.stringify(manifest.entries.map(({ id, sourceHash }) => [id, sourceHash]))).digest('hex');
const db = createDb(process.env.DATABASE_URL);
if (!db) throw new Error('DATABASE_URL is required; no database changes were made.');
try {
  let created = 0; let unchanged = 0; let changed = 0;
  await db.$transaction(async (tx) => {
    const model = tx.hardcodedTranslationJob;
    const rows = manifest.entries.flatMap((entry) => TARGET_LANGUAGES.map((targetLanguage) => {
      const id = `hc_${createHash('sha256').update(`${entry.id}\0${targetLanguage}`).digest('hex').slice(0, 40)}`;
      return { id, sourceFile: entry.file, page: entry.page, applicablePages: entry.applicablePages || (entry.page ? [entry.page] : []), contextKey: `${entry.id}:${entry.context}`, classification: entry.classification, targetSelector: entry.targetSelector, targetAttribute: entry.targetAttribute, renderMode: entry.renderMode || 'source-only', targetLanguage, sourceText: entry.source, sourceHash: entry.sourceHash, manifestVersion };
    }));
    const memories = new Map();
    for (let offset = 0; offset < rows.length; offset += 300) {
      const found = await tx.hardcodedTranslationMemoryEntry.findMany({ where: { OR: rows.slice(offset, offset + 300).map(({ targetLanguage, sourceHash, contextKey }) => ({ targetLanguage, sourceHash, contextKey })) } });
      found.forEach((entry) => memories.set(`${entry.targetLanguage}\0${entry.sourceHash}\0${entry.contextKey}`, entry));
    }
    const withMemory = (row) => {
      const memory = memories.get(`${row.targetLanguage}\0${row.sourceHash}\0${row.contextKey}`);
      return memory ? { ...row, translation: memory.translation, modelVersion: memory.modelVersion, status: 'APPROVED' } : row;
    };
    const rowsWithMemory = rows.map(withMemory);
    const existing = new Map();
    for (let offset = 0; offset < rowsWithMemory.length; offset += 1000) {
      const batch = rowsWithMemory.slice(offset, offset + 1000);
      const found = await model.findMany({ where: { id: { in: batch.map(({ id }) => id) } }, select: { id: true, sourceHash: true, status: true } });
      found.forEach((row) => existing.set(row.id, row));
    }
    const newRows = rowsWithMemory.filter((row) => !existing.has(row.id));
    const changedRows = rowsWithMemory.filter((row) => existing.has(row.id) && existing.get(row.id).sourceHash !== row.sourceHash);
    for (let offset = 0; offset < newRows.length; offset += 1000) created += (await model.createMany({ data: newRows.slice(offset, offset + 1000), skipDuplicates: true })).count;
    for (const row of changedRows) {
      await model.update({ where: { id: row.id }, data: { ...row, translation: row.translation ?? null, modelVersion: row.modelVersion ?? null, glossaryVersion: null, status: row.status || 'WAITING_FOR_ENGINE', attempts: 0, lastError: null, leaseExpiresAt: null } });
    }
    for (const row of rowsWithMemory) {
      const memory = memories.get(`${row.targetLanguage}\0${row.sourceHash}\0${row.contextKey}`);
      if (memory && existing.has(row.id) && existing.get(row.id).sourceHash === row.sourceHash && existing.get(row.id).status !== 'APPROVED') {
        await model.update({ where: { id: row.id }, data: { translation: memory.translation, modelVersion: memory.modelVersion, status: 'APPROVED', lastError: null, leaseExpiresAt: null } });
      }
    }
    changed = changedRows.length;
    unchanged = rows.length - newRows.length - changedRows.length;
    for (let offset = 0; offset < rows.length; offset += 1000) {
      await model.updateMany({ where: { id: { in: rowsWithMemory.slice(offset, offset + 1000).map(({ id }) => id) } }, data: { manifestVersion } });
    }
    // Stale manifest rows are made unavailable to the worker, preserving history.
    await model.updateMany({ where: { manifestVersion: { not: manifestVersion }, status: { not: 'OUTDATED' } }, data: { status: 'OUTDATED', leaseExpiresAt: null } });
  }, { timeout: 300000 });
  console.log(JSON.stringify({ manifestVersion, created, changed, unchanged, targets: TARGET_LANGUAGES, generatedTranslations: 0 }, null, 2));
} finally { await db.$disconnect(); }
