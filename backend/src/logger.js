import { pino } from 'pino';

/**
 * Structured logger (pino). Level is driven by the LOG_LEVEL env var
 * (see src/config.js). The app never uses console.log — everything goes
 * through this logger.
 */
export function createLogger(level = 'info') {
  return pino({ level });
}

// SECURITY_ROADMAP Phase 18 — request headers are logged on an ALLOWLIST.
// pino-http's default serializer copies every header, which puts cookies
// (session IDs) and authorization (tokens) into the logs — a real finding
// fixed here. Only debugging-safe headers pass; everything else is dropped.
const SAFE_REQ_HEADERS = new Set([
  'host',
  'user-agent',
  'accept',
  'accept-language',
  'accept-encoding',
  'content-type',
  'content-length',
  'origin',
  'referer',
  'referrer',
  'connection',
  'dnt',
  'sec-fetch-site',
  'sec-fetch-mode',
  'sec-fetch-dest',
  'x-forwarded-for',
  'x-forwarded-host',
  'x-forwarded-proto',
]);

export function safeReqSerializer(req) {
  const headers = {};
  for (const [key, value] of Object.entries(req.headers || {})) {
    if (SAFE_REQ_HEADERS.has(key)) headers[key] = value;
  }
  return {
    id: req.id,
    method: req.method,
    url: req.url,
    remoteAddress: req.remoteAddress,
    remotePort: req.remotePort,
    headers,
  };
}

// SECURITY_ROADMAP Phase 18/19 follow-up — pino-http's default RES serializer
// copies every response header, which puts the session ID back into the logs
// via `set-cookie` on every authenticated response (found in the Phase 19
// live log sweep). Response headers are logged on an ALLOWLIST too: only
// non-sensitive headers survive; `set-cookie`, `authorization` and anything
// else are dropped.
const SAFE_RES_HEADERS = new Set([
  'content-type',
  'content-length',
  'etag',
  'x-content-type-options',
  'x-frame-options',
  'content-security-policy',
  'referrer-policy',
  'permissions-policy',
  'strict-transport-security',
  'ratelimit-policy',
  'ratelimit-limit',
  'ratelimit-remaining',
  'ratelimit-reset',
  'location',
  'access-control-allow-origin',
  'access-control-allow-methods',
  'access-control-allow-headers',
  'access-control-max-age',
]);

export function safeResSerializer(res) {
  const headers = {};
  for (const [key, value] of Object.entries(res.headers || {})) {
    if (SAFE_RES_HEADERS.has(key)) headers[key] = value;
  }
  return {
    statusCode: res.statusCode,
    headers,
  };
}

export function pinoHttpOptions(logger, level = 'info') {
  return { logger, level, serializers: { req: safeReqSerializer, res: safeResSerializer } };
}
