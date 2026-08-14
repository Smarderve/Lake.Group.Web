const ALLOWED_METHODS = 'GET, HEAD, POST, PATCH, PUT, DELETE, OPTIONS';
const ALLOWED_HEADERS = 'Content-Type';

/**
 * Exact-origin, credential-aware CORS for the cross-origin CMS. This is
 * mounted only on CMS-consumed routes; the public content API keeps its
 * separate wildcard read policy.
 */
export function cmsCors({ allowedOrigins = [] } = {}) {
  const allowed = new Set(allowedOrigins);

  return function cmsCorsMiddleware(req, res, next) {
    // Local/test deployments may intentionally omit cross-origin CMS access.
    // In that mode Express keeps its default same-origin behavior.
    if (allowed.size === 0) return next();
    const origin = req.get('origin');
    if (!origin) return next();

    if (!allowed.has(origin)) {
      if (req.method === 'OPTIONS') {
        return res.status(403).json({
          error: { code: 'CORS_ORIGIN_DENIED', message: 'Origin is not allowed' },
        });
      }
      return next();
    }

    res.vary('Origin');
    res.set({
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
    });

    if (req.method === 'OPTIONS') {
      res.set({
        'Access-Control-Allow-Methods': ALLOWED_METHODS,
        'Access-Control-Allow-Headers': ALLOWED_HEADERS,
        'Access-Control-Max-Age': '86400',
      });
      return res.sendStatus(204);
    }

    return next();
  };
}
