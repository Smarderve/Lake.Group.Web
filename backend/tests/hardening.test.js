import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { makeApp, makeUser } from './helpers.js';
import { publicWriteLimiter } from '../src/middleware/rate-limit.js';

async function login(app, email, password) {
  const agent = request.agent(app);
  const res = await agent.post('/auth/login').send({ email, password });
  expect(res.status).toBe(200);
  return agent;
}

async function makeCtx(extra = {}) {
  const users = [
    await makeUser({ email: 'admin@lakegroup.test', password: 'pw-admin-1', role: 'SUPER_ADMIN' }),
    await makeUser({ email: 'viewer@lakegroup.test', password: 'pw-view-1', role: 'VIEWER' }),
    await makeUser({ email: 'editor@lakegroup.test', password: 'pw-edit-1', role: 'EDITOR' }),
  ];
  const ctx = makeApp({ users, ...extra });
  return {
    ...ctx,
    admin: await login(ctx.app, 'admin@lakegroup.test', 'pw-admin-1'),
    viewer: await login(ctx.app, 'viewer@lakegroup.test', 'pw-view-1'),
    editor: await login(ctx.app, 'editor@lakegroup.test', 'pw-edit-1'),
  };
}

describe('Phase 11 — security hardening', () => {
  let ctx;
  beforeEach(async () => { ctx = await makeCtx(); });

  it('every response carries the security headers', async () => {
    const res = await request(ctx.app).get('/health');
    expect(res.status).toBe(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(res.headers['permissions-policy']).toContain('geolocation=()');
    // Dev: no HSTS (HTTP locally).
    expect(res.headers['strict-transport-security']).toBeUndefined();
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('HSTS is emitted when the deployment runs over HTTPS (cookieSecure)', async () => {
    // helpers.makeApp forwards extra config through the `options` bag.
    const ctxHttps = makeApp({ options: { cookieSecure: true } });
    const res = await request(ctxHttps.app).get('/health');
    expect(res.headers['strict-transport-security']).toContain('max-age=31536000');
  });

  it('public write endpoints are rate limited per IP (429 after the limit)', async () => {
    // helpers.makeApp forwards extra config through the `options` bag.
    const tight = await makeCtx({ options: { publicWriteLimiter: publicWriteLimiter({ windowMs: 60_000, limit: 3 }) } });
    for (let i = 0; i < 3; i += 1) {
      const ok = await request(tight.app)
        .post('/api/public/analytics/events')
        .send({ type: 'PAGE_VIEW', page: '/x.html' });
      expect(ok.status).toBe(201);
    }
    const blocked = await request(tight.app)
      .post('/api/public/analytics/events')
      .send({ type: 'PAGE_VIEW', page: '/x.html' });
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('RATE_LIMITED');
  });

  it('admin surface requires authentication for every route (401 anonymous)', async () => {
    const routes = [
      '/admin/ping', '/admin/users', '/admin/unanswered-questions',
      '/admin/content-health', '/admin/analytics/summary',
    ];
    for (const route of routes) {
      const res = await request(ctx.app).get(route);
      expect(res.status, route).toBe(401);
    }
  });

  it('analytics + content-health + tracker routes reject non-SUPER_ADMIN roles (403)', async () => {
    const sensitive = ['/admin/content-health', '/admin/analytics/summary', '/admin/unanswered-questions'];
    for (const route of sensitive) {
      const asViewer = await ctx.viewer.get(route);
      expect(asViewer.status, `${route} as VIEWER`).toBe(403);
      const asEditor = await ctx.editor.get(route);
      expect(asEditor.status, `${route} as EDITOR`).toBe(403);
    }
  });

  it('SUPER_ADMIN can reach the sensitive admin surface', async () => {
    const res = await ctx.admin.get('/admin/content-health');
    expect(res.status).toBe(200);
  });
});

describe('Phase 11 — public data isolation (no DRAFT leaks)', () => {
  it('/api/public/companies returns PUBLISHED rows only', async () => {
    const ctx = await makeCtx();
    await ctx.db.company.create({ data: { slug: 'live-co', name: 'Live Co', status: 'PUBLISHED' } });
    await ctx.db.company.create({ data: { slug: 'draft-co', name: 'Draft Co', status: 'DRAFT' } });
    await ctx.db.company.create({ data: { slug: 'archived-co', name: 'Archived Co', status: 'ARCHIVED' } });

    const res = await request(ctx.app).get('/api/public/companies');
    expect(res.status).toBe(200);
    const rows = res.body.company || [];
    expect(rows.map((c) => c.slug)).toEqual(['live-co']);
    expect(res.body).not.toContain('draft-co');
  });
});
