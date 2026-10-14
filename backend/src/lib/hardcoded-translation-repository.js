import { validateTranslationResult } from './cms-v2-translation.js';

/** Queue adapter exposes the same worker contract as CMS V2. */
export function createHardcodedTranslationRepository(db) {
  const jobs = db.hardcodedTranslationJob;
  return {
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
    finishTranslationJob: async ({ id, translation, modelVersion = null, glossaryVersion = null, validationErrors = [], stillCurrent = true, failure = null }) => {
      const status = failure ? 'FAILED' : !stillCurrent ? 'OUTDATED' : validationErrors.length ? 'VALIDATION_FAILED' : 'NEEDS_REVIEW';
      const result = await jobs.updateMany({ where: { id, status: 'TRANSLATING' }, data: { status, translation: failure ? null : translation, modelVersion, glossaryVersion, lastError: failure ? 'TRANSLATION_PROVIDER_FAILED' : validationErrors.join(',') || null, leaseExpiresAt: null } });
      if (!result.count) throw Object.assign(new Error('Translation job lease is no longer owned.'), { code: 'TRANSLATION_JOB_LEASE_LOST' });
      return jobs.findUnique({ where: { id } });
    },
    approveTranslation: async (id, translation) => {
      const job = await jobs.findUnique({ where: { id } });
      if (!job) throw new Error('Translation job not found');
      const validation = validateTranslationResult(job, translation);
      if (!validation.valid) throw Object.assign(new Error('Translation failed validation.'), { details: validation.errors });
      return jobs.update({ where: { id }, data: { translation, status: 'APPROVED', lastError: null } });
    },
  };
}
