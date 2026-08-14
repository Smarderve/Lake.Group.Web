/**
 * Centralized error handling (Task 1.6).
 *
 * Every response from this server has the same JSON error shape:
 *   { "error": { "code": "...", "message": "..." } }
 * Stack traces are never leaked to clients — they are logged server-side.
 */

export function notFoundHandler(req, res) {
  // Echo the client's X-Request-Id so frontend logs and backend access logs
  // can be correlated for a given user-facing error reference.
  const requestId = req.get('x-request-id');
  if (requestId) res.set('x-request-id', requestId);
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route not found: ${req.method} ${req.originalUrl}`,
    },
  });
}

// Connection failures from Prisma (P1001) and pg mean the database is
// down. Report 503 — consistent with /health's degraded state — instead
// of a bare 500 so clients can distinguish infra outage from bugs.
const DB_UNAVAILABLE_CODES = new Set(['P1001', 'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'EHOSTUNREACH']);

function isDbUnavailable(err) {
  return (
    DB_UNAVAILABLE_CODES.has(err?.code) ||
    /can't reach database server|connection refused/i.test(err?.message ?? '')
  );
}

// Express identifies error middleware by its 4-argument signature.
export function errorHandler({ logger } = {}) {
  // eslint-disable-next-line no-unused-vars -- `next` is required by Express
  return function handleError(err, req, res, next) {
    // Echo the client's X-Request-Id so frontend logs and backend access logs
    // can be correlated for a given user-facing error reference.
    const requestId = req.get('x-request-id');
    if (requestId) res.set('x-request-id', requestId);
    logger?.error?.({ err, method: req.method, url: req.originalUrl, requestId }, 'unhandled error');

    if (isDbUnavailable(err)) {
      return res.status(503).json({
        error: { code: 'SERVICE_UNAVAILABLE', message: 'Database unavailable' },
      });
    }

    // Oversized JSON bodies (express.json limit) — clean, consistent 413.
    if (err?.type === 'entity.too.large') {
      return res.status(413).json({
        error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body too large' },
      });
    }

    const status = Number(err.status || err.statusCode) || 500;
    // Never leak internals for server errors; keep 4xx messages as-is.
    const message = status >= 500 ? 'Internal server error' : err.message;

    res.status(status).json({
      error: {
        code: err.code || 'INTERNAL_ERROR',
        message,
      },
    });
  };
}
