import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { makeApp, makeUser } from './helpers.js';

// SECURITY_ROADMAP Phase 15 — HTTPS & Headers.
//
// Audit: security headers on every response (nosniff/DENY/CSP frame-
// ancestors/Referrer-Policy/Permissions-Policy, HSTS conditional on HTTPS)
// were already in place. This phase closes the proxy-header gap and locks
// the CORS/header posture down:
//   - csrf-guard previously trusted X-Forwarded-Host/Proto UNCONDITIONALLY —
//     a direct client could spoof both plus a matching Origin and defeat
//     the origin check. X-Forwarded-* is now honored only when TRUST_PROXY>0.
//   - CORS `*` is scoped to /api/public (no credentials — the safe wildcard
//     combination); admin/auth surfaces carry no CORS headers at all.

describe('SECURITY_ROADMAP Phase 15 — HTTPS & headers', () => {
  it('public API responses carry Access-Control-Allow-Origin: * (no credentials)', async () => {
    const ctx = makeApp({});
    const res = await request(ctx.app)
      .post('/api/public/analytics/events')
      .send({ type: 'PAGE_VIEW', page: '/x' });
    expect(res.status).toBe(201);
    expect(res.headers['access-control-allow-origin']).toBe('*');
    // The wildcard is only safe because credentials are never used here.
    expect(res.headers['access-control-allow-credentials']).toBeUndefined();
  });

  it('admin/auth responses NEVER carry CORS headers', async () => {
    const users = [await makeUser({ email: 'a@lakegroup.test', password: 'pw-admin-1', role: 'SUPER_ADMIN' })];
    const ctx = makeApp({ users });
    // Unauthenticated admin call → 401 (headers are set before auth runs).
    const res = await request(ctx.app).get('/admin/analytics/summary');
    expect(res.status).toBe(401);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
    // Login response too.
    const login = await request(ctx.app)
      .post('/auth/login')
      .send({ email: 'a@lakegroup.test', password: 'pw-admin-1' });
    expect(login.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('public preflight answers the browser with methods/headers/max-age', async () => {
    const ctx = makeApp({});
    const res = await request(ctx.app)
      .options('/api/public/news')
      .set('Origin', 'http://127.0.0.1:8796')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type');
    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('*');
    expect(res.headers['access-control-allow-methods']).toContain('POST');
    expect(res.headers['access-control-allow-methods']).toContain('GET');
    expect(res.headers['access-control-allow-headers']).toBe('Content-Type');
    expect(res.headers['access-control-max-age']).toBe('86400');
  });

  it('security headers appear on error paths too (404)', async () => {
    const ctx = makeApp({});
    const res = await request(ctx.app).get('/api/public/definitely-not-an-entity');
    expect(res.status).toBe(404);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(res.headers['permissions-policy']).toContain('camera=()');
  });

  it('HSTS is emitted only for HTTPS deployments, with includeSubDomains', async () => {
    const plain = makeApp({});
    const dev = await request(plain.app).get('/health');
    expect(dev.headers['strict-transport-security']).toBeUndefined();

    const https = makeApp({ options: { cookieSecure: true } });
    const prod = await request(https.app).get('/health');
    expect(prod.headers['strict-transport-security']).toBe(
      'max-age=31536000; includeSubDomains',
    );
  });

  describe('CSRF origin check — X-Forwarded-* trust gating (Phase 15)', () => {
    async function spoofedLogin(ctx) {
      return request(ctx.app)
        .post('/auth/login')
        .set('Origin', 'https://evil.example')
        .set('X-Forwarded-Host', 'evil.example')
        .set('X-Forwarded-Proto', 'https')
        .send({ email: 'a@lakegroup.test', password: 'pw-admin-1' });
    }

    it('direct connection (trustProxy=0): spoofed X-Forwarded-* + matching Origin → 403', async () => {
      const users = [await makeUser({ email: 'a@lakegroup.test', password: 'pw-admin-1', role: 'SUPER_ADMIN' })];
      const ctx = makeApp({ users }); // trustProxy defaults to 0
      const res = await spoofedLogin(ctx);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CSRF_REJECTED');
    });

    it('behind a proxy (trustProxy=1): forwarded host/proto ARE trusted', async () => {
      const users = [await makeUser({ email: 'a@lakegroup.test', password: 'pw-admin-1', role: 'SUPER_ADMIN' })];
      const ctx = makeApp({ users, options: { trustProxy: 1 } });
      const res = await spoofedLogin(ctx);
      expect(res.status).toBe(200);
    });

    it('behind a proxy: the FIRST X-Forwarded-Host wins (chain order respected)', async () => {
      const users = [await makeUser({ email: 'a@lakegroup.test', password: 'pw-admin-1', role: 'SUPER_ADMIN' })];
      const ctx = makeApp({ users, options: { trustProxy: 1 } });
      const ok = await request(ctx.app)
        .post('/auth/login')
        .set('Origin', 'https://real.example')
        .set('X-Forwarded-Host', 'real.example, evil.example')
        .set('X-Forwarded-Proto', 'https')
        .send({ email: 'a@lakegroup.test', password: 'pw-admin-1' });
      expect(ok.status).toBe(200);

      const rejected = await request(ctx.app)
        .post('/auth/login')
        .set('Origin', 'https://evil.example')
        .set('X-Forwarded-Host', 'real.example, evil.example')
        .set('X-Forwarded-Proto', 'https')
        .send({ email: 'a@lakegroup.test', password: 'pw-admin-1' });
      expect(rejected.status).toBe(403);
    });
  });
});
