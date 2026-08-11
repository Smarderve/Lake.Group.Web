import { Router } from 'express';
import { requireAuth, requireRole, requireRecentAuth } from '../middleware/auth.js';
import { roleSchema, passwordResetSchema, unansweredResolveSchema, validationErrorBody } from '../validators/auth.js';
import { hashPassword } from '../lib/passwords.js';
import { validatePasswordPolicy } from '../lib/password-policy.js';
import { writeAudit } from '../lib/audit.js';
import { publicUser } from '../lib/users.js';
import { buildHealthReport } from '../lib/content-health.js';
import { analyticsSummary } from '../lib/analytics.js';

/**
 * Admin API — proves the RBAC + privileged-action chain end to end.
 * Every route here requires a logged-in SUPER_ADMIN whose session
 * authenticated within the recent-auth window (default 15 min).
 */
export function adminRouter({ db, recentAuthWindowMs } = {}) {
  const router = Router();

  const auth = requireAuth(db);
  const superAdmin = requireRole('SUPER_ADMIN');
  const recent = requireRecentAuth(recentAuthWindowMs);

  // Task 2.10 — manual proof that the whole chain works.
  router.get('/ping', auth, superAdmin, (req, res) => {
    res.json({ ok: true, message: 'Admin access confirmed', user: publicUser(req.user) });
  });

  // Minimal user management (API only — no admin UI yet).
  router.get('/users', auth, superAdmin, recent, async (req, res, next) => {
    try {
      const users = await db.user.findMany({ orderBy: { email: 'asc' } });
      res.json({ users: users.map(publicUser) });
    } catch (err) {
      next(err);
    }
  });

  // Role change — audited (Task 2.8).
  router.patch('/users/:id/role', auth, superAdmin, recent, async (req, res, next) => {
    try {
      const parsed = roleSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json(validationErrorBody(parsed.error.issues));

      const target = await db.user.findUnique({ where: { id: req.params.id } });
      if (!target) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
      }

      const updated = await db.user.update({
        where: { id: target.id },
        data: { role: parsed.data.role },
      });

      await writeAudit(db, {
        actorId: req.user.id,
        action: 'ROLE_CHANGE',
        resource: `admin/users/${target.id}/role`,
        ip: req.ip,
        metadata: { email: target.email, from: target.role, to: parsed.data.role },
      }, req.log);

      res.json({ user: publicUser(updated) });
    } catch (err) {
      next(err);
    }
  });

  // Admin password reset (self-service reset needs an email decision —
  // out of scope; admins reset manually). Revokes the target's sessions.
  router.patch('/users/:id/password', auth, superAdmin, recent, async (req, res, next) => {
    try {
      const parsed = passwordResetSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json(validationErrorBody(parsed.error.issues));

      const target = await db.user.findUnique({ where: { id: req.params.id } });
      if (!target) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
      }

      const policy = validatePasswordPolicy({ password: parsed.data.password, email: target.email });
      if (!policy.ok) {
        return res.status(400).json({ error: { code: 'WEAK_PASSWORD', message: policy.message } });
      }

      const passwordHash = await hashPassword(parsed.data.password);
      await db.user.update({ where: { id: target.id }, data: { passwordHash } });

      const revoke = req.sessionStore?.revokeAllForUser;
      if (typeof revoke === 'function') await revoke(target.id);

      await writeAudit(db, {
        actorId: req.user.id,
        action: 'PASSWORD_RESET',
        resource: `admin/users/${target.id}/password`,
        ip: req.ip,
        metadata: { email: target.email },
      }, req.log);

      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  // Kill every session of a user (compromised account, role demotion, ...).
  router.post('/users/:id/revoke-sessions', auth, superAdmin, recent, async (req, res, next) => {
    try {
      const target = await db.user.findUnique({ where: { id: req.params.id } });
      if (!target) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
      }

      const revoke = req.sessionStore?.revokeAllForUser;
      if (typeof revoke !== 'function') {
        return res.status(501).json({
          error: { code: 'NOT_IMPLEMENTED', message: 'Session store does not support revocation' },
        });
      }

      const revokedCount = await revoke(target.id);
      await writeAudit(db, {
        actorId: req.user.id,
        action: 'SESSIONS_REVOKED',
        resource: `admin/users/${target.id}/sessions`,
        ip: req.ip,
        metadata: { email: target.email, revokedCount },
      }, req.log);

      res.json({ ok: true, revokedSessions: revokedCount });
    } catch (err) {
      next(err);
    }
  });

  // ---------------------------------------------------------------------
  // Phase 9 — AI / Corporate Knowledge: unanswered-question tracking.
  // Questions the assistant could not answer from approved content land
  // here (via the public POST endpoint) so content gaps surface.
  // ---------------------------------------------------------------------
  router.get('/unanswered-questions', auth, superAdmin, async (req, res, next) => {
    try {
      const rows = await db.unansweredQuestion.findMany({ orderBy: { createdAt: 'desc' } });
      res.json({ unansweredQuestions: rows });
    } catch (err) {
      next(err);
    }
  });

  // ---------------------------------------------------------------------
  // Phase 10 — Analytics & Intelligence: content-health dashboard.
  // ---------------------------------------------------------------------
  router.get('/content-health', auth, superAdmin, async (req, res, next) => {
    try {
      const report = await buildHealthReport(db, {
        repoRoot: process.env.LAKE_SITE_ROOT || null,
        i18nPath: process.env.LAKE_I18N_PATH || null,
        staleDays: Number(process.env.METRIC_STALE_DAYS) || 180,
        checkExternal: process.env.LAKE_CHECK_EXTERNAL_LINKS === 'true',
      });
      res.json(report);
    } catch (err) {
      next(err);
    }
  });

  router.get('/analytics/summary', auth, superAdmin, async (req, res, next) => {
    try {
      const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 365);
      res.json(await analyticsSummary(db, { days }));
    } catch (err) {
      next(err);
    }
  });

  router.patch('/unanswered-questions/:id', auth, superAdmin, async (req, res, next) => {
    try {
      const parsed = unansweredResolveSchema.safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json(validationErrorBody(parsed.error.issues));
      const { answered, answerNote } = parsed.data;

      const existing = await db.unansweredQuestion.findFirst({ where: { id: req.params.id } });
      if (!existing) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Unanswered question not found' } });
      }

      const row = await db.unansweredQuestion.update({
        where: { id: req.params.id },
        data: {
          answered: answered === true,
          answerNote: answerNote ?? null,
        },
      });
      await writeAudit(db, {
        actorId: req.user.id,
        action: 'UNANSWERED_QUESTION_RESOLVED',
        resource: `admin/unanswered-questions/${req.params.id}`,
        ip: req.ip,
        metadata: { answered: answered === true, answerNote: row.answerNote },
      }, req.log);
      res.json({ unansweredQuestion: row });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
