import { Router } from 'express';
import { requireAuth, requireRole, requireRecentAuth } from '../middleware/auth.js';
import { transitionSchema, rejectSchema, scheduleSchema, validationErrorBody } from '../validators/registry.js';
import {
  createGoverned,
  editGoverned,
  submitGoverned,
  approveGoverned,
  rejectGoverned,
  publishGoverned,
  scheduleGoverned,
  unpublishGoverned,
  rollbackGoverned,
  archiveGoverned,
  findGoverned,
} from '../lib/governed.js';
import { impactFor } from '../lib/impact.js';

/**
 * Generic governed-entity router (Phase 4). Produces the full admin API for
 * one registry entity from its config (registry-config.js):
 *
 *   GET    /admin/:route            — list (all statuses)
 *   GET    /admin/:route/:id        — one record + its version history
 *   POST   /admin/:route            — create → DRAFT
 *   PATCH  /admin/:route/:id        — edit → DRAFT (reopens the cycle)
 *   POST   /admin/:route/:id/submit — DRAFT → IN_REVIEW
 *   POST   /admin/:route/:id/approve — IN_REVIEW → APPROVED (approver ≠ submitter)
 *   POST   /admin/:route/:id/publish — APPROVED → PUBLISHED
 *   POST   /admin/:route/:id/rollback — restore previous published snapshot
 *   POST   /admin/:route/:id/archive — → ARCHIVED (guard: e.g. Country/Regions)
 *
 * Roles mirror /admin/metrics: edit/submit = EDITOR+; approve/publish =
 * REVIEWER+; rollback/archive = SUPER_ADMIN. Every mutation also requires
 * a session authenticated within the recent-auth window.
 */
export function governedRouter({ db, config, recentAuthWindowMs }) {
  const router = Router();

  const auth = requireAuth(db);
  const recent = requireRecentAuth(recentAuthWindowMs);
  const editor = requireRole('EDITOR', 'SUPER_ADMIN');
  const approver = requireRole('REVIEWER', 'SUPER_ADMIN');
  const superAdmin = requireRole('SUPER_ADMIN');

  const ctxOf = (req) => ({ user: req.user, ip: req.ip, logger: req.log });
  const notFound = (res) =>
    res.status(404).json({ error: { code: 'NOT_FOUND', message: `${config.label} not found` } });

  router.get('/', auth, async (req, res, next) => {
    try {
      const rows = await db[config.entity].findMany({ orderBy: { createdAt: 'desc' } });
      res.json({ [config.route]: rows });
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id', auth, async (req, res, next) => {
    try {
      const row = await findGoverned(db, config, req.params.id);
      if (!row) return notFound(res);
      const versions = await db[config.versionEntity].findMany({
        where: { [config.fkField]: row.id },
        orderBy: { createdAt: 'asc' },
      });
      res.json({ [config.entity]: row, versions });
    } catch (err) {
      next(err);
    }
  });

  router.post('/', auth, editor, recent, async (req, res, next) => {
    try {
      const parsed = config.createSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json(validationErrorBody(parsed.error.issues));
      const { reason, ...data } = parsed.data;
      const row = await createGoverned(db, ctxOf(req), config, data, reason);
      res.status(201).json({ [config.entity]: row });
    } catch (err) {
      next(err);
    }
  });

  router.patch('/:id', auth, editor, recent, async (req, res, next) => {
    try {
      const parsed = config.updateSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json(validationErrorBody(parsed.error.issues));
      const { reason, ...data } = parsed.data;
      const row = await editGoverned(db, ctxOf(req), config, req.params.id, data, reason);
      res.json({ [config.entity]: row });
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/submit', auth, editor, recent, async (req, res, next) => {
    try {
      const parsed = transitionSchema.safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json(validationErrorBody(parsed.error.issues));
      const row = await submitGoverned(db, ctxOf(req), config, req.params.id, parsed.data.reason);
      res.json({ [config.entity]: row });
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/approve', auth, approver, recent, async (req, res, next) => {
    try {
      const parsed = transitionSchema.safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json(validationErrorBody(parsed.error.issues));
      const row = await approveGoverned(db, ctxOf(req), config, req.params.id, parsed.data.reason);
      res.json({ [config.entity]: row });
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/publish', auth, approver, recent, async (req, res, next) => {
    try {
      const parsed = transitionSchema.safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json(validationErrorBody(parsed.error.issues));
      const row = await publishGoverned(db, ctxOf(req), config, req.params.id, parsed.data.reason);
      res.json({ [config.entity]: row });
    } catch (err) {
      next(err);
    }
  });

  // Phase 7 — reject: IN_REVIEW → DRAFT with a required reason (reviewer).
  router.post('/:id/reject', auth, approver, recent, async (req, res, next) => {
    try {
      const parsed = rejectSchema.safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json(validationErrorBody(parsed.error.issues));
      const row = await rejectGoverned(db, ctxOf(req), config, req.params.id, parsed.data.reason);
      res.json({ [config.entity]: row });
    } catch (err) {
      next(err);
    }
  });

  // Phase 7 — schedule: plan a future publication for an APPROVED record.
  router.post('/:id/schedule', auth, editor, recent, async (req, res, next) => {
    try {
      const parsed = scheduleSchema.safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json(validationErrorBody(parsed.error.issues));
      const row = await scheduleGoverned(db, ctxOf(req), config, req.params.id, parsed.data.publishAt, parsed.data.reason);
      res.json({ [config.entity]: row });
    } catch (err) {
      next(err);
    }
  });

  // Phase 7 — impact analysis: current vs pending diff + dependent entities.
  router.get('/:id/impact', auth, editor, async (req, res, next) => {
    try {
      const row = await findGoverned(db, config, req.params.id);
      if (!row) return notFound(res);
      res.json(await impactFor(db, config, row));
    } catch (err) {
      next(err);
    }
  });

  // Take-down: PUBLISHED → DRAFT (mainly News; generic for every entity).
  router.post('/:id/unpublish', auth, approver, recent, async (req, res, next) => {
    try {
      const parsed = transitionSchema.safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json(validationErrorBody(parsed.error.issues));
      const row = await unpublishGoverned(db, ctxOf(req), config, req.params.id, parsed.data.reason);
      res.json({ [config.entity]: row });
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/rollback', auth, superAdmin, recent, async (req, res, next) => {
    try {
      const parsed = transitionSchema.safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json(validationErrorBody(parsed.error.issues));
      const row = await rollbackGoverned(db, ctxOf(req), config, req.params.id, parsed.data.reason);
      res.json({ [config.entity]: row });
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/archive', auth, superAdmin, recent, async (req, res, next) => {
    try {
      const parsed = transitionSchema.safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json(validationErrorBody(parsed.error.issues));
      const row = await archiveGoverned(db, ctxOf(req), config, req.params.id, parsed.data.reason);
      res.json({ [config.entity]: row });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
