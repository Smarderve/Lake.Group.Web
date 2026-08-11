import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';

/**
 * Phase 6 — media usage listing. Mounted at /admin/media AFTER the governed
 * media router, so only the deeper path is handled here:
 *
 *   GET /admin/media/:id/usages — which entities use this media item
 *
 * Usage rows are written server-side by the media-bearing entities (see
 * lib/media-usage.js); this endpoint is read-only admin introspection.
 */
export function mediaUsageRouter({ db }) {
  const router = Router();
  const auth = requireAuth(db);

  router.get('/:id/usages', auth, async (req, res, next) => {
    try {
      const media = await db.media.findFirst({ where: { id: req.params.id } });
      if (!media) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Media item not found' } });
      }
      const usages = await db.mediaUsage.findMany({ where: { mediaId: req.params.id } });
      res.json({ usages });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
