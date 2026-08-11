import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { makeApp, makeUser } from './helpers.js';
import { validatePasswordPolicy } from '../src/lib/password-policy.js';

describe('password policy (SECURITY_ROADMAP Phase 2)', () => {
  it('accepts a strong passphrase', () => {
    const r = validatePasswordPolicy({ password: 'correct horse battery staple' });
    expect(r.ok).toBe(true);
  });

  it('accepts the minimum length', () => {
    const r = validatePasswordPolicy({ password: 'abcdefgh' });
    expect(r.ok).toBe(true);
  });

  it('rejects passwords under the minimum length', () => {
    const r = validatePasswordPolicy({ password: 'short' });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/at least 8 characters/);
  });

  it('rejects common passwords case-insensitively', () => {
    for (const pw of ['password', 'Password', '12345678', 'qwerty', 'letmein']) {
      const r = validatePasswordPolicy({ password: pw });
      expect(r.ok).toBe(false, `${pw} should be rejected`);
    }
    // The message for a policy-length common password is specific.
    const r = validatePasswordPolicy({ password: 'Password' });
    expect(r.message).toMatch(/too common/);
  });

  it('rejects passwords that embed the email local-part', () => {
    const r = validatePasswordPolicy({ password: 'admin2026secret', email: 'admin@lakegroup.test' });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/must not contain your email/);
  });

  it('does not reject on trivial local-parts', () => {
    const r = validatePasswordPolicy({ password: 'excellent-dolphin-42', email: 'a@lakegroup.test' });
    expect(r.ok).toBe(true);
  });

  it('rejects non-string input', () => {
    const r = validatePasswordPolicy({ password: null });
    expect(r.ok).toBe(false);
  });
});

describe('self-service password change', () => {
  let ctx;
  let userId;

  beforeEach(async () => {
    const user = await makeUser({ email: 'me@lakegroup.test', password: 'original-pass-1', role: 'EDITOR' });
    userId = user.id;
    ctx = makeApp({ users: [user] });
  });

  it('requires authentication', async () => {
    const res = await request(ctx.app).post('/auth/change-password').send({
      currentPassword: 'x',
      newPassword: 'brand-new-pass-9',
    });
    expect(res.status).toBe(401);
  });

  it('rejects a wrong current password and keeps the old hash working', async () => {
    const agent = request.agent(ctx.app);
    await agent.post('/auth/login').send({ email: 'me@lakegroup.test', password: 'original-pass-1' });

    const res = await agent.post('/auth/change-password').send({
      currentPassword: 'wrong-current',
      newPassword: 'brand-new-pass-9',
    });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Current password is incorrect');

    // Old password still works, new one does not.
    expect(
      (await request(ctx.app).post('/auth/login').send({ email: 'me@lakegroup.test', password: 'original-pass-1' })).status,
    ).toBe(200);
    expect(
      (await request(ctx.app).post('/auth/login').send({ email: 'me@lakegroup.test', password: 'brand-new-pass-9' })).status,
    ).toBe(401);

    const audit = ctx.db.auditRows.find((r) => r.action === 'PASSWORD_CHANGE_FAILED');
    expect(audit).toBeTruthy();
    expect(audit.actorId).toBe(userId);
  });

  it('rejects a weak new password with WEAK_PASSWORD', async () => {
    const agent = request.agent(ctx.app);
    await agent.post('/auth/login').send({ email: 'me@lakegroup.test', password: 'original-pass-1' });

    const res = await agent.post('/auth/change-password').send({
      currentPassword: 'original-pass-1',
      newPassword: 'password',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('WEAK_PASSWORD');
  });

  it('changes the password, revokes other sessions, keeps the current one, and audits', async () => {
    const agentA = request.agent(ctx.app);
    const agentB = request.agent(ctx.app);
    await agentA.post('/auth/login').send({ email: 'me@lakegroup.test', password: 'original-pass-1' });
    await agentB.post('/auth/login').send({ email: 'me@lakegroup.test', password: 'original-pass-1' });

    const res = await agentA.post('/auth/change-password').send({
      currentPassword: 'original-pass-1',
      newPassword: 'brand-new-pass-9',
    });
    expect(res.status).toBe(200);

    // Old password rejected, new one works.
    expect(
      (await request(ctx.app).post('/auth/login').send({ email: 'me@lakegroup.test', password: 'original-pass-1' })).status,
    ).toBe(401);
    expect(
      (await request(ctx.app).post('/auth/login').send({ email: 'me@lakegroup.test', password: 'brand-new-pass-9' })).status,
    ).toBe(200);

    // Other session revoked, current session survives.
    expect((await agentB.get('/auth/me')).status).toBe(401);
    expect((await agentA.get('/auth/me')).status).toBe(200);

    const audit = ctx.db.auditRows.find((r) => r.action === 'PASSWORD_CHANGED');
    expect(audit).toBeTruthy();
    expect(audit.actorId).toBe(userId);
    expect(audit.resource).toBe('auth/change-password');
  });
});

describe('admin password reset enforces the policy', () => {
  it('rejects a common password with WEAK_PASSWORD', async () => {
    const admin = await makeUser({ email: 'admin@lakegroup.test', password: 'pw-admin-1', role: 'SUPER_ADMIN' });
    const victim = await makeUser({ email: 'victim@lakegroup.test', password: 'old-pass-1' });
    const ctx = makeApp({ users: [admin, victim] });

    const agent = request.agent(ctx.app);
    await agent.post('/auth/login').send({ email: 'admin@lakegroup.test', password: 'pw-admin-1' });

    const res = await agent.patch(`/admin/users/${victim.id}/password`).send({ password: 'password' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('WEAK_PASSWORD');
  });

  it('still resets to a policy-compliant password with audit + revocation', async () => {
    const admin = await makeUser({ email: 'admin@lakegroup.test', password: 'pw-admin-1', role: 'SUPER_ADMIN' });
    const victim = await makeUser({ email: 'victim@lakegroup.test', password: 'old-pass-1' });
    const ctx = makeApp({ users: [admin, victim] });

    const adminAgent = request.agent(ctx.app);
    await adminAgent.post('/auth/login').send({ email: 'admin@lakegroup.test', password: 'pw-admin-1' });
    const victimAgent = request.agent(ctx.app);
    await victimAgent.post('/auth/login').send({ email: 'victim@lakegroup.test', password: 'old-pass-1' });

    const res = await adminAgent.patch(`/admin/users/${victim.id}/password`).send({ password: 'reset-pass-9' });
    expect(res.status).toBe(200);

    // Victim session revoked, old password dead, new password works.
    expect((await victimAgent.get('/auth/me')).status).toBe(401);
    expect(
      (await request(ctx.app).post('/auth/login').send({ email: 'victim@lakegroup.test', password: 'old-pass-1' })).status,
    ).toBe(401);
    expect(
      (await request(ctx.app).post('/auth/login').send({ email: 'victim@lakegroup.test', password: 'reset-pass-9' })).status,
    ).toBe(200);

    const audit = ctx.db.auditRows.find((r) => r.action === 'PASSWORD_RESET');
    expect(audit).toBeTruthy();
    expect(audit.metadata.email).toBe('victim@lakegroup.test');
    expect(audit.actorId).toBe(admin.id);
  });
});
