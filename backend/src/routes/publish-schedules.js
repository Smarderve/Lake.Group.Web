import { Router } from 'express';
import { requireAuth, requireRole, requireRecentAuth } from '../middleware/auth.js';
import { writeAudit } from '../lib/audit.js';
import { GOVERNED_BY_MODEL, labelOf } from '../lib/governed-registry.js';

/**
 * Phase 7 — scheduled publications management.
 *
 *   GET  /admin/publish-schedules          — all pending schedules (auth)
 *   POST /admin/publish-schedules/:id/cancel — cancel one (SUPER_ADMIN +
 *        recent auth; the entity stays APPROVED, a human publishes or
 *        reschedules it)
 */
export function publishSchedulesRouter({ db, recentAuthWindowMs }) {
  const router = Router();
  const auth = requireAuth(db);
  const recent = requireRecentAuth(recentAuthWindowMs);
  const superAdmin = requireRole('SUPER_ADMIN');

  router.get('/', auth, async (req, res, next) => {
    try {
      const schedules = await db.publishSchedule.findMany({
        where: { status: 'PENDING' },
        orderBy: { publishAt: 'asc' },
      });
      const rows = [];
      for (const s of schedules) {
        const config = GOVERNED_BY_MODEL.get(s.entityType);
        const entity = config ? await db[config.entity].findFirst({ where: { id: s.entityId } }) : null;
        rows.push({
          id: s.id,
          entityType: s.entityType,
          entityId: s.entityId,
          publishAt: s.publishAt,
          label: entity ? labelOf(config, entity) : s.entityId,
          entityStatus: entity?.status ?? null,
        });
      }
      res.json({ schedules: rows });
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/cancel', auth, superAdmin, recent, async (req, res, next) => {
    try {
      const schedule = await db.publishSchedule.findFirst({ where: { id: req.params.id } });
      if (!schedule) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Schedule not found' } });
      }
      if (schedule.status !== 'PENDING') {
        return res.status(409).json({ error: { code: 'INVALID_STATE', message: `Schedule is ${schedule.status}, not PENDING` } });
      }
      const updated = await db.publishSchedule.update({
        where: { id: schedule.id },
        data: { status: 'CANCELLED' },
      });
      await writeAudit(db, {
        actorId: req.user?.id ?? null,
        action: 'SCHEDULE_CANCELLED',
        resource: `admin/publish-schedules/${schedule.id}/cancel`,
        ip: req.ip ?? null,
        metadata: { scheduleId: schedule.id, entityType: schedule.entityType, entityId: schedule.entityId, publishAt: schedule.publishAt },
      }, req.log);
      res.json({ schedule: updated });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
