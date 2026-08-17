/**
 * Phase 11 — hardening: security headers for every API response.
 *
 * The public API is intentionally cross-origin readable (CORS * on
 * /api/public), so Cross-Origin-Resource-Policy is NOT set here — it would
 * block the static site from fetching the API. HSTS is only emitted when the
 * deployment runs over HTTPS (cookieSecure), never in local dev.
 */
export function securityHeaders({ hsts = false } = {}) {
  return (req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-Frame-Options', 'DENY');
    res.set('Content-Security-Policy', "frame-ancestors 'none'");
    res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    if (hsts) {
      res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  };
}

/** Prevent browsers and shared intermediaries from retaining CMS/auth data. */
export function privateNoStore(_req, res, next) {
  res.set('Cache-Control', 'private, no-store');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
}
