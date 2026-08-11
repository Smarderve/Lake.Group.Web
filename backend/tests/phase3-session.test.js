import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { makeApp, makeUser } from './helpers.js';

describe('session security (SECURITY_ROADMAP Phase 3)', () => {
  let ctx;
  let userId;

  beforeEach(async () => {
    const user = await makeUser({ email: 'sess@lakegroup.test', password: 'sess-pass-1', role: 'EDITOR' });
    userId = user.id;
    ctx = makeApp({ users: [user] });
  });

  it('sets secure cookie flags on the session cookie', async () => {
    const res = await request(ctx.app)
      .post('/auth/login')
      .set('User-Agent', 'test-agent/1.0')
      .send({ email: 'sess@lakegroup.test', password: 'sess-pass-1' });
    expect(res.status).toBe(200);

    const cookie = res.headers['set-cookie'][0];
    expect(cookie).toMatch(/^lakegroup\.sid=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).toMatch(/Expires=/);
  });

  it('rotates the session ID on login (fixation-safe)', async () => {
    // Attacker pre-sets a known sid on the victim's browser; login must
    // regenerate it so the attacker-chosen id is never authenticated.
    const res = await request(ctx.app)
      .post('/auth/login')
      .set('Cookie', 'lakegroup.sid=attacker-fixed-sid')
      .send({ email: 'sess@lakegroup.test', password: 'sess-pass-1' });
    expect(res.status).toBe(200);

    const setCookie = res.headers['set-cookie'].join(';');
    const newSid = setCookie.match(/lakegroup\.sid=([^;]+)/)?.[1];
    expect(newSid).toBeTruthy();
    expect(newSid).not.toBe('attacker-fixed-sid');

    // The attacker-chosen sid is not a valid session; the new one is.
    const oldMe = await request(ctx.app).get('/auth/me').set('Cookie', 'lakegroup.sid=attacker-fixed-sid');
    expect(oldMe.status).toBe(401);
    const newMe = await request(ctx.app).get('/auth/me').set('Cookie', `lakegroup.sid=${newSid}`);
    expect(newMe.status).toBe(200);
  });

  it('rejects requests when the session has expired (store-side TTL)', async () => {
    const agent = request.agent(ctx.app);
    await agent.post('/auth/login').send({ email: 'sess@lakegroup.test', password: 'sess-pass-1' });
    expect((await agent.get('/auth/me')).status).toBe(200);

    // Simulate connect-pg-simple's TTL expiry deleting the row.
    ctx.store.sessions.clear();
    expect((await agent.get('/auth/me')).status).toBe(401);
  });

  it('re-issues the cookie on activity (idle timeout via rolling sessions)', async () => {
    const agent = request.agent(ctx.app);
    await agent.post('/auth/login').send({ email: 'sess@lakegroup.test', password: 'sess-pass-1' });

    // With rolling enabled, an authenticated request re-sets the cookie
    // (refreshing expiry — the TTL acts as an inactivity window).
    const me = await agent.get('/auth/me');
    expect(me.status).toBe(200);
    expect(me.headers['set-cookie']).toBeTruthy();
    expect(me.headers['set-cookie'][0]).toMatch(/Expires=/);
    expect(me.headers['set-cookie'][0]).toMatch(/lakegroup\.sid=/);
  });

  it('lists active sessions with device info and the current flag', async () => {
    const agentA = request.agent(ctx.app);
    const agentB = request.agent(ctx.app);
    await agentA.post('/auth/login').set('User-Agent', 'browser-a').send({ email: 'sess@lakegroup.test', password: 'sess-pass-1' });
    await agentB.post('/auth/login').set('User-Agent', 'browser-b').send({ email: 'sess@lakegroup.test', password: 'sess-pass-1' });

    const res = await agentA.get('/auth/sessions');
    expect(res.status).toBe(200);
    expect(res.body.sessions.length).toBeGreaterThanOrEqual(2);

    const current = res.body.sessions.find((s) => s.current);
    expect(current).toBeTruthy();
    expect(current.userAgent).toMatch(/browser-a/);
    expect(current.ip).toBeTruthy();
    expect(current.since).toBeTruthy();

    const other = res.body.sessions.find((s) => !s.current);
    expect(other).toBeTruthy();
    expect(other.userAgent).toMatch(/browser-b/);
  });

  it('revokes a single session, keeps the others, and audits SESSION_REVOKED', async () => {
    const agentA = request.agent(ctx.app);
    const agentB = request.agent(ctx.app);
    const agentC = request.agent(ctx.app);
    const agentD = request.agent(ctx.app);
    await agentA.post('/auth/login').send({ email: 'sess@lakegroup.test', password: 'sess-pass-1' });
    await agentB.post('/auth/login').send({ email: 'sess@lakegroup.test', password: 'sess-pass-1' });
    await agentC.post('/auth/login').send({ email: 'sess@lakegroup.test', password: 'sess-pass-1' });
    await agentD.post('/auth/login').send({ email: 'sess@lakegroup.test', password: 'sess-pass-1' });

    const list = await agentA.get('/auth/sessions');
    // First non-current session belongs to agentB (login order preserved).
    const target = list.body.sessions.find((s) => !s.current);
    expect(target).toBeTruthy();

    const res = await agentA.delete(`/auth/sessions/${target.sid}`);
    expect(res.status).toBe(200);

    // Target session dead; the others alive.
    expect((await agentB.get('/auth/me')).status).toBe(401);
    expect((await agentC.get('/auth/me')).status).toBe(200);
    expect((await agentD.get('/auth/me')).status).toBe(200);
    expect((await agentA.get('/auth/me')).status).toBe(200);

    const audit = ctx.db.auditRows.find((r) => r.action === 'SESSION_REVOKED');
    expect(audit).toBeTruthy();
    expect(audit.actorId).toBe(userId);
  });

  it('refuses to revoke the current session and 404s on unknown ones', async () => {
    const agent = request.agent(ctx.app);
    await agent.post('/auth/login').send({ email: 'sess@lakegroup.test', password: 'sess-pass-1' });

    const list = await agent.get('/auth/sessions');
    const current = list.body.sessions.find((s) => s.current);

    const self = await agent.delete(`/auth/sessions/${current.sid}`);
    expect(self.status).toBe(400);
    expect(self.body.error.code).toBe('CURRENT_SESSION');

    const missing = await agent.delete('/auth/sessions/does-not-exist');
    expect(missing.status).toBe(404);
  });

  it('cannot revoke another user\u2019s session (ownership enforced)', async () => {
    const other = await makeUser({ email: 'other@lakegroup.test', password: 'other-pass-1' });
    const ctx2 = makeApp({ users: [await makeUser({ email: 'sess@lakegroup.test', password: 'sess-pass-1', role: 'EDITOR' }), other] });

    const agentA = request.agent(ctx2.app);
    const agentB = request.agent(ctx2.app);
    await agentA.post('/auth/login').send({ email: 'sess@lakegroup.test', password: 'sess-pass-1' });
    await agentB.post('/auth/login').send({ email: 'other@lakegroup.test', password: 'other-pass-1' });

    const otherSid = (await agentB.get('/auth/sessions')).body.sessions[0].sid;

    // sess@ user tries to kill other@'s session → not found, still alive.
    const res = await agentA.delete(`/auth/sessions/${otherSid}`);
    expect(res.status).toBe(404);
    expect((await agentB.get('/auth/me')).status).toBe(200);
  });
});
