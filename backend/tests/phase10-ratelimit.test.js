import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { makeApp, makeUser } from './helpers.js';
import { adminRateLimiter } from '../src/middleware/rate-limit.js';

async function makeCtx(extraOptions = {}) {
  const users = [
    await makeUser({ email: 'admin@lakegroup.test', password: 'pw-admin-1', role: 'SUPER_ADMIN' }),
  ];
  const ctx = makeApp({ users, options: extraOptions });
  const agent = request.agent(ctx.app);
  await agent.post('/auth/login').send({ email: 'admin@lakegroup.test', password: 'pw-admin-1' });
  return { ...ctx, agent };
}

describe('SECURITY_ROADMAP Phase 10 — admin/auth rate limiting', () => {
  it('throttles the authenticated admin surface per IP (429 after the limit)', async () => {
    // makeCtx's login consumes 1 request of the budget.
    const ctx = await makeCtx({ adminLimiter: adminRateLimiter({ windowMs: 60_000, limit: 4 }) });
    for (let i = 0; i < 3; i += 1) {
      const ok = await ctx.agent.get('/admin/ping');
      expect(ok.status, `request ${i + 1}`).toBe(200);
    }
    const blocked = await ctx.agent.get('/admin/ping');
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('RATE_LIMITED');
  });

  it('throttles the /auth surface too (authenticated mutations)', async () => {
    const ctx = await makeCtx({ adminLimiter: adminRateLimiter({ windowMs: 60_000, limit: 3 }) });
    expect((await ctx.agent.get('/auth/me')).status).toBe(200);
    expect((await ctx.agent.get('/auth/me')).status).toBe(200);
    const blocked = await ctx.agent.get('/auth/me');
    expect(blocked.status).toBe(429);
  });

  it('the limit is enforced per IP bucket (clients sharing an IP share the budget)', async () => {
    const ctx = await makeCtx({ adminLimiter: adminRateLimiter({ windowMs: 60_000, limit: 3 }) });
    for (let i = 0; i < 2; i += 1) await ctx.agent.get('/admin/ping');
    expect((await ctx.agent.get('/admin/ping')).status).toBe(429);

    // A second client from the same IP (supertest always uses 127.0.0.1)
    // is throttled too — the budget is per IP, not per session.
    const fresh = await request(ctx.app).get('/admin/ping');
    expect(fresh.status).toBe(429);
  });
});

describe('SECURITY_ROADMAP Phase 10 — public pagination caps', () => {
  let ctx;
  beforeEach(async () => {
    ctx = await makeCtx();
    for (let i = 1; i <= 5; i += 1) {
      await ctx.db.company.create({
        data: {
          slug: `co-${i}`, name: `Company ${i}`, status: 'PUBLISHED',
          createdAt: new Date(Date.UTC(2026, 0, i)), // deterministic desc order
        },
      });
    }
  });

  it('accepts limit/offset and slices the published rows', async () => {
    const page = await request(ctx.app).get('/api/public/companies?limit=2');
    expect(page.status).toBe(200);
    expect(page.body.company.length).toBe(2);

    const later = await request(ctx.app).get('/api/public/companies?limit=2&offset=4');
    expect(later.body.company.length).toBe(1); // rows 5 of 5
    expect(later.body.company[0].slug).toBe('co-1');
  });

  it('rejects malformed pagination (0, negative, >100, non-numeric) with 400', async () => {
    for (const qs of ['limit=0', 'limit=-1', 'limit=101', 'limit=abc', 'offset=-5', 'offset=999999']) {
      const res = await request(ctx.app).get(`/api/public/companies?${qs}`);
      expect(res.status, qs).toBe(400);
      expect(res.body.error.code, qs).toBe('VALIDATION_ERROR');
    }
  });

  it('preserves the uncapped default when no params are sent', async () => {
    const res = await request(ctx.app).get('/api/public/companies');
    expect(res.status).toBe(200);
    expect(res.body.company.length).toBe(5);
  });

  it('the caps do not apply to single-record lookups or other routes', async () => {
    const one = await request(ctx.app).get('/api/public/companies/co-1?limit=999');
    expect(one.status).toBe(200);
    const map = await request(ctx.app).get('/api/public/map?limit=abc');
    expect(map.status).toBe(200);
  });
});
