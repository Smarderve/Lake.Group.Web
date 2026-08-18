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

// Prisma client errors — these are application bugs or data-integrity
// issues, not infrastructure outages. Map them to safe, user-friendly
// responses without leaking schema/table/column names.
const PRISMA_CLIENT_ERROR_CODES = new Set([
  'P2002', // Unique constraint violation
  'P2003', // Foreign key constraint failure
  'P2004', // Constraint violation (DB constraint)
  'P2005', // Value in DB column is not valid
  'P2006', // Provided value is invalid
  'P2011', // Null constraint violation
  'P2012', // Missing required value
  'P2013', // Missing required argument
  'P2014', // Required relation violation
  'P2015', // Record not found
  'P2016', // Query interpretation error
  'P2017', // Records not connected
  'P2018', // Connected records not found
  'P2019', // Input error
  'P2020', // Value out of range
  'P2021', // Table does not exist
  'P2022', // Column does not exist
  'P2025', // Record to update/delete not found
]);

function mapPrismaError(err) {
  if (err?.code === 'P2002') {
    const target = err?.meta?.target;
    const field = Array.isArray(target) ? target.join(', ') : 'field';
    return {
      status: 409,
      code: 'CONFLICT',
      message: `A record with this ${field} already exists`,
    };
  }
  if (err?.code === 'P2025') {
    return {
      status: 404,
      code: 'NOT_FOUND',
      message: 'The requested record was not found',
    };
  }
  if (err?.code === 'P2011' || err?.code === 'P2012') {
    return {
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Missing required field',
    };
  }
  if (err?.code === 'P2003') {
    return {
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Invalid reference — related record does not exist',
    };
  }
  if (PRISMA_CLIENT_ERROR_CODES.has(err?.code)) {
    return {
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Invalid request data',
    };
  }
  return null;
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

    // Prisma client errors — map to safe, user-friendly responses.
    const prismaMapped = mapPrismaError(err);
    if (prismaMapped) {
      return res.status(prismaMapped.status).json({
        error: { code: prismaMapped.code, message: prismaMapped.message },
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
