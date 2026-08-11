import { Router } from 'express';
import { requireAuth, requireRole, requireRecentAuth } from '../middleware/auth.js';
import { writeAudit } from '../lib/audit.js';
import { milestoneCreateSchema, leadershipEventCreateSchema } from '../validators/cms.js';
import { validationErrorBody } from '../validators/registry.js';

// Child resources (Phase 5): Milestone under Project, LeadershipEvent under
// Leadership. These are simple timestamped events under a parent — NOT
// independently publishable, so no governed workflow, no version rows, no
// reason required. They ARE audited (server-side actor) for the trail.
//
// Mounted at `/admin/:parentRoute`, the factory adds:
//   GET    /:parentId/:childRoute            — list children
//   POST   /:parentId/:childRoute            — create child
//   PATCH  /:parentId/:childRoute/:childId   — update child
//   DELETE /:parentId/:childRoute/:childId   — delete child (children are
//          hard-deletable; only governed entities are archive-only)
export function childRouter({
  db,
  recentAuthWindowMs,
  parentModel,       // 'project' | 'leadership'
  parentLabel,       // human label for 404s
  childModel,        // 'milestone' | 'leadershipEvent'
  childRoute,        // 'milestones' | 'events'
  childLabel,        // 'Milestone' | 'Leadership event'
  schema,            // zod create/update schema
  auditPrefix,       // e.g. 'MILESTONE' / 'LEADERSHIP_EVENT'
  afterWrite,        // optional async (db, child, action, ctx) side effect
}) {
  const router = Router();
  const auth = requireAuth(db);
  const recent = requireRecentAuth(recentAuthWindowMs);
  const editor = requireRole('EDITOR', 'SUPER_ADMIN');

  const ctxOf = (req) => ({ user: req.user, ip: req.ip, logger: req.log });
  const notFound = (res, label = childLabel) =>
    res.status(404).json({ error: { code: 'NOT_FOUND', message: `${label} not found` } });

  const recordAudit = async (ctx, action, child, extra = {}) => {
    await writeAudit(db, {
      actorId: ctx.user?.id ?? null,
      action: `${auditPrefix}_${action}`,
      resource: `admin/${childRoute}/${child.id}`,
      ip: ctx.ip ?? null,
      metadata: { childId: child.id, parentId: child[`${parentModel}Id`], ...extra },
    }, ctx.logger);
  };

  router.get('/:parentId/:childRoute', auth, async (req, res, next) => {
    try {
      const parent = await db[parentModel].findFirst({ where: { id: req.params.parentId } });
      if (!parent) return notFound(res, parentLabel);
      const rows = await db[childModel].findMany({
        where: { [`${parentModel}Id`]: req.params.parentId },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      });
      res.json({ [childRoute]: rows });
    } catch (err) {
      next(err);
    }
  });

  router.post('/:parentId/:childRoute', auth, editor, recent, async (req, res, next) => {
    try {
      const parent = await db[parentModel].findFirst({ where: { id: req.params.parentId } });
      if (!parent) return notFound(res, parentLabel);
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json(validationErrorBody(parsed.error.issues));
      const child = await db[childModel].create({
        data: { ...parsed.data, [`${parentModel}Id`]: req.params.parentId },
      });
      await recordAudit(ctxOf(req), 'CREATED', child);
      if (afterWrite) await afterWrite(db, child, 'CREATED', ctxOf(req));
      res.status(201).json({ [childModel]: child });
    } catch (err) {
      next(err);
    }
  });

  router.patch('/:parentId/:childRoute/:childId', auth, editor, recent, async (req, res, next) => {
    try {
      const child = await db[childModel].findFirst({
        where: { id: req.params.childId, [`${parentModel}Id`]: req.params.parentId },
      });
      if (!child) return notFound(res);
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json(validationErrorBody(parsed.error.issues));
      const updated = await db[childModel].update({
        where: { id: child.id },
        data: parsed.data,
      });
      await recordAudit(ctxOf(req), 'UPDATED', updated);
      if (afterWrite) await afterWrite(db, updated, 'UPDATED', ctxOf(req));
      res.json({ [childModel]: updated });
    } catch (err) {
      next(err);
    }
  });

  router.delete('/:parentId/:childRoute/:childId', auth, editor, recent, async (req, res, next) => {
    try {
      const child = await db[childModel].findFirst({
        where: { id: req.params.childId, [`${parentModel}Id`]: req.params.parentId },
      });
      if (!child) return notFound(res);
      await db[childModel].delete({ where: { id: child.id } });
      await recordAudit(ctxOf(req), 'DELETED', child);
      if (afterWrite) await afterWrite(db, child, 'DELETED', ctxOf(req));
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  return router;
}

/**
 * Leadership timeline effect (Task 5.5): the parent Leadership record's
 * `currentStatus` is DERIVED from the latest event — APPOINTED/PROMOTED/
 * REPLACED → ACTIVE, DEPARTED → DEPARTED. History is never erased.
 */
export async function recomputeLeadershipStatus(db, leadershipId) {
  const events = await db.leadershipEvent.findMany({
    where: { leadershipId },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
  });
  const latest = events[0];
  const currentStatus = latest && latest.eventType === 'DEPARTED' ? 'DEPARTED' : 'ACTIVE';
  await db.leadership.update({ where: { id: leadershipId }, data: { currentStatus } });
}

export function milestoneRouter({ db, recentAuthWindowMs }) {
  return childRouter({
    db,
    recentAuthWindowMs,
    parentModel: 'project',
    parentLabel: 'Project',
    childModel: 'milestone',
    childRoute: 'milestones',
    childLabel: 'Milestone',
    schema: milestoneCreateSchema,
    auditPrefix: 'MILESTONE',
  });
}

export function leadershipEventRouter({ db, recentAuthWindowMs }) {
  return childRouter({
    db,
    recentAuthWindowMs,
    parentModel: 'leadership',
    parentLabel: 'Leader',
    childModel: 'leadershipEvent',
    childRoute: 'events',
    childLabel: 'Leadership event',
    schema: leadershipEventCreateSchema,
    auditPrefix: 'LEADERSHIP_EVENT',
    afterWrite: async (db, child) => recomputeLeadershipStatus(db, child.leadershipId),
  });
}
