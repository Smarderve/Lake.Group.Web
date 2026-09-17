import { Router } from 'express';
import { requireAuth, requireCmsAdmin, requireRecentAuth } from '../middleware/auth.js';

export function cmsV2Router({ db, service, recentAuthWindowMs } = {}) {
  const router = Router();
  const guard = [requireAuth(db), requireCmsAdmin()];
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
