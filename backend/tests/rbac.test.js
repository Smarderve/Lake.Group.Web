import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { makeApp, makeUser } from './helpers.js';

describe('RBAC: /admin/ping', () => {
  it('rejects an unauthenticated request with 401', async () => {
    const ctx = makeApp();
    const res = await request(ctx.app).get('/admin/ping');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('rejects a wrong-role request with 403', async () => {
    const editor = await makeUser({ email: 'editor@lakegroup.test', password: 'pw123456', role: 'EDITOR' });
    const ctx = makeApp({ users: [editor] });
    const agent = request.agent(ctx.app);
    await agent.post('/auth/login').send({ email: 'editor@lakegroup.test', password: 'pw123456' });

    const res = await agent.get('/admin/ping');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('allows a SUPER_ADMIN through', async () => {
    const admin = await makeUser({ email: 'admin@lakegroup.test', password: 'pw123456', role: 'SUPER_ADMIN' });
    const ctx = makeApp({ users: [admin] });
    const agent = request.agent(ctx.app);
    await agent.post('/auth/login').send({ email: 'admin@lakegroup.test', password: 'pw123456' });

    const res = await agent.get('/admin/ping');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.user.role).toBe('SUPER_ADMIN');
  });
});

describe('RBAC: privileged actions (role change / password reset / revocation)', () => {
  it('SUPER_ADMIN can change a role and the change is audited', async () => {
    const admin = await makeUser({ email: 'admin@lakegroup.test', password: 'pw123456', role: 'SUPER_ADMIN' });
    const viewer = await makeUser({ email: 'viewer@lakegroup.test', password: 'pw123456' });
    const ctx = makeApp({ users: [admin, viewer] });

    const agent = request.agent(ctx.app);
    await agent.post('/auth/login').send({ email: 'admin@lakegroup.test', password: 'pw123456' });
    const res = await agent.patch(`/admin/users/${viewer.id}/role`).send({ role: 'EDITOR' });

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('EDITOR');

    const change = ctx.db.auditRows.find((r) => r.action === 'ROLE_CHANGE');
    expect(change.metadata.from).toBe('VIEWER');
    expect(change.metadata.to).toBe('EDITOR');
    expect(change.actorId).toBe(admin.id);
  });

  it('requires recent authentication for privileged actions (window 0 → rejected)', async () => {
    const admin = await makeUser({ email: 'admin@lakegroup.test', password: 'pw123456', role: 'SUPER_ADMIN' });
    const viewer = await makeUser({ email: 'viewer@lakegroup.test', password: 'pw123456' });
    const ctx = makeApp({ users: [admin, viewer], options: { recentAuthWindowMs: 0 } });

    const agent = request.agent(ctx.app);
    await agent.post('/auth/login').send({ email: 'admin@lakegroup.test', password: 'pw123456' });
    const res = await agent.patch(`/admin/users/${viewer.id}/role`).send({ role: 'EDITOR' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('REAUTH_REQUIRED');
  });

  it('admin password reset revokes the target sessions and old password stops working', async () => {
    const admin = await makeUser({ email: 'admin@lakegroup.test', password: 'pw123456', role: 'SUPER_ADMIN' });
    const victim = await makeUser({ email: 'victim@lakegroup.test', password: 'old-pass' });
    const ctx = makeApp({ users: [admin, victim] });

    const victimAgent = request.agent(ctx.app);
    await victimAgent.post('/auth/login').send({ email: 'victim@lakegroup.test', password: 'old-pass' });

    const adminAgent = request.agent(ctx.app);
    await adminAgent.post('/auth/login').send({ email: 'admin@lakegroup.test', password: 'pw123456' });
    const res = await adminAgent.patch(`/admin/users/${victim.id}/password`).send({ password: 'brand-new-pass' });
    expect(res.status).toBe(200);

    // Old session revoked, old password rejected, new password works.
    expect((await victimAgent.get('/auth/me')).status).toBe(401);
    expect((await request(ctx.app).post('/auth/login').send({ email: 'victim@lakegroup.test', password: 'old-pass' })).status).toBe(401);
    expect((await request(ctx.app).post('/auth/login').send({ email: 'victim@lakegroup.test', password: 'brand-new-pass' })).status).toBe(200);
  });

  it('admin can revoke every session of another user', async () => {
    const admin = await makeUser({ email: 'admin@lakegroup.test', password: 'pw123456', role: 'SUPER_ADMIN' });
    const target = await makeUser({ email: 'target@lakegroup.test', password: 'pw123456' });
    const ctx = makeApp({ users: [admin, target] });

    const tAgent = request.agent(ctx.app);
    await tAgent.post('/auth/login').send({ email: 'target@lakegroup.test', password: 'pw123456' });

    const adminAgent = request.agent(ctx.app);
    await adminAgent.post('/auth/login').send({ email: 'admin@lakegroup.test', password: 'pw123456' });
    const res = await adminAgent.post(`/admin/users/${target.id}/revoke-sessions`).send({});
    expect(res.status).toBe(200);
    expect(res.body.revokedSessions).toBeGreaterThanOrEqual(1);

    expect((await tAgent.get('/auth/me')).status).toBe(401);
    const audit = ctx.db.auditRows.find((r) => r.action === 'SESSIONS_REVOKED');
    expect(audit.metadata.email).toBe('target@lakegroup.test');
  });
});
