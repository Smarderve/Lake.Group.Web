import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';

const ACTIONS = ['PUBLISHED', 'UNPUBLISHED', 'ROLLED_BACK'];

export function publicReleasesRouter({ db }) {
  const router = Router();
  router.get('/', requireAuth(db), async (req, res, next) => {
    try {
      const events = await db.publicationEvent.findMany({
        where: { action: { in: ACTIONS } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      res.json({
        publicReleases: events.map((event) => {
          const release = event.metadata?.publicRelease ?? {};
          return {
            id: event.id,
            entityType: event.entityType,
            entityId: event.entityId,
            action: event.action,
            createdAt: event.createdAt,
            status: release.status ?? 'PENDING',
            attempts: release.attempts ?? 0,
            requestId: release.requestId ?? null,
            lastAttemptAt: release.lastAttemptAt ?? null,
            triggeredAt: release.triggeredAt ?? null,
            nextAttemptAt: release.nextAttemptAt ?? null,
            lastError: release.lastError ?? null,
          };
        }),
      });
    } catch (err) {
      next(err);
    }
  });
  return router;
}
