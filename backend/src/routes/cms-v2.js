import { Router } from 'express';
import { requireAuth, requireCmsAdmin, requireRecentAuth } from '../middleware/auth.js';
import { CMS_V2_PAGE_DEFINITIONS } from '../lib/cms-v2-content.js';

export function cmsV2Router({ db, service, recentAuthWindowMs } = {}) {
  const router = Router();
  const guard = [requireAuth(db), requireCmsAdmin()];
  router.get('/translations/jobs', ...guard, async (req, res, next) => {
    try {
      const { documentKey, revisionId, targetLanguage, status, limit } = req.query;
      res.json({ jobs: await service.listTranslationJobs({ documentKey, revisionId, targetLanguage, status, limit }) });
    } catch (error) { next(error); }
  });
  router.post('/translations/jobs/:jobId/retry', ...guard, async (req, res, next) => {
    try { res.status(202).json({ job: await service.retryTranslationJob({ id: req.params.jobId, actorId: req.user.id }) }); } catch (error) { next(error); }
  });
  router.post('/translations/jobs/:jobId/approve', ...guard, requireRecentAuth(recentAuthWindowMs), async (req, res, next) => {
    try {
      if (typeof req.body?.translation !== 'string' || !req.body.translation.trim()) return res.status(400).json({ error: { code: 'INVALID_TRANSLATION', message: 'A non-empty corrected translation is required.' } });
      res.json({ job: await service.approveTranslationJob({ id: req.params.jobId, translation: req.body.translation.trim(), approvedById: req.user.id }) });
    } catch (error) { next(error); }
  });
  router.get('/page-source/:documentKey', ...guard, async (req, res, next) => {
    try { res.json(await service.readPageSource(req.params.documentKey)); } catch (error) { next(error); }
  });
  router.get('/pages', ...guard, async (_req, res, next) => {
    try {
      const pages = await Promise.all(CMS_V2_PAGE_DEFINITIONS.map(async (page) => {
        const document = await service.readDocument(page.key);
        return {
          ...page,
          draftRevisionId: document.currentDraftRevisionId ?? null,
          publishedRevisionId: document.currentPublishedRevisionId ?? null,
          updatedAt: document.updatedAt ?? null,
          title: document.currentDraftRevision?.data?.seo?.title ?? page.label,
        };
      }));
      res.json({ pages });
    } catch (error) { next(error); }
  });
  router.get('/content/:documentKey', ...guard, async (req, res, next) => {
    try { res.json({ document: await service.readDocument(req.params.documentKey) }); } catch (error) { next(error); }
  });
  router.post('/global-data/transaction', ...guard, async (req, res, next) => {
    try { res.status(201).json({ revisions: await service.saveDraftBatch({ actorId: req.user.id, documents: req.body.documents }) }); } catch (error) { next(error); }
  });
  router.put('/content/:documentKey/draft', ...guard, async (req, res, next) => {
    try { res.status(201).json({ revision: await service.saveDraft({ key: req.params.documentKey, actorId: req.user.id, ...req.body }) }); } catch (error) { next(error); }
  });
  router.get('/content/:documentKey/versions', ...guard, async (req, res, next) => {
    try { res.json({ revisions: await service.listRevisions(req.params.documentKey) }); } catch (error) { next(error); }
  });
  router.get('/content/:documentKey/revisions/:revisionId/review', ...guard, async (req, res, next) => {
    try { res.json({ review: await service.reviewRelease({ key: req.params.documentKey, revisionId: req.params.revisionId }) }); } catch (error) { next(error); }
  });
  router.post('/content/:documentKey/revisions/:revisionId/restore', ...guard, requireRecentAuth(recentAuthWindowMs), async (req, res, next) => {
    try { res.status(201).json({ revision: await service.restoreRevision({ key: req.params.documentKey, revisionId: req.params.revisionId, actorId: req.user.id }) }); } catch (error) { next(error); }
  });
  router.post('/releases', ...guard, async (req, res, next) => {
    try { res.status(201).json({ release: await service.publish({ actorId: req.user.id, ...req.body }) }); } catch (error) { next(error); }
  });
  router.get('/releases', ...guard, async (req, res, next) => {
    try { res.json({ releases: await service.listReleases() }); } catch (error) { next(error); }
  });
  router.post('/releases/:releaseId/restore', ...guard, requireRecentAuth(recentAuthWindowMs), async (req, res, next) => {
    try { res.status(201).json({ release: await service.restore({ releaseId: req.params.releaseId, actorId: req.user.id }) }); } catch (error) { next(error); }
  });
  return router;
}
