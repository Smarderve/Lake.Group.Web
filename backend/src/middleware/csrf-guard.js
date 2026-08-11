/**
 * SECURITY_ROADMAP Phase 8 — CSRF origin/site validation.
 *
 * Belt-and-suspenders over SameSite=Lax for cookie-authenticated
 * state-changing requests:
 *
 *   1. If an Origin header is present it must match the request's own
 *      origin (Host / X-Forwarded-Host, protocol-aware) OR be in the
 *      configured allowlist (`CSRF_ALLOWED_ORIGINS` — the static admin UI
 *      legitimately lives on another origin in dev/test/prod).
 *   2. If Origin is absent, a `Sec-Fetch-Site: cross-site` signal is
 *      rejected; same-origin/same-site/none/absent are accepted (curl and
 *      other non-browser clients send neither — they are not CSRF targets).
 *
 * Applies only to state-changing methods (POST/PUT/PATCH/DELETE); GET,
 * HEAD and OPTIONS (preflight) pass through. Mounted on /admin and /auth.
 */
import { securityLog } from '../lib/security-log.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function normalize(origin) {
  return String(origin || '').replace(/\/+$/, '');
}

function forbidden(res) {
  return res.status(403).json({
    error: { code: 'CSRF_REJECTED', message: 'Cross-site request rejected' },
  });
}

// SECURITY_ROADMAP Phase 18 — CSRF rejections are the app's suspicious-
// request signal; emit a structured CSRF_REJECTED security event.
function reject(req, res) {
  securityLog(req.log, {
    action: 'CSRF_REJECTED',
    req,
    detail: {
      origin: req.headers.origin ?? null,
      expected: `${req.secure ? 'https' : 'http'}://${req.headers.host ?? ''}`,
    },
  });
  return forbidden(res);
}

export function csrfGuard({ allowedOrigins = [], trustProxy = 0 } = {}) {
  const allowed = new Set(allowedOrigins.map(normalize).filter(Boolean));

  return function csrfGuardMiddleware(req, res, next) {
    if (SAFE_METHODS.has(req.method)) return next();

    // SECURITY (Phase 15): X-Forwarded-* is trusted ONLY when a reverse
    // proxy is configured (TRUST_PROXY > 0). Otherwise a direct client
    // could spoof X-Forwarded-Host/Proto plus a matching Origin and defeat
    // this check. First value wins (proxies append to the chain).
    const first = (value) => {
      const v = Array.isArray(value) ? value[0] : value;
      return String(v || '').split(',')[0].trim();
    };
    const host = trustProxy ? (first(req.headers['x-forwarded-host']) || req.headers.host) : req.headers.host;
    const proto = trustProxy
      ? (first(req.headers['x-forwarded-proto']) || (req.secure ? 'https' : 'http'))
      : (req.secure ? 'https' : 'http');
    const expected = normalize(`${proto}://${host}`);

    const origin = req.headers.origin;
    if (origin) {
      const o = normalize(origin);
      if (o === expected || allowed.has(o)) return next();
      return reject(req, res);
    }

    // No Origin (form submission from an old browser, curl, ...): trust the
    // Sec-Fetch-Site signal when the browser provides it.
    if (req.headers['sec-fetch-site'] === 'cross-site') {
      return reject(req, res);
    }
    return next();
  };
}
