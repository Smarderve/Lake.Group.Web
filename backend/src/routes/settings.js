import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { writeAudit } from '../lib/audit.js';
import { hashPassword, verifyPassword } from '../lib/passwords.js';
import { validatePasswordPolicy } from '../lib/password-policy.js';
import { createMemoryPrefsStore, PREF_DEFAULTS } from '../lib/user-prefs-store.js';
import { preferencesPatchSchema, validationErrorBody, SETTINGS_OPTIONS } from '../validators/settings.js';
import { changePasswordSchema, validationErrorBody as authValidationErrorBody } from '../validators/auth.js';

/**
 * Settings Center API (mounted at /admin/settings).
 *
 *   GET    /admin/settings           — the signed-in user's preferences + option values
 *   PATCH  /admin/settings           — update preferences (whitelisted, per-user)
 *   GET    /admin/settings/system    — read-only system health / security posture
 *
 * Account (password, sessions, MFA) already lives under /auth and is reused by
 * the Settings UI — nothing is duplicated here. Authorization is server-side:
 * every route requires an authenticated session; preferences are always scoped
 * to req.user.id so one user can never read or write another's settings.
 */
export function settingsRouter({ db, prefsStore = null } = {}) {
  const router = Router();
  const auth = requireAuth(db);
  // createApp defaults prefsStore to null when nothing is injected; fall back
  // to the in-memory store so tests and a database-less boot keep working.
  const store = prefsStore ?? createMemoryPrefsStore();

  /** Load the user's stored preferences, materializing defaults on first read. */
  async function loadPreferences(userId) {
    const stored = await store.get(userId);
    if (stored) return stored;
    // First visit — persist the defaults so subsequent reads are consistent
    // (the migration's column defaults and PREF_DEFAULTS must stay in sync).
    return store.upsert(userId, PREF_DEFAULTS);
  }

  router.get('/', auth, async (req, res, next) => {
    try {
      const preferences = await loadPreferences(req.user.id);
      res.json({ preferences, options: SETTINGS_OPTIONS, defaults: PREF_DEFAULTS });
    } catch (err) {
      next(err);
    }
  });

  router.patch('/', auth, async (req, res, next) => {
    try {
      const parsed = preferencesPatchSchema.safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json(validationErrorBody(parsed.error.issues));

      const current = await loadPreferences(req.user.id);
      // Merge onto the stored row so partial patches never wipe fields the
      // client did not send (deep-merge the JSON setting groups).
      const merged = {
        ...current,
        ...parsed.data,
        notificationSettings: {
          ...(current.notificationSettings ?? {}),
          ...(parsed.data.notificationSettings ?? {}),
        },
        dashboardSettings: {
          ...(current.dashboardSettings ?? {}),
          ...(parsed.data.dashboardSettings ?? {}),
        },
        accessibilitySettings: {
          ...(current.accessibilitySettings ?? {}),
          ...(parsed.data.accessibilitySettings ?? {}),
        },
      };
      // The store persists exactly the columns present; drop nothing we read.
      const saved = await store.upsert(req.user.id, merged);

      await writeAudit(db, {
        actorId: req.user.id,
        action: 'SETTINGS_UPDATED',
        resource: 'admin/settings',
        ip: req.ip,
        metadata: { changed: Object.keys(parsed.data) },
      }, req.log);

      res.json({ preferences: saved });
    } catch (err) {
      next(err);
    }
  });

  /**
   * GET /admin/settings/system — read-only infrastructure posture.
   *
   * The old System Settings page's content (service/db connectivity, security
   * posture) moves here, under Settings → System, exactly as the redesign
   * plan requires. Nothing secret is returned: no credentials, no connection
   * strings, no environment variables.
   */
  router.get('/system', auth, async (req, res, next) => {
    try {
      let dbStatus = 'down';
      let status = 'degraded';
      try {
        if (db) {
          await db.$queryRaw`SELECT 1`;
          dbStatus = 'up';
          status = 'ok';
        }
      } catch {
        // leave degraded
      }

      res.json({
        system: {
          status,
          service: 'lake-group-backend',
          db: dbStatus,
          uptimeSeconds: Math.round(process.uptime()),
          timestamp: new Date().toISOString(),
          posture: {
            secureSessionCookies: true, // httpOnly server-managed sessions
            originProtection: true, // CSRF origin guard on /admin
            serverSideAuthorization: true, // every route re-checks the DB role
            mfaEnabled: req.user.mfaEnabled === true,
            role: req.user.role,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  });

  /**
   * PATCH /admin/settings/password — self-service password change.
   *
   * Mirrors POST /auth/change-password so the Account tab has a settings-scoped
   * alias; both verify the CURRENT password and audit the change. Sessions are
   * NOT revoked here (the account tab exposes /auth/revoke-sessions for that),
   * matching the existing change-password behavior.
   */
  router.patch('/password', auth, async (req, res, next) => {
    try {
      const parsed = changePasswordSchema.safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json(authValidationErrorBody(parsed.error.issues));

      const { currentPassword, newPassword } = parsed.data;
      const passwordOk = await verifyPassword(currentPassword, req.user.passwordHash);
      if (!passwordOk) {
        await writeAudit(db, {
          actorId: req.user.id,
          action: 'PASSWORD_CHANGE_FAILED',
          resource: 'admin/settings/password',
          ip: req.ip,
          metadata: { reason: 'wrong_current_password' },
        }, req.log);
        return res.status(400).json({
          error: { code: 'WRONG_CURRENT_PASSWORD', message: 'Current password is incorrect' },
        });
      }

      const policy = validatePasswordPolicy({ password: newPassword, email: req.user.email });
      if (!policy.ok) {
        return res.status(400).json({ error: { code: 'WEAK_PASSWORD', message: policy.message } });
      }

      const passwordHash = await hashPassword(newPassword);
      await db.user.update({ where: { id: req.user.id }, data: { passwordHash } });

      await writeAudit(db, {
        actorId: req.user.id,
        action: 'PASSWORD_CHANGED',
        resource: 'admin/settings/password',
        ip: req.ip,
      }, req.log);

      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
