import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { loginSchema, mfaCodeSchema, changePasswordSchema, validationErrorBody } from '../validators/auth.js';
import { hashPassword, verifyPassword } from '../lib/passwords.js';
import { validatePasswordPolicy } from '../lib/password-policy.js';
import { createTotpSecret, buildOtpauthUrl, qrDataUrl, verifyTotp } from '../lib/mfa.js';
import { writeAudit } from '../lib/audit.js';
import { publicUser } from '../lib/users.js';

function serviceUnavailable(res) {
  return res.status(503).json({
    error: { code: 'SERVICE_UNAVAILABLE', message: 'Database not configured' },
  });
}

function invalidCredentials(res) {
  // Generic on purpose — never reveal whether the email exists (Task 2.2).
  return res.status(401).json({
    error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
  });
}

export function authRouter({
  db,
  loginLimiter,
  mfaLimiter,
  sessionName = 'lakegroup.sid',
  secretBox = null,
  // DEVELOPMENT-ONLY: emails exempted from the TOTP step at login. The
  // password is still verified; only the second factor is skipped for the
  // named demo account(s). Never honored in production — config.js makes
  // DEV_MFA_SKIP_EMAILS a boot failure there, and isProduction gates it
  // here as a second layer.
  devMfaSkipEmails = [],
  isProduction = false,
} = {}) {
  const router = Router();

  function finalizeSession(req, user, mfa = false, extraMetadata = {}) {
    req.session.userId = user.id;
    req.session.role = user.role;
    req.session.authenticatedAt = Date.now();
    // SECURITY_ROADMAP Phase 3 — device identification for active-session
    // visibility (GET /auth/sessions). Captured server-side at login.
    req.session.device = {
      ip: req.ip,
      userAgent: String(req.headers['user-agent'] || '').slice(0, 200),
      since: new Date().toISOString(),
    };
    delete req.session.pendingMfaUserId;
    writeAudit(db, {
      actorId: user.id,
      action: 'LOGIN_SUCCESS',
      resource: 'auth/login',
      ip: req.ip,
      metadata: { mfa, ...extraMetadata },
    }, req.log);
  }

  // POST /auth/login — verify email + password; second step (TOTP) when
  // the account has MFA enabled.
  router.post('/login', loginLimiter, async (req, res, next) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json(validationErrorBody(parsed.error.issues));
      const { email, password } = parsed.data;

      if (!db) return serviceUnavailable(res);

      const user = await db.user.findUnique({ where: { email } });
      const passwordOk = user ? await verifyPassword(password, user.passwordHash) : false;
      const ok = Boolean(user && passwordOk && user.active);

      if (!ok) {
        // Failed attempts are never attributed to a verified actor — the
        // credentials were rejected, so the identity is unconfirmed. The
        // attempted email is kept in metadata for brute-force forensics.
        await writeAudit(db, {
          actorId: null,
          action: 'LOGIN_FAILED',
          resource: 'auth/login',
          ip: req.ip,
          metadata: { email },
        }, req.log);
        return invalidCredentials(res);
      }

      // DEVELOPMENT-ONLY: a listed demo account skips the TOTP step while
      // the environment is not production. The password above was still
      // verified — this is a second-factor skip for a named local account,
      // never an authentication bypass. Production cannot reach here (the
      // config fail-fast refuses to boot with DEV_MFA_SKIP_EMAILS set).
      const devMfaSkip = !isProduction && devMfaSkipEmails.includes(user.email);
      if (user.mfaEnabled && !devMfaSkip) {
        // Step 1 of 2 — hold the pending login on the session until the
        // TOTP code is verified (POST /auth/mfa/verify).
        req.session.regenerate((err) => {
          if (err) return next(err);
          req.session.pendingMfaUserId = user.id;
          res.json({ mfaRequired: true });
        });
        return;
      }

      req.session.regenerate((err) => {
        if (err) return next(err);
        // The skip is audited so every dev login without a second factor is
        // still visible in the trail.
        finalizeSession(req, user, false, devMfaSkip ? { devMfaSkip: true } : {});
        res.json({ user: publicUser(user) });
      });
    } catch (err) {
      next(err);
    }
  });

  // POST /auth/logout — destroy the current session.
  router.post('/logout', async (req, res, next) => {
    try {
      const userId = req.session?.userId ?? req.session?.pendingMfaUserId ?? null;
      if (userId && db) {
        await writeAudit(db, {
          actorId: userId,
          action: 'LOGOUT',
          resource: 'auth/logout',
          ip: req.ip,
        }, req.log);
      }
      if (req.session) {
        req.session.destroy((err) => {
          if (err) return next(err);
          res.clearCookie(sessionName, { path: '/' });
          res.json({ ok: true });
        });
      } else {
        res.json({ ok: true });
      }
    } catch (err) {
      next(err);
    }
  });

  // GET /auth/me — current user (or 401).
  router.get('/me', requireAuth(db), (req, res) => {
    res.json({ user: publicUser(req.user) });
  });

  // POST /auth/mfa/setup — generate a TOTP secret + QR code to scan.
  router.post('/mfa/setup', requireAuth(db), async (req, res, next) => {
    try {
      if (!db) return serviceUnavailable(res);
      if (req.user.mfaEnabled) {
        return res.status(400).json({
          error: { code: 'MFA_ALREADY_ENABLED', message: 'MFA is already enabled on this account' },
        });
      }
      const secret = createTotpSecret();
      const otpauthUrl = buildOtpauthUrl({ secret, email: req.user.email });
      const qrCodeDataUrl = await qrDataUrl(otpauthUrl);

      await db.user.update({
        where: { id: req.user.id },
        data: { mfaSecret: secretBox ? secretBox.seal(secret) : secret },
      });
      await writeAudit(db, {
        actorId: req.user.id,
        action: 'MFA_SETUP',
        resource: 'auth/mfa/setup',
        ip: req.ip,
      }, req.log);

      // The secret is returned exactly once (here, at initial setup).
      res.json({ secret, otpauthUrl, qrCodeDataUrl });
    } catch (err) {
      next(err);
    }
  });

  // POST /auth/mfa/verify — two contexts:
  //   1. completing a login that requires MFA (session has pendingMfaUserId)
  //   2. confirming setup to enable MFA on an authenticated account
  router.post('/mfa/verify', mfaLimiter, async (req, res, next) => {
    try {
      const parsed = mfaCodeSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json(validationErrorBody(parsed.error.issues));
      const { code } = parsed.data;
      if (!db) return serviceUnavailable(res);

      const pendingUserId = req.session?.pendingMfaUserId;

      if (pendingUserId) {
        // --- completing a MFA-protected login ---
        const user = await db.user.findUnique({ where: { id: pendingUserId } });
        if (!user || !user.mfaSecret || !user.mfaEnabled) return invalidCredentials(res);

        const plaintextSecret = secretBox ? secretBox.open(user.mfaSecret) : user.mfaSecret;
        const ok = await verifyTotp({ secret: plaintextSecret, code });
        if (!ok) {
          await writeAudit(db, {
            actorId: user.id,
            action: 'MFA_FAILED',
            resource: 'auth/login',
            ip: req.ip,
            metadata: { stage: 'login' },
          }, req.log);
          return res.status(401).json({
            error: { code: 'INVALID_MFA_CODE', message: 'Invalid code' },
          });
        }

        if (secretBox && !secretBox.isSealed(user.mfaSecret)) {
          await db.user.update({
            where: { id: user.id },
            data: { mfaSecret: secretBox.seal(plaintextSecret) },
          });
        }
        req.session.regenerate((err) => {
          if (err) return next(err);
          finalizeSession(req, user, true);
          res.json({ user: publicUser(user) });
        });
        return;
      }

      // --- enabling MFA on the current authenticated account ---
      if (!req.session?.userId) {
        return res.status(401).json({
          error: { code: 'UNAUTHENTICATED', message: 'Authentication required' },
        });
      }
      const user = await db.user.findUnique({ where: { id: req.session.userId } });
      if (!user || !user.mfaSecret || user.mfaEnabled) {
        return res.status(400).json({
          error: { code: 'MFA_NOT_PENDING', message: 'MFA is not pending setup' },
        });
      }

      const plaintextSecret = secretBox ? secretBox.open(user.mfaSecret) : user.mfaSecret;
      const ok = await verifyTotp({ secret: plaintextSecret, code });
      if (!ok) {
        await writeAudit(db, {
          actorId: user.id,
          action: 'MFA_FAILED',
          resource: 'auth/mfa/verify',
          ip: req.ip,
          metadata: { stage: 'setup' },
        }, req.log);
        return res.status(401).json({
          error: { code: 'INVALID_MFA_CODE', message: 'Invalid code' },
        });
      }

      await db.user.update({
        where: { id: user.id },
        data: {
          mfaEnabled: true,
          ...(secretBox && !secretBox.isSealed(user.mfaSecret)
            ? { mfaSecret: secretBox.seal(plaintextSecret) }
            : {}),
        },
      });
      await writeAudit(db, {
        actorId: user.id,
        action: 'MFA_ENABLED',
        resource: 'auth/mfa/verify',
        ip: req.ip,
      }, req.log);
      res.json({ user: publicUser({ ...user, mfaEnabled: true }) });
    } catch (err) {
      next(err);
    }
  });

  // POST /auth/change-password — self-service password change.
  // Reauthentication is the current password (SECURITY_ROADMAP Phase 2:
  // "For sensitive accounts/actions, require reauthentication"). The new
  // password is checked against the password policy, every OTHER session
  // is revoked, and the change is audited.
  router.post('/change-password', requireAuth(db), async (req, res, next) => {
    try {
      if (!db) return serviceUnavailable(res);
      const parsed = changePasswordSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json(validationErrorBody(parsed.error.issues));
      const { currentPassword, newPassword } = parsed.data;

      const policy = validatePasswordPolicy({ password: newPassword, email: req.user.email });
      if (!policy.ok) {
        return res.status(400).json({ error: { code: 'WEAK_PASSWORD', message: policy.message } });
      }

      const passwordOk = await verifyPassword(currentPassword, req.user.passwordHash);
      if (!passwordOk) {
        await writeAudit(db, {
          actorId: req.user.id,
          action: 'PASSWORD_CHANGE_FAILED',
          resource: 'auth/change-password',
          ip: req.ip,
        }, req.log);
        return res.status(401).json({
          error: { code: 'INVALID_CREDENTIALS', message: 'Current password is incorrect' },
        });
      }

      const passwordHash = await hashPassword(newPassword);
      await db.user.update({ where: { id: req.user.id }, data: { passwordHash } });

      const revoke = req.sessionStore?.revokeAllForUserExcept;
      if (typeof revoke === 'function') {
        await revoke(req.user.id, req.session.id);
      }

      await writeAudit(db, {
        actorId: req.user.id,
        action: 'PASSWORD_CHANGED',
        resource: 'auth/change-password',
        ip: req.ip,
      }, req.log);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  // GET /auth/sessions — active-session visibility (SECURITY_ROADMAP Phase 3):
  // every live session for the current user with device info, so users can
  // see and revoke sessions they no longer recognize.
  router.get('/sessions', requireAuth(db), async (req, res, next) => {
    try {
      const list = req.sessionStore?.listSessionsForUser;
      if (typeof list !== 'function') {
        return res.status(501).json({
          error: { code: 'NOT_IMPLEMENTED', message: 'Session store does not support session listing' },
        });
      }
      const sessionsList = await list(req.user.id);
      res.json({
        sessions: sessionsList.map((s) => ({ ...s, current: s.sid === req.session.id })),
      });
    } catch (err) {
      next(err);
    }
  });

  // DELETE /auth/sessions/:sid — revoke one of the current user's sessions
  // (never the current one — use /auth/logout for that). Ownership is
  // enforced inside the store (sid + userId both constrained).
  router.delete('/sessions/:sid', requireAuth(db), async (req, res, next) => {
    try {
      if (req.params.sid === req.session.id) {
        return res.status(400).json({
          error: { code: 'CURRENT_SESSION', message: 'Use POST /auth/logout to end the current session' },
        });
      }
      const revoke = req.sessionStore?.revokeSession;
      if (typeof revoke !== 'function') {
        return res.status(501).json({
          error: { code: 'NOT_IMPLEMENTED', message: 'Session store does not support session revocation' },
        });
      }
      const removed = await revoke(req.user.id, req.params.sid);
      if (!removed) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Session not found' },
        });
      }
      await writeAudit(db, {
        actorId: req.user.id,
        action: 'SESSION_REVOKED',
        resource: `auth/sessions/${req.params.sid}`,
        ip: req.ip,
      }, req.log);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  // POST /auth/revoke-sessions — kill every session for the current user
  // (including this one), e.g. when a device is lost or an account is
  // suspected compromised.
  router.post('/revoke-sessions', requireAuth(db), async (req, res, next) => {
    try {
      const revoke = req.sessionStore?.revokeAllForUser;
      if (typeof revoke !== 'function') {
        return res.status(501).json({
          error: { code: 'NOT_IMPLEMENTED', message: 'Session store does not support revocation' },
        });
      }
      const revokedCount = await revoke(req.user.id);
      await writeAudit(db, {
        actorId: req.user.id,
        action: 'SESSIONS_REVOKED',
        resource: 'auth/revoke-sessions',
        ip: req.ip,
        metadata: { revokedCount },
      }, req.log);
      req.session.destroy(() => {
        res.clearCookie(sessionName, { path: '/' });
        res.json({ ok: true, revokedSessions: revokedCount });
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
