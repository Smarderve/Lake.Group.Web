import { Router } from 'express';
import { requireAuth, requireRole, requireRecentAuth } from '../middleware/auth.js';
import {
  metricCreateSchema,
  metricUpdateSchema,
  transitionSchema,
  verificationSchema,
  validationErrorBody,
} from '../validators/metrics.js';
import {
  createMetric,
  editMetric,
  submitMetric,
  approveMetric,
  publishMetric,
  rollbackMetric,
  verifyMetric,
  listStaleMetrics,
  findMetricByIdOrKey,
  serializeMetric,
  metricImpact,
} from '../lib/metrics.js';
import { config } from '../config.js';

/**
 * Admin metrics API (Phase 3 — Corporate Truth).
 *
 * Roles:
 *   create / edit / submit  — EDITOR, SUPER_ADMIN
 *   approve / publish       — REVIEWER, SUPER_ADMIN (approver ≠ submitter)
 *   rollback                — SUPER_ADMIN only (dangerous action)
 *   stale / list / read     — any authenticated user
 *
 * Every mutation also requires a session authenticated within the
 * recent-auth window (requireRecentAuth, Phase 2 Task 2.9).
 */
export function metricsRouter({ db, recentAuthWindowMs, staleDays = config.metricStaleDays } = {}) {
  const router = Router();

  const auth = requireAuth(db);
  const recent = requireRecentAuth(recentAuthWindowMs);
  const editor = requireRole('EDITOR', 'SUPER_ADMIN');
  const approver = requireRole('REVIEWER', 'SUPER_ADMIN');
  const verifier = requireRole('EDITOR', 'REVIEWER', 'SUPER_ADMIN');
  const superAdmin = requireRole('SUPER_ADMIN');

  const ctxOf = (req) => ({ user: req.user, ip: req.ip, logger: req.log });
  const notFound = (res) =>
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Metric not found' } });

  // GET /admin/metrics — all metrics (admin view; all statuses).
  router.get('/', auth, async (req, res, next) => {
    try {
      const metrics = await db.metric.findMany({
        include: { owner: { select: { email: true } } },
        orderBy: { key: 'asc' },
      });
      res.json({ metrics: metrics.map(serializeMetric) });
    } catch (err) {
      next(err);
    }
  });

  // GET /admin/metrics/stale — stale-data detection (Task 3.8).
  router.get('/stale', auth, approver, async (req, res, next) => {
    try {
      const days = Number(req.query.days) > 0 ? Number(req.query.days) : staleDays;
      const metrics = await listStaleMetrics(db, days);
      res.json({ staleDays: days, count: metrics.length, metrics: metrics.map(serializeMetric) });
    } catch (err) {
      next(err);
    }
  });

  // GET /admin/metrics/:id/impact — publishing-time impact analysis (Phase 7):
  // pending value vs published, consumers, verification, stale flag.
  router.get('/:id/impact', auth, async (req, res, next) => {
    try {
      const metric = await findMetricByIdOrKey(db, req.params.id);
      if (!metric) return notFound(res);
      res.json(await metricImpact(db, metric, staleDays));
    } catch (err) {
      next(err);
    }
  });

  // GET /admin/metrics/:id — one metric (by id or key) with its version history.
  router.get('/:id', auth, async (req, res, next) => {
    try {
      const metric = await findMetricByIdOrKey(db, req.params.id);
      if (!metric) return notFound(res);
      const versions = await db.metricVersion.findMany({
        where: { metricId: metric.id },
        orderBy: { createdAt: 'asc' },
      });
      res.json({ metric: serializeMetric(metric), versions });
    } catch (err) {
      next(err);
    }
  });

  // POST /admin/metrics — create, always lands in DRAFT (Task 3.3).
  router.post('/', auth, editor, recent, async (req, res, next) => {
    try {
      const parsed = metricCreateSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json(validationErrorBody(parsed.error.issues));
      const metric = await createMetric(db, ctxOf(req), parsed.data);
      res.status(201).json({ metric: serializeMetric(metric) });
    } catch (err) {
      next(err);
    }
  });

  // PATCH /admin/metrics/:id — edit, reopens to DRAFT (Task 3.3).
  router.patch('/:id', auth, editor, recent, async (req, res, next) => {
    try {
      const parsed = metricUpdateSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json(validationErrorBody(parsed.error.issues));
      const metric = await editMetric(db, ctxOf(req), req.params.id, parsed.data);
      res.json({ metric: serializeMetric(metric) });
    } catch (err) {
      next(err);
    }
  });

  // POST /admin/metrics/:id/submit — DRAFT → IN_REVIEW (Task 3.4).
  router.post('/:id/submit', auth, editor, recent, async (req, res, next) => {
    try {
      const parsed = transitionSchema.safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json(validationErrorBody(parsed.error.issues));
      const metric = await submitMetric(db, ctxOf(req), req.params.id, parsed.data.reason);
      res.json({ metric: serializeMetric(metric) });
    } catch (err) {
      next(err);
    }
  });

  // POST /admin/metrics/:id/approve — IN_REVIEW → APPROVED, separation of duties (Task 3.5).
  router.post('/:id/approve', auth, approver, recent, async (req, res, next) => {
    try {
      const parsed = transitionSchema.safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json(validationErrorBody(parsed.error.issues));
      const metric = await approveMetric(db, ctxOf(req), req.params.id, parsed.data.reason);
      res.json({ metric: serializeMetric(metric) });
    } catch (err) {
      next(err);
    }
  });

  // POST /admin/metrics/:id/publish — APPROVED → PUBLISHED (Task 3.6).
  router.post('/:id/publish', auth, approver, recent, async (req, res, next) => {
    try {
      const parsed = transitionSchema.safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json(validationErrorBody(parsed.error.issues));
      const metric = await publishMetric(db, ctxOf(req), req.params.id, parsed.data.reason);
      res.json({ metric: serializeMetric(metric) });
    } catch (err) {
      next(err);
    }
  });

  // POST /admin/metrics/:id/verify — record a re-verification (clears stale
  // flag) without changing the value or workflow status.
  router.post('/:id/verify', auth, verifier, recent, async (req, res, next) => {
    try {
      const parsed = verificationSchema.safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json(validationErrorBody(parsed.error.issues));
      const metric = await verifyMetric(db, ctxOf(req), req.params.id, parsed.data);
      res.json({ metric: serializeMetric(metric) });
    } catch (err) {
      next(err);
    }
  });

  // POST /admin/metrics/:id/rollback — restore previous published value (Task 3.7).
  router.post('/:id/rollback', auth, superAdmin, recent, async (req, res, next) => {
    try {
      const parsed = transitionSchema.safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json(validationErrorBody(parsed.error.issues));
      const metric = await rollbackMetric(db, ctxOf(req), req.params.id, parsed.data.reason);
      res.json({ metric: serializeMetric(metric) });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
