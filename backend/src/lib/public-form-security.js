import crypto from 'node:crypto';
import { rateLimit } from 'express-rate-limit';
import { createPgRateLimitStore } from './pg-rate-limit-store.js';

export function formError(code, status = 400) {
  return Object.assign(new Error(code), { code, status });
}

export function safeFormText(value, { multiline = false } = {}) {
  if (typeof value !== 'string') return value;
  const normalized = value.normalize('NFC').trim();
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(normalized)
    || (!multiline && /[\r\n]/u.test(normalized))) throw formError('VALIDATION_ERROR');
  return normalized;
}

export const escapeFormHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);

export function formOriginAllowed(req, allowedOrigins) {
  const origin = req.get('origin');
  const site = req.get('sec-fetch-site');
  return Boolean(origin && allowedOrigins.includes(origin) && site !== 'cross-site');
}

export function createFormSecurity({ formId, secret = '', pool = null, now = Date.now, minCompletionMs = 2500 } = {}) {
  const memory = new Map();
  const definitions = formId === 'careers' ? [
    ['ip-hour', 60 * 60_000, 5, ({ ip }) => ip],
    ['ip-day', 24 * 60 * 60_000, 20, ({ ip }) => ip],
    ['email-day', 24 * 60 * 60_000, 3, ({ email }) => email],
    ['ip-email-hour', 60 * 60_000, 2, ({ ip, email }) => `${ip}:${email}`],
  ] : [
    ['ip-quarter', 15 * 60_000, 5, ({ ip }) => ip],
    ['ip-hour', 60 * 60_000, 15, ({ ip }) => ip],
    ['ip-day', 24 * 60 * 60_000, 40, ({ ip }) => ip],
    ['email-day', 24 * 60 * 60_000, 5, ({ email }) => email],
    ['ip-email-hour', 60 * 60_000, 3, ({ ip, email }) => `${ip}:${email}`],
  ];
  const windows = [...definitions, ['global-hour', 60 * 60_000, 1000, () => 'global']].map(([name, windowMs, limit, key]) => ({ name, windowMs, limit, key,
    store: pool ? createPgRateLimitStore({ pool, windowMs, prefix: `form:${formId}:${name}` }) : null }));

  function sign(payload) {
    return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  }
  function issueToken() {
    if (secret.length < 32) throw formError('SERVICE_UNAVAILABLE', 503);
    const startedAt = now();
    const payload = Buffer.from(JSON.stringify({ formId, issuedAt: startedAt, nonce: crypto.randomUUID() })).toString('base64url');
    return { token: `${payload}.${sign(payload)}`, startedAt };
  }
  function verifyToken(token, startedAt) {
    if (secret.length < 32) throw formError('SERVICE_UNAVAILABLE', 503);
    if (typeof token !== 'string' || token.length > 512 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/u.test(token)) throw formError('INVALID_FORM_TOKEN');
    const [payload, signature] = token.split('.');
    const actual = Buffer.from(signature);
    const expected = Buffer.from(sign(payload));
    if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) throw formError('INVALID_FORM_TOKEN');
    let decoded;
    try { decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')); } catch { throw formError('INVALID_FORM_TOKEN'); }
    const age = now() - decoded.issuedAt;
    if (decoded.formId !== formId || typeof decoded.nonce !== 'string' || age < minCompletionMs || age > 60 * 60_000
      || Number(startedAt) !== decoded.issuedAt) throw formError('INVALID_FORM_TOKEN');
    return decoded.nonce;
  }
  async function increment(key, windowMs) {
    const current = memory.get(key);
    const value = !current || current.expires <= now() ? { hits: 1, expires: now() + windowMs } : { ...current, hits: current.hits + 1 };
    memory.set(key, value);
    if (memory.size > 20_000) for (const [entry, item] of memory) if (item.expires <= now()) memory.delete(entry);
    return value.hits;
  }
  async function claim(key, ttlMs) {
    if (pool) {
      const store = createPgRateLimitStore({ pool, windowMs: ttlMs, prefix: `form:${formId}:claim` });
      return (await store.increment(key)).totalHits === 1;
    }
    return (await increment(`claim:${key}`, ttlMs)) === 1;
  }
  async function releaseClaim(key, ttlMs) {
    if (pool) {
      const store = createPgRateLimitStore({ pool, windowMs: ttlMs, prefix: `form:${formId}:claim` });
      await store.decrement(key);
      return;
    }
    const entry = memory.get(`claim:${key}`);
    if (entry) memory.set(`claim:${key}`, { ...entry, hits: Math.max(0, entry.hits - 1) });
  }
  async function checkLimits({ ip, email }) {
    const identity = { ip, email: email.toLowerCase() };
    for (const window of windows) {
      const key = crypto.createHash('sha256').update(window.key(identity)).digest('hex');
      const hits = window.store ? (await window.store.increment(key)).totalHits : await increment(`${window.name}:${key}`, window.windowMs);
      if (hits > window.limit) throw formError('RATE_LIMITED', 429);
    }
  }
  async function reserve({ token, startedAt, idempotencyKey, ip, email }) {
    const nonce = verifyToken(token, startedAt);
    if (typeof idempotencyKey !== 'string' || !/^[a-f0-9-]{36}$/iu.test(idempotencyKey)) throw formError('VALIDATION_ERROR');
    await checkLimits({ ip, email });
    const tokenClaim = await claim(`token:${nonce}`, 60 * 60_000);
    const idClaim = await claim(`id:${idempotencyKey}`, 24 * 60 * 60_000);
    if (!tokenClaim || !idClaim) throw formError('DUPLICATE_SUBMISSION', 409);
    return { release: async () => {
      await Promise.all([releaseClaim(`token:${nonce}`, 60 * 60_000), releaseClaim(`id:${idempotencyKey}`, 24 * 60 * 60_000)]);
    } };
  }
  return { issueToken, reserve, verifyToken };
}

export function publicFormResponse(res, error, requestId) {
  const code = error?.code || 'SERVICE_UNAVAILABLE';
  const status = error?.status || 503;
  if (status === 429) res.set('Retry-After', '3600');
  return res.set('Cache-Control', 'no-store').status(status).json({ error: { code }, requestId });
}

export function formTokenLimiter(formId, pool = null) {
  const windowMs = 60 * 60_000;
  return rateLimit({ windowMs, limit: 60, standardHeaders: true, legacyHeaders: false,
    store: pool ? createPgRateLimitStore({ pool, windowMs, prefix: `form:${formId}:token` }) : undefined,
    handler: (_req, res) => publicFormResponse(res, formError('RATE_LIMITED', 429)) });
}
