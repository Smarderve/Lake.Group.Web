import { rateLimit } from 'express-rate-limit';
import { securityLog } from '../lib/security-log.js';

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
 */
export function loginRateLimiter({ windowMs = 15 * 60 * 1000, limit = 5 } = {}) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: RATE_LIMITED_BODY,
    handler: blockedHandler('login'),
  });
}

/** Same guard for TOTP code submission (the second brute-force target). */
export function mfaRateLimiter({ windowMs = 15 * 60 * 1000, limit = 5 } = {}) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
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
