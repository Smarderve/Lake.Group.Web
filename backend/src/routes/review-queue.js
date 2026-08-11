import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { GOVERNED_ENTITIES, labelOf } from '../lib/governed-registry.js';
import { promoteDueScheduled } from '../lib/publisher.js';

/**
 * Phase 7 — review queue (GET /admin/review-queue, REVIEWER+).
 *
 * One place to see every governed entity that needs attention across ALL
 * domains (registry, CMS, map, media, metrics):
 *   - `inReview`              — DRAFT → IN_REVIEW submissions awaiting approval
 *   - `approvedAwaitingPublish` — APPROVED items ready to go live
 *   - `scheduled`             — upcoming scheduled publications (due ones are
 *                               promoted first, so this is always current)
 *
 * The queue is the pull side of the workflow; notifications are the push
 * side (Phase 7).
 */
export function reviewQueueRouter({ db }) {
  const router = Router();
  const auth = requireAuth(db);
  const reviewer = requireRole('REVIEWER', 'SUPER_ADMIN');

  router.get('/', auth, reviewer, async (req, res, next) => {
    try {
      // Promote anything whose time has arrived before reporting the queue.
      await promoteDueScheduled(db, req.log);

      const inReview = [];
      const approved = [];
      for (const [route, config] of Object.entries(GOVERNED_ENTITIES)) {
        const rows = await db[config.entity].findMany({ where: { status: 'IN_REVIEW' } });
        for (const row of rows) {
          const lastVersion = await db[config.versionEntity].findFirst({
            where: { [config.fkField]: row.id, status: 'IN_REVIEW' },
            orderBy: { createdAt: 'desc' },
          });
          inReview.push({
            entityType: config.entity,
            route,
            id: row.id,
            label: labelOf(config, row),
            submitterId: lastVersion?.changedBy ?? null,
            submittedAt: lastVersion?.createdAt ?? null,
          });
        }
        const approvedRows = await db[config.entity].findMany({ where: { status: 'APPROVED' } });
        for (const row of approvedRows) {
          approved.push({ entityType: config.entity, route, id: row.id, label: labelOf(config, row) });
        }
      }

      // Metrics are governed too, on their own workflow.
      const metricRows = await db.metric.findMany({ where: { status: 'IN_REVIEW' } });
      for (const m of metricRows) {
        const lastVersion = await db.metricVersion.findFirst({
          where: { metricId: m.id, status: 'IN_REVIEW' },
          orderBy: { createdAt: 'desc' },
        });
        inReview.push({
          entityType: 'metric',
          route: 'metrics',
          id: m.id,
          label: m.label,
          submitterId: lastVersion?.changedBy ?? null,
          submittedAt: lastVersion?.createdAt ?? null,
        });
      }
      const approvedMetrics = await db.metric.findMany({ where: { status: 'APPROVED' } });
      for (const m of approvedMetrics) {
        approved.push({ entityType: 'metric', route: 'metrics', id: m.id, label: m.label });
      }

      const schedules = await db.publishSchedule.findMany({
        where: { status: 'PENDING' },
        orderBy: { publishAt: 'asc' },
      });

      // Resolve submitter emails (small team — fetch once, map in memory so
      // the fake DB and real Prisma behave identically).
      const users = await db.user.findMany({});
      const emailById = new Map(users.map((u) => [u.id, u.email]));
      const withEmail = (item) => ({ ...item, submitterEmail: emailById.get(item.submitterId) ?? null });

      res.json({
        inReview: inReview.map(withEmail),
        approvedAwaitingPublish: approved,
        scheduled: schedules.map((s) => ({
          id: s.id,
          entityType: s.entityType,
          entityId: s.entityId,
          publishAt: s.publishAt,
          createdBy: s.createdBy,
        })),
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
