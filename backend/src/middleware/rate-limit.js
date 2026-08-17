import { rateLimit } from 'express-rate-limit';
import { securityLog } from '../lib/security-log.js';
import { createPgRateLimitStore } from '../lib/pg-rate-limit-store.js';

const RATE_LIMITED_BODY = {
  error: {
    code: 'RATE_LIMITED',
    message: 'Too many attempts. Please try again later.',
  },
};

// SECURITY_ROADMAP Phase 18 — every limiter trip emits a structured
// RATE_LIMIT_TRIGGERED security event (ip, route, limiter, limit, window)
// before answering 429. No secrets — ip/method/path only.
function blockedHandler(limiter) {
  return (req, res, _next, options) => {
    securityLog(req.log, {
      action: 'RATE_LIMIT_TRIGGERED',
      req,
      detail: {
        limiter,
        limit: options?.limit ?? options?.max ?? null,
        windowMs: options?.windowMs ?? null,
        remaining: 0,
      },
    });
    res.status(429).json(RATE_LIMITED_BODY);
  };
}

/**
 * Slows brute-force attempts on credential endpoints. Per-IP by default.
 * Instances are created per app so tests stay isolated.
 *
 * Window: 10 attempts per 24h per IP (product decision — raised from 5
 * once MFA became mandatory on the admin accounts: the daily budget now
 * covers legitimate repeated logins while still throttling credential
 * stuffing). MFA keeps a tight 15-min window because TOTP codes rotate
 * every 30s and are the second brute-force target.
 *
 * skipSuccessfulRequests: only FAILED attempts consume the budget. A
 * successful login (200) — including the mfaRequired:true step-1 response
 * for a valid password — must never burn the daily allowance, or a busy
 * admin day would self-lockout. Failures return 401/400 (>= 400) so they
 * are still counted by the default requestWasSuccessful check.
 *
 * Persistent store: when a PostgreSQL pool is supplied, the budget lives in
 * the migration-owned `rate_limit` table, so it survives restarts and is
 * shared across backend instances pointing at the same database. Tests pass
 * their own store; without a pool the default MemoryStore applies.
 */
export function loginRateLimiter({ windowMs = 24 * 60 * 60 * 1000, limit = 10, pool = null, store = null } = {}) {
  const effectiveStore =
    store ?? (pool ? createPgRateLimitStore({ pool, windowMs, prefix: 'login' }) : undefined);
  return rateLimit({
    windowMs,
    limit,
    store: effectiveStore,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    // A store hiccup (DB unreachable mid-flight) must never lock the whole
    // admin team out — auth itself fails if the database is down, so there
    // is no security regression in failing open here.
    passOnStoreError: true,
    message: RATE_LIMITED_BODY,
    handler: blockedHandler('login'),
  });
}

/**
 * Same guard for TOTP code submission (the second brute-force target).
 * Same skipSuccessfulRequests rule: a correct code (200) is a legitimate
 * login completing, not an attempt to throttle.
 */
export function mfaRateLimiter({ windowMs = 15 * 60 * 1000, limit = 5 } = {}) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: RATE_LIMITED_BODY,
    handler: blockedHandler('mfa'),
  });
}

/**
 * Phase 11 — public write endpoints (analytics beacon, unanswered-question
 * tracker) are unauthenticated, so per-IP throttling stops them being used
 * as a firehose / storage-spam vector. Generous for legit traffic, strict
 * enough to matter: 120 writes per 15 minutes per IP.
 */
export function publicWriteLimiter({ windowMs = 15 * 60 * 1000, limit = 120 } = {}) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: RATE_LIMITED_BODY,
    handler: blockedHandler('public-write'),
  });
}

/**
 * SECURITY_ROADMAP Phase 10 — authenticated admin/auth surface limiter.
 * Per-IP, generous (300 / 15 min ≈ 20/min): the small admin team must never
 * be DoS'd by its own limiter, while an automated flood (credential stuffing
 * past the login limiter, bulk CMS scraping, a buggy client loop) is still
 * throttled. Mounted on /admin and /auth after the CSRF guard.
 */
export function adminRateLimiter({ windowMs = 15 * 60 * 1000, limit = 300 } = {}) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: RATE_LIMITED_BODY,
    handler: blockedHandler('admin'),
  });
}
