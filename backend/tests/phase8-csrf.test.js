import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { makeApp, makeUser } from './helpers.js';

const HOST = 'lake.test';

async function makeCtx(extra = {}) {
  const users = [
    await makeUser({ email: 'admin@lakegroup.test', password: 'pw-admin-1', role: 'SUPER_ADMIN' }),
    await makeUser({ email: 'victim@lakegroup.test', password: 'pw-victim-1', role: 'VIEWER' }),
  ];
  const ctx = makeApp({ users, options: extra });
  const agent = request.agent(ctx.app).set('Host', HOST);
  await agent.post('/auth/login').send({ email: 'admin@lakegroup.test', password: 'pw-admin-1' });
  return { ...ctx, agent, victimId: 'u_victimlakegrouptest' };
}

describe('SECURITY_ROADMAP Phase 8 — CSRF origin/site validation', () => {
  let ctx;
  beforeEach(async () => { ctx = await makeCtx(); });

  it('accepts state-changing requests with a matching Origin (same-origin)', async () => {
    const res = await ctx.agent
      .patch(`/admin/users/${ctx.victimId}/role`)
      .set('Origin', `http://${HOST}`)
      .send({ role: 'EDITOR' });
    expect(res.status).toBe(200);
  });

  it('accepts state-changing requests with no Origin signal (curl, non-browser clients)', async () => {
    const res = await ctx.agent.patch(`/admin/users/${ctx.victimId}/role`).send({ role: 'EDITOR' });
    expect(res.status).toBe(200);
  });

  it('accepts no-Origin requests carrying a same-origin Sec-Fetch-Site signal', async () => {
    const res = await ctx.agent
      .patch(`/admin/users/${ctx.victimId}/role`)
      .set('Sec-Fetch-Site', 'same-origin')
      .send({ role: 'EDITOR' });
    expect(res.status).toBe(200);
  });

  it('rejects a foreign Origin with 403 CSRF_REJECTED (and performs no action)', async () => {
    const res = await ctx.agent
      .patch(`/admin/users/${ctx.victimId}/role`)
      .set('Origin', 'http://evil.example')
      .send({ role: 'SUPER_ADMIN' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF_REJECTED');
    const victim = await ctx.db.user.findUnique({ where: { id: ctx.victimId } });
    expect(victim.role).toBe('VIEWER');
  });

  it('rejects a no-Origin cross-site request via the Sec-Fetch-Site signal', async () => {
    const res = await ctx.agent
      .patch(`/admin/users/${ctx.victimId}/role`)
      .set('Sec-Fetch-Site', 'cross-site')
      .send({ role: 'EDITOR' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF_REJECTED');
  });

  it('allows configured origins (the static admin UI lives on another origin)', async () => {
    const ctxAllowed = await makeCtx({ csrfAllowedOrigins: ['http://cms.example', 'http://127.0.0.1:8796'] });
    const res = await ctxAllowed.agent
      .patch(`/admin/users/${ctxAllowed.victimId}/role`)
      .set('Origin', 'http://cms.example')
      .send({ role: 'EDITOR' });
    expect(res.status).toBe(200);
  });

  it('never blocks safe methods (GET) or preflights (OPTIONS)', async () => {
    const get = await ctx.agent.get('/admin/users').set('Origin', 'http://evil.example');
    expect(get.status).toBe(200);

    const preflight = await ctx.agent.options('/admin/users').set('Origin', 'http://evil.example')
      .set('Access-Control-Request-Method', 'PATCH');
    expect(preflight.status).not.toBe(403);
  });

  it('applies to authenticated /auth mutations (change-password)', async () => {
    const res = await ctx.agent
      .post('/auth/change-password')
      .set('Origin', 'http://evil.example')
      .send({ currentPassword: 'pw-admin-1', newPassword: 'brand-new-pass-9' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF_REJECTED');
  });

  it('applies to the login endpoint (login-CSRF protection)', async () => {
    const res = await request(ctx.app)
      .post('/auth/login')
      .set('Host', HOST)
      .set('Origin', 'http://evil.example')
      .send({ email: 'admin@lakegroup.test', password: 'pw-admin-1' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF_REJECTED');
  });

  it('rejects when the Origin matches Host but not the protocol', async () => {
    const res = await ctx.agent
      .patch(`/admin/users/${ctx.victimId}/role`)
      .set('Origin', `https://${HOST}`) // Host is http in this test
      .send({ role: 'EDITOR' });
    expect(res.status).toBe(403);
  });

  it('accepts the externally visible HTTPS origin through one explicitly trusted proxy', async () => {
    const trusted = await makeCtx({ trustProxy: 1 });
    const res = await trusted.agent
      .patch(`/admin/users/${trusted.victimId}/role`)
      .set('Host', 'backend.internal:4000')
      .set('X-Forwarded-Host', 'api.lakegroup.example')
      .set('X-Forwarded-Proto', 'https')
      .set('Origin', 'https://api.lakegroup.example')
      .send({ role: 'EDITOR' });
    expect(res.status).toBe(200);
  });

  it('ignores spoofed forwarding headers when the direct peer is outside the trusted proxy range', async () => {
    const restricted = await makeCtx({ trustProxy: ['10.0.0.0/8'] });
    const res = await restricted.agent
      .patch(`/admin/users/${restricted.victimId}/role`)
      .set('Host', HOST)
      .set('X-Forwarded-Host', 'attacker.example')
      .set('X-Forwarded-Proto', 'https')
      .set('Origin', 'https://attacker.example')
      .send({ role: 'EDITOR' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF_REJECTED');
  });

  it('issues Secure session cookies only when a trusted proxy proves HTTPS', async () => {
    const users = [
      await makeUser({ email: 'secure@lakegroup.test', password: 'pw-secure-1', role: 'SUPER_ADMIN' }),
    ];
    const ctxSecure = makeApp({ users, options: { cookieSecure: true, trustProxy: 1 } });
    const response = await request(ctxSecure.app)
      .post('/auth/login')
      .set('Host', 'backend.internal:4000')
      .set('X-Forwarded-Host', 'api.lakegroup.example')
      .set('X-Forwarded-Proto', 'https')
      .set('Origin', 'https://api.lakegroup.example')
      .send({ email: 'secure@lakegroup.test', password: 'pw-secure-1' });
    expect(response.status).toBe(200);
    expect(response.headers['set-cookie'][0]).toMatch(/;\s*Secure(?:;|$)/i);
  });
});
