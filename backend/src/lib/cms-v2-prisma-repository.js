/** Prisma adapter kept separate from CMS V2 domain/release logic. */
import { extractCmsTranslationFields, TARGET_LANGUAGES, validateTranslationResult } from './cms-v2-translation.js';
export function createCmsV2PrismaRepository(db) {
  if (!db) throw new TypeError('Prisma database is required');
  async function invalidateChangedJobs(tx, revisionId, changedPaths) {
    if (!revisionId || !changedPaths.length) return;
    await tx.cmsTranslationJob.updateMany({
      where: { revisionId, fieldPath: { in: changedPaths }, status: { in: ['WAITING_FOR_ENGINE', 'QUEUED', 'TRANSLATING', 'MACHINE_TRANSLATED', 'VALIDATION_FAILED', 'NEEDS_REVIEW', 'APPROVED'] } },
      data: { status: 'OUTDATED', leaseExpiresAt: null, updatedAt: new Date() },
    });
  }
  async function createJobs(tx, jobs) {
    if (!jobs.length) return;
    const approvedMemory = await tx.cmsTranslationMemoryEntry.findMany({
      where: { OR: jobs.map(({ targetLanguage, sourceHash, contextKey }) => ({ targetLanguage, sourceHash, contextKey })) },
    });
    const memory = new Map(approvedMemory.map((entry) => [`${entry.targetLanguage}\0${entry.sourceHash}\0${entry.contextKey}`, entry.translation]));
    const rows = jobs.map((job) => {
      const translation = memory.get(`${job.targetLanguage}\0${job.sourceHash}\0${job.contextKey}`);
      return translation ? { ...job, translation, status: 'APPROVED' } : job;
    });
    await tx.cmsTranslationJob.createMany({ data: rows, skipDuplicates: true });
  }
  return {
    async getDocument(key) {
      const row = await db.contentDocument.findUnique({ where: { key }, include: { revisions: { orderBy: { createdAt: 'desc' }, take: 1 } } });
      if (!row) return null;
      const revisionById = async (id) => id ? db.contentRevision.findUnique({ where: { id } }) : null;
      return {
        ...row,
        currentDraftRevision: await revisionById(row.currentDraftRevisionId),
        currentPublishedRevision: await revisionById(row.currentPublishedRevisionId),
      };
    },
    async saveDocument(document) {
      const existing = await db.contentDocument.findUnique({ where: { key: document.key } });
      if (!existing) return db.contentDocument.create({ data: { key: document.key, schemaVersion: document.schemaVersion } });
      return db.contentDocument.update({ where: { key: document.key }, data: { currentDraftRevisionId: document.currentDraftRevisionId ?? existing.currentDraftRevisionId, currentPublishedRevisionId: document.currentPublishedRevisionId ?? existing.currentPublishedRevisionId } });
    },
    async saveRevision(revision) {
      const document = await db.contentDocument.findUnique({ where: { key: revision.key } });
      return db.contentRevision.create({ data: { id: revision.id, documentId: document.id, authorId: revision.actorId, schemaVersion: revision.schemaVersion, data: revision.data, createdAt: new Date(revision.createdAt) } });
    },
    async saveDraftWithTranslationJobs({ document, revision, baseRevisionId, jobs, changedPaths, previousRevisionId }) {
      return db.$transaction(async (tx) => {
        let row = await tx.contentDocument.findUnique({ where: { key: document.key } });
        if ((row?.currentDraftRevisionId ?? null) !== baseRevisionId) throw Object.assign(new Error('The content draft changed before this update.'), { code: 'REVISION_CONFLICT' });
        if (!row) row = await tx.contentDocument.create({ data: { key: document.key, schemaVersion: document.schemaVersion } });
        const created = await tx.contentRevision.create({ data: { id: revision.id, documentId: row.id, authorId: revision.actorId, schemaVersion: revision.schemaVersion, data: revision.data, createdAt: new Date(revision.createdAt) } });
        await tx.contentDocument.update({ where: { id: row.id }, data: { currentDraftRevisionId: revision.id } });
        await invalidateChangedJobs(tx, previousRevisionId, changedPaths);
        await createJobs(tx, jobs);
        return { ...created, key: revision.key };
      });
    },
    async getRevision(id) {
      const revision = await db.contentRevision.findUnique({ where: { id }, include: { document: true } });
      return revision ? { ...revision, key: revision.document.key } : null;
    },
    async listRevisions(key) {
      const document = await db.contentDocument.findUnique({ where: { key } });
      if (!document) return [];
      return db.contentRevision.findMany({ where: { documentId: document.id }, orderBy: { createdAt: 'desc' } });
    },
    async saveRelease(release) {
      const document = await db.contentDocument.findUnique({ where: { key: release.key } });
      return db.cmsRelease.create({ data: {
        id: release.id, integrity: release.integrity, manifest: release.snapshot, publishedById: release.actorId, restoredFromReleaseId: release.restoredFromReleaseId, publishedAt: new Date(release.publishedAt),
        documents: { create: { documentId: document.id, documentRevisionId: release.revisionId } },
      } });
    },
    async listReleases() { return db.cmsRelease.findMany({ orderBy: { publishedAt: 'desc' } }); },
    async saveDraftBatch(entries) {
      return db.$transaction(async (tx) => {
        const prepared = [];
        for (const entry of entries) {
          const document = await tx.contentDocument.findUnique({ where: { key: entry.key } });
          if (!document || (document.currentDraftRevisionId ?? null) !== (entry.baseRevisionId ?? null)) {
            throw Object.assign(new Error(`Draft ${entry.key} changed before this transaction.`), { code: 'REVISION_CONFLICT' });
          }
          prepared.push({ entry, document });
        }
        const revisions = [];
        for (const { entry, document } of prepared) {
          const revision = await tx.contentRevision.create({ data: { id: entry.id, documentId: document.id, authorId: entry.actorId, schemaVersion: entry.schemaVersion, data: entry.data, createdAt: new Date(entry.createdAt) } });
          await tx.contentDocument.update({ where: { id: document.id }, data: { currentDraftRevisionId: revision.id } });
          await invalidateChangedJobs(tx, entry.previousRevisionId, entry.changedPaths ?? []);
          await createJobs(tx, entry.jobs ?? []);
          revisions.push({ ...revision, key: entry.key });
        }
        return revisions;
      });
    },
    async listTranslationJobs(filters = {}) {
      const where = {};
      for (const key of ['documentKey', 'revisionId', 'targetLanguage', 'status']) if (filters[key]) where[key] = filters[key];
      return db.cmsTranslationJob.findMany({ where, orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }], take: Math.min(Math.max(Number(filters.limit) || 200, 1), 1000) });
    },
    async queueWaitingTranslationJobs() {
      const result = await db.cmsTranslationJob.updateMany({ where: { status: 'WAITING_FOR_ENGINE' }, data: { status: 'QUEUED', updatedAt: new Date() } });
      return result.count;
    },
    async retryTranslationJob(id) {
      const result = await db.cmsTranslationJob.updateMany({ where: { id, status: { in: ['FAILED', 'VALIDATION_FAILED'] } }, data: { status: 'WAITING_FOR_ENGINE', lastError: null, leaseExpiresAt: null, updatedAt: new Date() } });
      if (!result.count) throw Object.assign(new Error('Translation job is not retryable.'), { code: 'TRANSLATION_JOB_NOT_RETRYABLE' });
      return db.cmsTranslationJob.findUnique({ where: { id } });
    },
    async claimTranslationJob(id, leaseMs = 120000) {
      const now = new Date();
      const result = await db.cmsTranslationJob.updateMany({ where: { id, status: 'QUEUED' }, data: { status: 'TRANSLATING', attempts: { increment: 1 }, leaseExpiresAt: new Date(now.getTime() + leaseMs), updatedAt: now } });
      return result.count ? db.cmsTranslationJob.findUnique({ where: { id } }) : null;
    },
    async recoverExpiredTranslationJobs({ now = new Date(), engineAvailable = false } = {}) {
      const result = await db.cmsTranslationJob.updateMany({ where: { status: 'TRANSLATING', leaseExpiresAt: { lte: now } }, data: { status: engineAvailable ? 'QUEUED' : 'WAITING_FOR_ENGINE', leaseExpiresAt: null, updatedAt: now } });
      let retried = 0;
      for (let attempts = 1; attempts < 5; attempts += 1) {
        const backoffMs = 30000 * (2 ** (attempts - 1));
        const retry = await db.cmsTranslationJob.updateMany({ where: { status: 'FAILED', attempts, updatedAt: { lte: new Date(now.getTime() - backoffMs) } }, data: { status: engineAvailable ? 'QUEUED' : 'WAITING_FOR_ENGINE', lastError: null, leaseExpiresAt: null, updatedAt: now } });
        retried += retry.count;
      }
      return result.count + retried;
    },
    async finishTranslationJob({ id, translation, modelVersion = null, glossaryVersion = null, validationErrors = [], stillCurrent = true, failure = null }) {
      const status = failure ? 'FAILED' : !stillCurrent ? 'OUTDATED' : validationErrors.length ? 'VALIDATION_FAILED' : 'NEEDS_REVIEW';
      const result = await db.cmsTranslationJob.updateMany({ where: { id, status: 'TRANSLATING' }, data: { status, translation: failure ? null : translation, modelVersion, glossaryVersion, lastError: failure ? String(failure).slice(0, 1000) : validationErrors.join(',').slice(0, 1000) || null, leaseExpiresAt: null, updatedAt: new Date() } });
      if (!result.count) throw Object.assign(new Error('Translation job lease is no longer owned.'), { code: 'TRANSLATION_JOB_LEASE_LOST' });
      return db.cmsTranslationJob.findUnique({ where: { id } });
    },
    async isTranslationJobCurrent(id) {
      const job = await db.cmsTranslationJob.findUnique({ where: { id }, select: { revisionId: true, documentKey: true } });
      if (!job) return false;
      const document = await db.contentDocument.findUnique({ where: { key: job.documentKey }, select: { currentDraftRevisionId: true } });
      return document?.currentDraftRevisionId === job.revisionId;
    },
    async getApprovedTranslations({ documentKey, revisionId, data }) {
      const fields = extractCmsTranslationFields(data);
      if (!fields.length) return {};
      const rows = await db.cmsTranslationMemoryEntry.findMany({ where: { OR: fields.flatMap((field) => TARGET_LANGUAGES.map((targetLanguage) => ({ targetLanguage, sourceHash: field.sourceHash, contextKey: `${documentKey}:${field.fieldPath}` }))) } });
      const translations = {};
      for (const field of fields) for (const targetLanguage of TARGET_LANGUAGES) {
        const memory = rows.find((row) => row.targetLanguage === targetLanguage && row.sourceHash === field.sourceHash && row.contextKey === `${documentKey}:${field.fieldPath}`);
        if (memory) (((translations[targetLanguage] ||= {})[documentKey] ||= {})[field.fieldPath] = memory.translation);
      }
      const approvedJobs = await db.cmsTranslationJob.findMany({ where: { documentKey, revisionId, status: 'APPROVED' } });
      for (const job of approvedJobs) (((translations[job.targetLanguage] ||= {})[documentKey] ||= {})[job.fieldPath] = job.translation);
      return translations;
    },
    async approveTranslationJob({ id, translation, approvedById = null }) {
      return db.$transaction(async (tx) => {
        const job = await tx.cmsTranslationJob.findUnique({ where: { id } });
        if (!job || !['NEEDS_REVIEW', 'MACHINE_TRANSLATED'].includes(job.status)) throw Object.assign(new Error('Only a completed translation awaiting review can be approved.'), { code: 'TRANSLATION_JOB_NOT_REVIEWABLE' });
        const validation = validateTranslationResult(job, translation);
        if (!validation.valid) throw Object.assign(new Error('The corrected translation failed protected-content validation.'), { code: 'TRANSLATION_VALIDATION_FAILED', details: validation.errors });
        const now = new Date();
        await tx.cmsTranslationMemoryEntry.upsert({
          where: { targetLanguage_sourceHash_contextKey: { targetLanguage: job.targetLanguage, sourceHash: job.sourceHash, contextKey: job.contextKey } },
          create: { targetLanguage: job.targetLanguage, sourceText: job.sourceText, sourceHash: job.sourceHash, contextKey: job.contextKey, translation, sourceRevisionId: job.revisionId, modelVersion: job.modelVersion, glossaryVersion: job.glossaryVersion, origin: 'ADMIN_CORRECTION', approvedById, approvedAt: now },
          update: { translation, sourceRevisionId: job.revisionId, modelVersion: job.modelVersion, glossaryVersion: job.glossaryVersion, origin: 'ADMIN_CORRECTION', approvedById, approvedAt: now },
        });
        const result = await tx.cmsTranslationJob.updateMany({ where: { id, status: { in: ['NEEDS_REVIEW', 'MACHINE_TRANSLATED'] } }, data: { translation, status: 'APPROVED', lastError: null, updatedAt: now } });
        if (!result.count) throw Object.assign(new Error('Only a completed translation awaiting review can be approved.'), { code: 'TRANSLATION_JOB_NOT_REVIEWABLE' });
        return tx.cmsTranslationJob.findUnique({ where: { id } });
      });
    },
  };
}
