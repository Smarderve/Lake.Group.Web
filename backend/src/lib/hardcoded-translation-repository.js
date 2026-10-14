import { createHash } from 'node:crypto';
import { TARGET_LANGUAGES, validateTranslationResult } from './cms-v2-translation.js';

const manifestDigest = (manifest) => createHash('sha256').update(JSON.stringify(manifest.entries.map(({ id, sourceHash }) => [id, sourceHash]))).digest('hex');

/** Queue adapter exposes the same worker contract as CMS V2. */
export function createHardcodedTranslationRepository(db) {
  const jobs = db.hardcodedTranslationJob;
  return {
    syncHardcodedTranslationManifest: async (manifest) => {
      if (manifest?.manifestType !== 'lake-group-hardcoded-translation-jobs' || manifest.schemaVersion !== 1 || !Array.isArray(manifest.entries)
        || JSON.stringify([...(manifest.targetLanguages || [])].sort()) !== JSON.stringify([...TARGET_LANGUAGES].sort())) {
        throw Object.assign(new Error('Unsupported hardcoded translation manifest.'), { code: 'INVALID_TRANSLATION_MANIFEST' });
      }
      const manifestVersion = manifestDigest(manifest);
      return db.$transaction(async (tx) => {
        const model = tx.hardcodedTranslationJob;
        const rows = manifest.entries.flatMap((entry) => TARGET_LANGUAGES.map((targetLanguage) => ({
          id: `hc_${createHash('sha256').update(`${entry.id}\0${targetLanguage}`).digest('hex').slice(0, 40)}`,
          sourceFile: entry.file, page: entry.page, applicablePages: entry.applicablePages || (entry.page ? [entry.page] : []),
          contextKey: `${entry.id}:${entry.context}`, classification: entry.classification, targetSelector: entry.targetSelector,
          targetAttribute: entry.targetAttribute, renderMode: entry.renderMode || 'source-only', targetLanguage,
          sourceText: entry.source, sourceHash: entry.sourceHash, manifestVersion,
        })));
        const memories = new Map();
        for (let offset = 0; offset < rows.length; offset += 300) {
          const found = await tx.hardcodedTranslationMemoryEntry.findMany({ where: { OR: rows.slice(offset, offset + 300).map(({ targetLanguage, sourceHash, contextKey }) => ({ targetLanguage, sourceHash, contextKey })) } });
          found.forEach((entry) => memories.set(`${entry.targetLanguage}\0${entry.sourceHash}\0${entry.contextKey}`, entry));
        }
        const rowsWithMemory = rows.map((row) => {
          const memory = memories.get(`${row.targetLanguage}\0${row.sourceHash}\0${row.contextKey}`);
          return memory ? { ...row, translation: memory.translation, modelVersion: memory.modelVersion, status: 'APPROVED' } : row;
        });
        const existing = new Map();
        for (let offset = 0; offset < rowsWithMemory.length; offset += 1000) {
          const found = await model.findMany({ where: { id: { in: rowsWithMemory.slice(offset, offset + 1000).map(({ id }) => id) } }, select: { id: true, sourceHash: true, status: true } });
          found.forEach((row) => existing.set(row.id, row));
        }
        const created = await model.createMany({ data: rowsWithMemory.filter((row) => !existing.has(row.id)), skipDuplicates: true });
        const changedRows = rowsWithMemory.filter((row) => existing.has(row.id) && existing.get(row.id).sourceHash !== row.sourceHash);
        for (const row of changedRows) await model.update({ where: { id: row.id }, data: { ...row, translation: row.translation ?? null, modelVersion: row.modelVersion ?? null, glossaryVersion: null, status: row.status || 'WAITING_FOR_ENGINE', attempts: 0, lastError: null, leaseExpiresAt: null } });
        for (const row of rowsWithMemory) {
          const memory = memories.get(`${row.targetLanguage}\0${row.sourceHash}\0${row.contextKey}`);
          if (memory && existing.has(row.id) && existing.get(row.id).sourceHash === row.sourceHash && existing.get(row.id).status !== 'APPROVED') {
            await model.update({ where: { id: row.id }, data: { translation: memory.translation, modelVersion: memory.modelVersion, status: 'APPROVED', lastError: null, leaseExpiresAt: null } });
          }
        }
        for (let offset = 0; offset < rows.length; offset += 1000) await model.updateMany({ where: { id: { in: rows.slice(offset, offset + 1000).map(({ id }) => id) } }, data: { manifestVersion } });
        await model.updateMany({ where: { manifestVersion: { not: manifestVersion }, status: { not: 'OUTDATED' } }, data: { status: 'OUTDATED', leaseExpiresAt: null } });
        return { manifestVersion, created: created.count, changed: changedRows.length, unchanged: rows.length - created.count - changedRows.length };
      }, { timeout: 300000 });
    },
    recoverExpiredTranslationJobs: async ({ now = new Date(), engineAvailable = false } = {}) => {
      const expired = await jobs.updateMany({ where: { status: 'TRANSLATING', leaseExpiresAt: { lte: now } }, data: { status: engineAvailable ? 'QUEUED' : 'WAITING_FOR_ENGINE', leaseExpiresAt: null } });
      let retried = 0;
      for (let attempts = 1; attempts < 5; attempts += 1) {
        const retry = await jobs.updateMany({ where: { status: 'FAILED', attempts, updatedAt: { lte: new Date(now.getTime() - 30000 * (2 ** (attempts - 1))) } }, data: { status: engineAvailable ? 'QUEUED' : 'WAITING_FOR_ENGINE', lastError: null, leaseExpiresAt: null } });
        retried += retry.count;
      }
      return expired.count + retried;
    },
    queueWaitingTranslationJobs: () => jobs.updateMany({ where: { status: 'WAITING_FOR_ENGINE' }, data: { status: 'QUEUED' } }).then(({ count }) => count),
    listTranslationJobs: ({ status, limit = 1 } = {}) => jobs.findMany({ where: { status }, orderBy: { createdAt: 'asc' }, take: limit }),
    claimTranslationJob: async (id, leaseMs = 120000) => {
      const result = await jobs.updateMany({ where: { id, status: 'QUEUED' }, data: { status: 'TRANSLATING', attempts: { increment: 1 }, leaseExpiresAt: new Date(Date.now() + leaseMs) } });
      return result.count ? jobs.findUnique({ where: { id } }) : null;
    },
    isTranslationJobCurrent: async (id) => (await jobs.findUnique({ where: { id }, select: { status: true } }))?.status === 'TRANSLATING',
    listHardcodedTranslationJobs: ({ targetLanguage, status, limit = 200 } = {}) => jobs.findMany({ where: { ...(targetLanguage ? { targetLanguage } : {}), ...(status ? { status } : {}) }, orderBy: { createdAt: 'asc' }, take: Math.min(Math.max(Number(limit) || 200, 1), 1000) }),
    retryHardcodedTranslationJob: async (id) => {
      const result = await jobs.updateMany({ where: { id, status: { in: ['FAILED', 'VALIDATION_FAILED'] } }, data: { status: 'WAITING_FOR_ENGINE', lastError: null, leaseExpiresAt: null } });
      if (!result.count) throw Object.assign(new Error('Translation job is not retryable.'), { code: 'TRANSLATION_JOB_NOT_RETRYABLE' });
      return jobs.findUnique({ where: { id } });
    },
    finishTranslationJob: async ({ id, translation, modelVersion = null, glossaryVersion = null, validationErrors = [], stillCurrent = true, failure = null }) => {
      const status = failure ? 'FAILED' : !stillCurrent ? 'OUTDATED' : validationErrors.length ? 'VALIDATION_FAILED' : 'NEEDS_REVIEW';
      const result = await jobs.updateMany({ where: { id, status: 'TRANSLATING' }, data: { status, translation: failure ? null : translation, modelVersion, glossaryVersion, lastError: failure ? 'TRANSLATION_PROVIDER_FAILED' : validationErrors.join(',') || null, leaseExpiresAt: null } });
      if (!result.count) throw Object.assign(new Error('Translation job lease is no longer owned.'), { code: 'TRANSLATION_JOB_LEASE_LOST' });
      return jobs.findUnique({ where: { id } });
    },
    approveTranslation: async (id, translation, approvedById) => db.$transaction(async (tx) => {
      const job = await tx.hardcodedTranslationJob.findUnique({ where: { id } });
      if (!job || job.status !== 'NEEDS_REVIEW') throw Object.assign(new Error('Only reviewed hardcoded translations can be approved.'), { code: 'TRANSLATION_JOB_NOT_REVIEWABLE' });
      const validation = validateTranslationResult(job, translation);
      if (!validation.valid) throw Object.assign(new Error('Translation failed validation.'), { code: 'TRANSLATION_VALIDATION_FAILED', details: validation.errors });
      const result = await tx.hardcodedTranslationJob.updateMany({ where: { id, sourceHash: job.sourceHash, status: 'NEEDS_REVIEW' }, data: { translation, status: 'APPROVED', lastError: null } });
      if (!result.count) throw Object.assign(new Error('Translation job changed during approval.'), { code: 'REVISION_CONFLICT' });
      await tx.hardcodedTranslationMemoryEntry.upsert({
        where: { targetLanguage_sourceHash_contextKey: { targetLanguage: job.targetLanguage, sourceHash: job.sourceHash, contextKey: job.contextKey } },
        create: { targetLanguage: job.targetLanguage, sourceText: job.sourceText, sourceHash: job.sourceHash, contextKey: job.contextKey, translation, modelVersion: job.modelVersion, approvedById },
        update: { translation, modelVersion: job.modelVersion, approvedById, approvedAt: new Date() },
      });
      return tx.hardcodedTranslationJob.findUnique({ where: { id } });
    }),
  };
}
