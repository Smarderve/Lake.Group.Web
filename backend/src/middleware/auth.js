import { config } from '../config.js';
import { securityLog } from '../lib/security-log.js';

// SECURITY_ROADMAP Phase 18 — every denied request emits an
// AUTHORIZATION_DENIED security event (actor when known, role, route),
// preserving the original HTTP semantics: 401 unauthenticated, 403
// forbidden/reauth-required.
function deny(req, res, { status = 403, code, message, detail = {} }) {
  securityLog(req.log, {
    action: 'AUTHORIZATION_DENIED',
    req,
    detail: {
      code,
      actorId: req.user?.id ?? null,
      role: req.user?.role ?? null,
      ...detail,
    },
  });
  return res.status(status).json({ error: { code, message } });
}

/**
 * Must be logged in. Reloads the user from the database so deactivated
 * accounts and role changes take effect immediately; attaches `req.user`.
 */
export function requireAuth(db) {
  return async function requireAuthMiddleware(req, res, next) {
    try {
      const userId = req.session?.userId;
      if (!userId || !db) return deny(req, res, { status: 401, code: 'UNAUTHENTICATED', message: 'Authentication required', detail: { reason: 'no-session' } });

      const user = await db.user.findUnique({ where: { id: userId } });
      if (!user || !user.active) {
        // Destroy a stale session so the client is forced to re-authenticate.
        req.session.destroy(() => {});
        return deny(req, res, {
          status: 401,
          code: 'UNAUTHENTICATED',
          message: 'Authentication required',
          detail: { reason: user ? 'inactive' : 'unknown-user', actorId: userId },
        });
      }

      req.user = user;
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Production MFA enrollment gate for the CMS surface. Anonymous and stale
 * sessions continue to the route's normal authentication middleware so HTTP
 * semantics stay consistent; authenticated users in a required role are
 * denied every /admin operation until enrollment is complete. The enrollment
 * endpoints remain under /auth and therefore reachable.
 */
export function requireMfaEnrollment(db, requiredRoles = []) {
  const roles = new Set(requiredRoles);
  return async function requireMfaEnrollmentMiddleware(req, res, next) {
    try {
      const userId = req.session?.userId;
      if (!userId || !db || roles.size === 0) return next();
      const user = await db.user.findUnique({ where: { id: userId } });
      if (!user || !user.active) return next();
      if (roles.has(user.role) && !user.mfaEnabled) {
        req.user = user;
        return deny(req, res, {
          code: 'MFA_ENROLLMENT_REQUIRED',
          message: 'Multi-factor authentication enrollment is required',
          detail: { reason: 'MFA_ENROLLMENT_REQUIRED' },
        });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Must have one of the given roles. Requires requireAuth to have run first
 * (so req.user exists).
 */
export function requireRole(...roles) {
  return function requireRoleMiddleware(req, res, next) {
    if (!req.user || !roles.includes(req.user.role)) {
      return deny(req, res, {
        code: 'FORBIDDEN',
        message: 'Insufficient permissions',
        detail: { reason: 'ROLE', requiredRoles: roles },
      });
    }
    next();
  };
}

/**
 * Privileged-action guard (Task 2.9): the session must have completed
 * authentication within the last `maxAgeMs` (default 15 minutes). Future
 * approvals/publishing flows reuse this pattern.
 */
export function requireRecentAuth(maxAgeMs = config.recentAuthWindowMs) {
  return function requireRecentAuthMiddleware(req, res, next) {
    const authenticatedAt = req.session?.authenticatedAt;
    if (!authenticatedAt || Date.now() - authenticatedAt > maxAgeMs) {
      return deny(req, res, {
        code: 'REAUTH_REQUIRED',
        message: 'Please re-authenticate to perform this action',
        detail: { reason: 'REAUTH_REQUIRED' },
      });
    }
    next();
  };
}
