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

export function pinoHttpOptions(logger, level = 'info') {
  return { logger, level, serializers: { req: safeReqSerializer } };
}
