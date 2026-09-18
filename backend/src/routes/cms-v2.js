import { Router } from 'express';
import { requireAuth, requireCmsAdmin, requireRecentAuth } from '../middleware/auth.js';
import { CMS_V2_PAGE_DEFINITIONS } from '../lib/cms-v2-content.js';

export function cmsV2Router({ db, service, recentAuthWindowMs } = {}) {
  const router = Router();
  const guard = [requireAuth(db), requireCmsAdmin()];
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
  router.put('/content/:documentKey/draft', ...guard, async (req, res, next) => {
    try { res.status(201).json({ revision: await service.saveDraft({ key: req.params.documentKey, actorId: req.user.id, ...req.body }) }); } catch (error) { next(error); }
  });
  router.get('/content/:documentKey/versions', ...guard, async (req, res, next) => {
    try { res.json({ revisions: await service.listRevisions(req.params.documentKey) }); } catch (error) { next(error); }
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
