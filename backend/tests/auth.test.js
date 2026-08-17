import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { makeApp, makeUser } from './helpers.js';

describe('auth: login / logout / me', () => {
  let ctx;

  beforeEach(async () => {
    const admin = await makeUser({ email: 'admin@lakegroup.test', password: 'correct-horse', role: 'SUPER_ADMIN' });
    ctx = makeApp({ users: [admin] });
  });

  it('logs in with correct credentials and exposes /auth/me', async () => {
    const agent = request.agent(ctx.app);
    const res = await agent.post('/auth/login').send({ email: 'admin@lakegroup.test', password: 'correct-horse' });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('admin@lakegroup.test');
    expect(res.body.user.role).toBe('SUPER_ADMIN');
    expect(res.body.user.mfaSecret).toBeUndefined();
    expect(res.body.user.passwordHash).toBeUndefined();

    const me = await agent.get('/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe('admin@lakegroup.test');
  });

  it('rejects a wrong password with a generic error', async () => {
    const res = await request(ctx.app).post('/auth/login').send({ email: 'admin@lakegroup.test', password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(res.body.error.message).toBe('Invalid email or password');
  });

  it('rejects an unknown email with the same generic error (no enumeration)', async () => {
    const res = await request(ctx.app).post('/auth/login').send({ email: 'ghost@lakegroup.test', password: 'whatever' });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid email or password');
  });

  it('rejects an inactive user with a generic error', async () => {
    const ctx2 = makeApp({
      users: [await makeUser({ email: 'gone@lakegroup.test', password: 'pw123456', active: false })],
    });
    const res = await request(ctx2.app).post('/auth/login').send({ email: 'gone@lakegroup.test', password: 'pw123456' });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid email or password');
  });

  it('writes LOGIN_SUCCESS / LOGIN_FAILED / LOGOUT audit rows with server-set actor', async () => {
    const agent = request.agent(ctx.app);
    await agent.post('/auth/login').send({ email: 'admin@lakegroup.test', password: 'correct-horse' });
    await request(ctx.app).post('/auth/login').send({ email: 'admin@lakegroup.test', password: 'nope' });
    await agent.post('/auth/logout').send({});

    const actions = ctx.db.auditRows.map((r) => r.action);
    expect(actions).toContain('LOGIN_SUCCESS');
    expect(actions).toContain('LOGIN_FAILED');
    expect(actions).toContain('LOGOUT');

    const failed = ctx.db.auditRows.find((r) => r.action === 'LOGIN_FAILED');
    expect(failed.actorId).toBeNull(); // failed attempts never attribute an actor
    expect(failed.metadata.email).toBe('admin@lakegroup.test');
    expect(failed.ip).toBeTruthy();

    const ok = ctx.db.auditRows.find((r) => r.action === 'LOGIN_SUCCESS');
    expect(ok.actorId).toBeTruthy();
    expect(ok.resource).toBe('auth/login');
  });

  it('destroys the session on logout', async () => {
    const agent = request.agent(ctx.app);
    await agent.post('/auth/login').send({ email: 'admin@lakegroup.test', password: 'correct-horse' });
    const out = await agent.post('/auth/logout').send({});
    expect(out.status).toBe(200);
    const me = await agent.get('/auth/me');
    expect(me.status).toBe(401);
  });

  it('returns 401 for /auth/me when unauthenticated', async () => {
    const res = await request(ctx.app).get('/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('revokes all sessions for the current user (including this one)', async () => {
    const agentA = request.agent(ctx.app);
    const agentB = request.agent(ctx.app);
    await agentA.post('/auth/login').send({ email: 'admin@lakegroup.test', password: 'correct-horse' });
    await agentB.post('/auth/login').send({ email: 'admin@lakegroup.test', password: 'correct-horse' });

    const res = await agentA.post('/auth/revoke-sessions').send({});
    expect(res.status).toBe(200);
    expect(res.body.revokedSessions).toBeGreaterThanOrEqual(2);

    expect((await agentA.get('/auth/me')).status).toBe(401);
    expect((await agentB.get('/auth/me')).status).toBe(401);
    const audit = ctx.db.auditRows.find((r) => r.action === 'SESSIONS_REVOKED');
    expect(audit).toBeTruthy();
  });
});

describe('auth: rate limiting', () => {
  it('blocks after 10 failed login attempts per 24 hours', async () => {
    const user = await makeUser({ email: 'lim@lakegroup.test', password: 'pw123456' });
    const ctx = makeApp({ users: [user] });

    for (let i = 0; i < 10; i += 1) {
      const res = await request(ctx.app).post('/auth/login').send({ email: 'lim@lakegroup.test', password: 'bad' });
      expect(res.status).toBe(401);
    }
    const eleventh = await request(ctx.app).post('/auth/login').send({ email: 'lim@lakegroup.test', password: 'bad' });
    expect(eleventh.status).toBe(429);
    expect(eleventh.body.error.code).toBe('RATE_LIMITED');
  });

  it('does not count successful logins against the daily budget', async () => {
    const user = await makeUser({ email: 'ok@lakegroup.test', password: 'pw123456' });
    const ctx = makeApp({ users: [user] });

    // 9 failures: budget consumed 9 of 10.
    for (let i = 0; i < 9; i += 1) {
      const res = await request(ctx.app).post('/auth/login').send({ email: 'ok@lakegroup.test', password: 'bad' });
      expect(res.status).toBe(401);
    }
    // A successful login (200) must NOT consume a slot.
    const ok = await request(ctx.app).post('/auth/login').send({ email: 'ok@lakegroup.test', password: 'pw123456' });
    expect(ok.status).toBe(200);
    // 10th failure is therefore still allowed (would be 429 if the success counted).
    const tenth = await request(ctx.app).post('/auth/login').send({ email: 'ok@lakegroup.test', password: 'bad' });
    expect(tenth.status).toBe(401);
    // 11th failure trips the limiter.
    const eleventh = await request(ctx.app).post('/auth/login').send({ email: 'ok@lakegroup.test', password: 'bad' });
    expect(eleventh.status).toBe(429);
  });
});
