import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { pino } from 'pino';
import { makeApp, makeUser } from './helpers.js';
import { loginRateLimiter } from '../src/middleware/rate-limit.js';
import { safeReqSerializer } from '../src/logger.js';

// SECURITY_ROADMAP Phase 18 — Security Logging.
//
// Audit finding fixed: pino-http's default serializer copied EVERY request
// header into the logs — including `cookie` (session IDs) and
// `authorization` (tokens). The request logger now uses a header ALLOWLIST
// (safeReqSerializer), and security events (RATE_LIMIT_TRIGGERED,
// AUTHORIZATION_DENIED, CSRF_REJECTED) are emitted as structured
// `security: true` log lines. These tests lock both halves down.

function capturingLogger() {
  const lines = [];
  const logger = pino({ level: 'info' }, { write: (chunk) => lines.push(JSON.parse(chunk)) });
  return { logger, lines };
}

const EVENT = (lines, action) => lines.find((l) => l.security === true && l.action === action);

describe('SECURITY_ROADMAP Phase 18 — security logging', () => {
  it('request logs use the header allowlist — cookie/authorization never logged', async () => {
    const { logger, lines } = capturingLogger();
    const ctx = makeApp({ options: { logger } });
    const res = await request(ctx.app)
      .get('/health')
      .set('Cookie', 'lakegroup.sid=SECRET-SESSION-ABC')
      .set('Authorization', 'Bearer SECRET-TOKEN-123')
      .set('X-Custom-Secret-Header', 'SHHH');
    expect(res.status).toBe(200);

    const reqLog = lines.find((l) => l.req && l.req.headers);
    expect(reqLog).toBeTruthy();
    expect(reqLog.req.headers.cookie).toBeUndefined();
    expect(reqLog.req.headers.authorization).toBeUndefined();
    expect(reqLog.req.headers['x-custom-secret-header']).toBeUndefined();
    expect(reqLog.req.headers.host).toBeDefined(); // debugging-safe headers survive
    // The secret VALUES never appear anywhere in the log corpus.
    const blob = JSON.stringify(lines);
    expect(blob).not.toContain('SECRET-SESSION-ABC');
    expect(blob).not.toContain('SECRET-TOKEN-123');
  });

  it('safeReqSerializer allowlists only debugging-safe headers', () => {
    const out = safeReqSerializer({
      id: 1,
      method: 'POST',
      url: '/auth/login',
      remoteAddress: '::ffff:127.0.0.1',
      headers: {
        host: 'x', 'user-agent': 'y', accept: 'z', 'content-type': 'json',
        cookie: 'lakegroup.sid=SECRET', authorization: 'Bearer X',
        'x-forwarded-for': '1.2.3.4',
      },
    });
    expect(out.headers.cookie).toBeUndefined();
    expect(out.headers.authorization).toBeUndefined();
    expect(out.headers.host).toBe('x');
    expect(out.headers['x-forwarded-for']).toBe('1.2.3.4');
  });

  it('RATE_LIMIT_TRIGGERED is logged with ip/route/limiter/limit when a limiter trips', async () => {
    const { logger, lines } = capturingLogger();
    const users = [await makeUser({ email: 'a@lakegroup.test', password: 'pw-ok-12345', role: 'SUPER_ADMIN' })];
    const ctx = makeApp({
      users,
      options: { logger, loginLimiter: loginRateLimiter({ windowMs: 60_000, limit: 1 }) },
    });
    await request(ctx.app).post('/auth/login').send({ email: 'a@lakegroup.test', password: 'wrong' });
    const blocked = await request(ctx.app).post('/auth/login').send({ email: 'a@lakegroup.test', password: 'wrong' });
    expect(blocked.status).toBe(429);

    const evt = EVENT(lines, 'RATE_LIMIT_TRIGGERED');
    expect(evt).toBeTruthy();
    expect(evt.limiter).toBe('login');
    expect(evt.limit).toBe(1);
    expect(evt.path).toBe('/auth/login');
    expect(evt.method).toBe('POST');
    expect(evt.ip).toBeTruthy();
  });

  it('AUTHORIZATION_DENIED is logged on role rejection (actor, role, required roles)', async () => {
    const { logger, lines } = capturingLogger();
    const users = [await makeUser({ email: 'viewer@lakegroup.test', password: 'pw-view-1', role: 'VIEWER' })];
    const ctx = makeApp({ users, options: { logger } });
    const agent = request.agent(ctx.app);
    await agent.post('/auth/login').send({ email: 'viewer@lakegroup.test', password: 'pw-view-1' });
    const res = await agent.get('/admin/users');
    expect(res.status).toBe(403);

    const evt = EVENT(lines, 'AUTHORIZATION_DENIED');
    expect(evt).toBeTruthy();
    expect(evt.code).toBe('FORBIDDEN');
    expect(evt.reason).toBe('ROLE');
    expect(evt.role).toBe('VIEWER');
    expect(evt.requiredRoles).toContain('SUPER_ADMIN');
    expect(evt.actorId).toBeTruthy();
    expect(evt.path).toBe('/admin/users');
  });

  it('AUTHORIZATION_DENIED is logged on recent-auth expiry (REAUTH_REQUIRED)', async () => {
    const { logger, lines } = capturingLogger();
    const users = [await makeUser({ email: 'ed@lakegroup.test', password: 'pw-edit-1', role: 'EDITOR' })];
    const ctx = makeApp({ users, options: { logger, recentAuthWindowMs: 0 } });
    const agent = request.agent(ctx.app);
    await agent.post('/auth/login').send({ email: 'ed@lakegroup.test', password: 'pw-edit-1' });
    const res = await agent
      .post('/admin/news')
      .send({ title: 'X', slug: 'x', body: 'b', summary: 's', author: 't' });
    expect(res.status).toBe(403);

    const evt = EVENT(lines, 'AUTHORIZATION_DENIED');
    expect(evt).toBeTruthy();
    expect(evt.code).toBe('REAUTH_REQUIRED');
    expect(evt.reason).toBe('REAUTH_REQUIRED');
  });

  it('unauthenticated access is logged as AUTHORIZATION_DENIED without an actor', async () => {
    const { logger, lines } = capturingLogger();
    const ctx = makeApp({ options: { logger } });
    const res = await request(ctx.app).get('/admin/analytics/summary');
    expect(res.status).toBe(401);

    const evt = EVENT(lines, 'AUTHORIZATION_DENIED');
    expect(evt).toBeTruthy();
    expect(evt.code).toBe('UNAUTHENTICATED');
    expect(evt.actorId).toBeNull();
    expect(evt.role).toBeNull();
  });

  it('CSRF_REJECTED is logged as a suspicious-request event', async () => {
    const { logger, lines } = capturingLogger();
    const users = [await makeUser({ email: 'a@lakegroup.test', password: 'pw-ok-12345', role: 'SUPER_ADMIN' })];
    const ctx = makeApp({ users, options: { logger } });
    const res = await request(ctx.app)
      .post('/auth/login')
      .set('Origin', 'https://evil.example')
      .send({ email: 'a@lakegroup.test', password: 'pw-ok-12345' });
    expect(res.status).toBe(403);

    const evt = EVENT(lines, 'CSRF_REJECTED');
    expect(evt).toBeTruthy();
    expect(evt.origin).toBe('https://evil.example');
    expect(evt.path).toBe('/auth/login');
  });
});
