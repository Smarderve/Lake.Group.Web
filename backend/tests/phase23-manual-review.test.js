import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { makeApp, makeUser } from './helpers.js';

/**
 * SECURITY_ROADMAP Phase 23 — Manual Security Review regressions.
 *
 * Business-logic (abuse-of-feature) findings closed this phase:
 *   1. Self-role-change lockout — a SUPER_ADMIN demoting themselves takes
 *      effect immediately (requireAuth reloads the role from the DB every
 *      request) and permanently locks the admin surface, since only a
 *      SUPER_ADMIN can promote again. Blocked + audited.
 *   2. Last-admin defense-in-depth — a demotion that would leave zero
 *      active SUPER_ADMINs is refused, without over-blocking the harmless
 *      demotion of an inactive admin.
 *   3. Unbounded admin read of a publicly-written table — the unanswered-
 *      questions list is fed by an UNAUTHENTICATED public POST, so it now
 *      carries the same pagination caps as every other admin list.
 */

async function makeCtx({ users } = {}) {
  const list = users || [
    await makeUser({ email: 'admin@lakegroup.test', password: 'pw-admin-1', role: 'SUPER_ADMIN' }),
    await makeUser({ email: 'admin2@lakegroup.test', password: 'pw-admin-2', role: 'SUPER_ADMIN' }),
    await makeUser({ email: 'editor@lakegroup.test', password: 'pw-edit-1', role: 'EDITOR' }),
  ];
  const ctx = makeApp({ users: list });
  const login = async (email, password) => {
    const agent = request.agent(ctx.app);
    const res = await agent.post('/auth/login').send({ email, password });
    expect(res.status).toBe(200);
    return agent;
  };
  return {
    ...ctx,
    admin: await login('admin@lakegroup.test', 'pw-admin-1'),
    ids: {
      admin: 'u_adminlakegrouptest',
      admin2: 'u_admin2lakegrouptest',
      editor: 'u_editorlakegrouptest',
    },
  };
}

describe('SECURITY_ROADMAP Phase 23 — role-change business-logic guards', () => {
  let ctx;
  beforeEach(async () => { ctx = await makeCtx(); });

  it('a SUPER_ADMIN cannot demote themselves (immediate self-lockout is blocked)', async () => {
    const res = await ctx.admin.patch(`/admin/users/${ctx.ids.admin}/role`).send({ role: 'EDITOR' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('ROLE_SELF_CHANGE');

    const me = await ctx.db.user.findUnique({ where: { id: ctx.ids.admin } });
    expect(me.role).toBe('SUPER_ADMIN');

    // The attempt is on the audit trail with the reason.
    const denied = ctx.db.auditRows.find((r) => r.action === 'ROLE_CHANGE_DENIED');
    expect(denied).toBeTruthy();
    expect(denied.metadata.reason).toBe('self_role_change');
    expect(denied.actorId).toBe(ctx.ids.admin);
  });

  it('self-promotion to a different role is equally refused', async () => {
    const res = await ctx.admin.patch(`/admin/users/${ctx.ids.admin}/role`).send({ role: 'REVIEWER' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('ROLE_SELF_CHANGE');
  });

  it('demoting another SUPER_ADMIN is allowed while an active admin remains', async () => {
    const res = await ctx.admin.patch(`/admin/users/${ctx.ids.admin2}/role`).send({ role: 'EDITOR' });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('EDITOR');

    const audit = ctx.db.auditRows.find((r) => r.action === 'ROLE_CHANGE');
    expect(audit).toBeTruthy();
    expect(audit.metadata.to).toBe('EDITOR');
    expect(audit.metadata.from).toBe('SUPER_ADMIN');
  });

  it('demoting an INACTIVE SUPER_ADMIN is not over-blocked (an active admin remains)', async () => {
    const inactiveAdmin = await makeUser({
      email: 'ghost@lakegroup.test', password: 'pw-ghost-1', role: 'SUPER_ADMIN', active: false,
    });
    const ctx2 = await makeCtx({ users: [
      await makeUser({ email: 'admin@lakegroup.test', password: 'pw-admin-1', role: 'SUPER_ADMIN' }),
      inactiveAdmin,
      await makeUser({ email: 'editor@lakegroup.test', password: 'pw-edit-1', role: 'EDITOR' }),
    ] });
    const res = await ctx2.admin.patch(`/admin/users/u_ghostlakegrouptest/role`).send({ role: 'EDITOR' });
    // Guard semantics: the demotion leaves one ACTIVE SUPER_ADMIN, so it
    // succeeds — the LAST_SUPER_ADMIN branch must not fire.
    expect(res.status).toBe(200);
  });

  it('ordinary role changes between non-admins still work (no over-blocking)', async () => {
    const res = await ctx.admin.patch(`/admin/users/${ctx.ids.editor}/role`).send({ role: 'REVIEWER' });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('REVIEWER');
  });
});

describe('SECURITY_ROADMAP Phase 23 — public-write-fed admin read is bounded', () => {
  let ctx;
  beforeEach(async () => { ctx = await makeCtx(); });

  it('the unanswered-questions admin list is paginated with caps and a total', async () => {
    for (let i = 0; i < 3; i += 1) {
      await ctx.db.unansweredQuestion.create({
        data: { question: `unanswerable question ${i}`, language: 'en' },
      });
    }
    const res = await ctx.admin.get('/admin/unanswered-questions?limit=2&offset=1');
    expect(res.status).toBe(200);
    expect(res.body.unansweredQuestions.length).toBe(2);
    expect(res.body.total).toBe(3);
    expect(res.body.limit).toBe(2);
    expect(res.body.offset).toBe(1);
  });

  it('malformed pagination on unanswered-questions is rejected', async () => {
    const res = await ctx.admin.get('/admin/unanswered-questions?limit=500');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('non-admins cannot read the unanswered-questions list (role gate holds on the changed route)', async () => {
    const viewer = request.agent(ctx.app);
    const login = await viewer.post('/auth/login').send({ email: 'editor@lakegroup.test', password: 'pw-edit-1' });
    expect(login.status).toBe(200);
    const res = await viewer.get('/admin/unanswered-questions');
    expect(res.status).toBe(403);
  });
});
