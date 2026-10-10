import { randomUUID } from 'node:crypto';
import express, { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';

const SESSION_COOKIE = 'lake_assistant.sid';
const SESSION_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const requestSchema = z.object({
  message: z.string().trim().min(1).max(1000),
  locale: z.enum(['en', 'sw']).optional().default('en'),
}).strict();

function cookieValue(request, name) {
  for (const part of String(request.headers.cookie || '').split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0 || part.slice(0, separator).trim() !== name) continue;
    let value;
    try { value = decodeURIComponent(part.slice(separator + 1).trim()); } catch { return null; }
    return SESSION_PATTERN.test(value) ? value : null;
  }
  return null;
}

function sameOriginIfPresent(request, allowedOrigins = []) {
  const origin = request.get('origin');
  if (!origin) return true;
  const fetchSite = request.get('sec-fetch-site');
  if (fetchSite && fetchSite.toLowerCase() === 'cross-site') return false;
  try {
    const parsedOrigin = new URL(origin).origin.toLowerCase();
    if (allowedOrigins.length) return allowedOrigins.some((candidate) => {
      try { return new URL(candidate).origin.toLowerCase() === parsedOrigin; } catch { return false; }
    });
    return new URL(origin).host.toLowerCase() === String(request.get('host') || '').toLowerCase();
  }
  catch { return false; }
}

function safeUnavailable(res) {
  return res.status(503).json({ error: { code: 'ASSISTANT_UNAVAILABLE', message: 'Lake Assistant is temporarily unavailable. Please try again shortly.' } });
}

export function assistantRouter({ service, cookieSecure = false, allowedOrigins = [] } = {}) {
  if (!service || typeof service.chat !== 'function') throw new TypeError('Assistant service is required.');
  const router = Router();
  const limiter = rateLimit({
    windowMs: 60_000,
    limit: 12,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_request, response) => response.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Please wait a moment before sending another message.' } }),
  });

  router.use((_request, response, next) => {
    response.set('Cache-Control', 'no-store');
    response.set('X-Content-Type-Options', 'nosniff');
    next();
  });

  router.get('/health', async (_request, response) => {
    try {
      const status = await service.health();
      const ready = status.status === 'ready';
      return response.status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'unavailable' });
    } catch {
      return safeUnavailable(response);
    }
  });

  router.post('/chat', express.json({ limit: '8kb', type: 'application/json' }), limiter, async (request, response) => {
    try {
      if (!/^application\/json(?:\s*;|$)/iu.test(request.get('content-type') || '')) {
        return response.status(415).json({ error: { code: 'UNSUPPORTED_CONTENT_TYPE', message: 'Send a JSON message.' } });
      }
      if (!sameOriginIfPresent(request, allowedOrigins)) {
        return response.status(403).json({ error: { code: 'ORIGIN_REJECTED', message: 'This request is not allowed.' } });
      }
      const parsed = requestSchema.safeParse(request.body);
      if (!parsed.success) {
        return response.status(400).json({ error: { code: 'INVALID_MESSAGE', message: 'Enter a message of up to 1,000 characters.' } });
      }
      const result = await service.chat({
        sessionId: cookieValue(request, SESSION_COOKIE),
        message: parsed.data.message,
        locale: parsed.data.locale,
      });
      const sessionId = SESSION_PATTERN.test(String(result.sessionId || '')) ? result.sessionId : randomUUID();
      response.append('Set-Cookie', `${SESSION_COOKIE}=${encodeURIComponent(sessionId)}; Path=/api/assistant; Max-Age=1800; HttpOnly; SameSite=Lax${cookieSecure ? '; Secure' : ''}`);
      const rawMetrics = result.metrics || {};
      const metrics = Object.fromEntries(['totalDurationNs', 'promptTokens', 'generatedTokens', 'generationDurationNs']
        .filter((key) => rawMetrics[key] !== null && rawMetrics[key] !== undefined && Number.isFinite(Number(rawMetrics[key])) && Number(rawMetrics[key]) >= 0)
        .map((key) => [key, Number(rawMetrics[key])]));
      return response.json({ answer: result.answer, sources: result.sources || [], grounded: Boolean(result.grounded), status: result.status || 'ok', ...(Object.keys(metrics).length ? { metrics } : {}) });
    } catch (error) {
      if (error?.status === 400) return response.status(400).json({ error: { code: 'INVALID_MESSAGE', message: 'Enter a message of up to 1,000 characters.' } });
      if (error?.status === 429) return response.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Please wait a moment before sending another message.' } });
      if (error?.status === 503 || error?.name === 'TimeoutError' || error?.name === 'AbortError') return safeUnavailable(response);
      request.log?.error?.({ err: error?.constructor?.name || 'Error' }, 'local assistant request failed');
      return safeUnavailable(response);
    }
  });

  return router;
}
