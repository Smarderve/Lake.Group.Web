import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { makeApp, makeUser } from './helpers.js';

const EDIT_BODY = (value, reason = 'Update from latest figures') => ({
  label: 'Employees',
  value,
  unit: 'employees',
  source: 'Lake Group HR fact sheet',
  reason,
});

async function login(app, email, password) {
  const agent = request.agent(app);
  const res = await agent.post('/auth/login').send({ email, password });
  expect(res.status).toBe(200);
  return agent;
}

async function makeCtx() {
  const users = [
    await makeUser({ email: 'editor@lakegroup.test', password: 'pw-editor-1', role: 'EDITOR' }),
    await makeUser({ email: 'reviewer@lakegroup.test', password: 'pw-review-1', role: 'REVIEWER' }),
    await makeUser({ email: 'admin@lakegroup.test', password: 'pw-admin-1', role: 'SUPER_ADMIN' }),
  ];
  const ctx = makeApp({ users });
  return {
    ...ctx,
    editor: await login(ctx.app, 'editor@lakegroup.test', 'pw-editor-1'),
    reviewer: await login(ctx.app, 'reviewer@lakegroup.test', 'pw-review-1'),
    admin: await login(ctx.app, 'admin@lakegroup.test', 'pw-admin-1'),
  };
}

const publicGet = (app, key) => request(app).get(`/api/public/metrics/${key}`);

describe('Phase 3 — corporate metrics governance', () => {
  it('full flow: create 4,600+ → publish → edit 4,850+ → publish → rollback → 4,600+, with audit trail', async () => {
    const ctx = await makeCtx();

    // --- first cycle: 4,600+ ---
    const created = await ctx.editor
      .post('/admin/metrics')
      .send({ key: 'employees', ...EDIT_BODY('4,600+', 'Initial baseline from Phase 0 audit') });
    expect(created.status).toBe(201);
    expect(created.body.metric.status).toBe('DRAFT');
    const id = created.body.metric.id;

    const submitted = await ctx.editor.post(`/admin/metrics/${id}/submit`).send({});
    expect(submitted.status).toBe(200);
    expect(submitted.body.metric.status).toBe('IN_REVIEW');

    const approved = await ctx.reviewer.post(`/admin/metrics/${id}/approve`).send({});
    expect(approved.status).toBe(200);
    expect(approved.body.metric.status).toBe('APPROVED');

    const published = await ctx.reviewer.post(`/admin/metrics/${id}/publish`).send({});
    expect(published.status).toBe(200);
    expect(published.body.metric.status).toBe('PUBLISHED');

    const first = await publicGet(ctx.app, 'employees');
    expect(first.status).toBe(200);
    expect(first.body.metric.value).toBe('4,600+');
    expect(first.body.metric.status).toBeUndefined(); // internal fields never leak

    // --- second cycle: 4,850+ ---
    const edited = await ctx.editor.patch(`/admin/metrics/${id}`).send(EDIT_BODY('4,850+', 'Q3 workforce update'));
    expect(edited.status).toBe(200);
    expect(edited.body.metric.status).toBe('DRAFT'); // edit reopens the cycle
    expect(edited.body.metric.value).toBe('4,850+');

    await ctx.editor.post(`/admin/metrics/${id}/submit`).send({});
    await ctx.reviewer.post(`/admin/metrics/${id}/approve`).send({});
    const republished = await ctx.reviewer.post(`/admin/metrics/${id}/publish`).send({});
    expect(republished.body.metric.value).toBe('4,850+');

    const second = await publicGet(ctx.app, 'employees');
    expect(second.body.metric.value).toBe('4,850+');

    // --- audit trail: every transition recorded with previous → new value ---
    const actions = ctx.db.auditRows.map((r) => r.action);
    for (const action of ['METRIC_CREATED', 'METRIC_EDITED', 'METRIC_SUBMITTED', 'METRIC_APPROVED', 'METRIC_PUBLISHED']) {
      expect(actions).toContain(action);
    }
    const editAudit = ctx.db.auditRows.find((r) => r.action === 'METRIC_EDITED');
    expect(editAudit.metadata.previousValue).toBe('4,600+');
    expect(editAudit.metadata.newValue).toBe('4,850+');
    expect(editAudit.metadata.fromStatus).toBe('PUBLISHED');
    expect(editAudit.metadata.toStatus).toBe('DRAFT');

    // --- rollback (admin) ---
    const rolledBack = await ctx.admin.post(`/admin/metrics/${id}/rollback`).send({});
    expect(rolledBack.status).toBe(200);
    expect(rolledBack.body.metric.status).toBe('PUBLISHED');
    expect(rolledBack.body.metric.value).toBe('4,600+');

    const afterRollback = await publicGet(ctx.app, 'employees');
    expect(afterRollback.body.metric.value).toBe('4,600+');

    expect(ctx.db.auditRows.some((r) => r.action === 'METRIC_ROLLED_BACK')).toBe(true);
    const rollbackAudit = ctx.db.auditRows.find((r) => r.action === 'METRIC_ROLLED_BACK');
    expect(rollbackAudit.metadata.previousValue).toBe('4,850+');
    expect(rollbackAudit.metadata.newValue).toBe('4,600+');
  });

  it('public endpoint returns 404 for anything not PUBLISHED (draft, in-review, approved)', async () => {
    const ctx = await makeCtx();

    const created = await ctx.editor
      .post('/admin/metrics')
      .send({ key: 'trucks', label: 'Trucks', value: '700+', unit: 'trucks', source: 'Fleet registry', reason: 'New metric' });
    expect(created.status).toBe(201);

    expect((await publicGet(ctx.app, 'trucks')).status).toBe(404); // DRAFT
    await ctx.editor.post(`/admin/metrics/${created.body.metric.id}/submit`).send({});
    expect((await publicGet(ctx.app, 'trucks')).status).toBe(404); // IN_REVIEW
    await ctx.reviewer.post(`/admin/metrics/${created.body.metric.id}/approve`).send({});
    expect((await publicGet(ctx.app, 'trucks')).status).toBe(404); // APPROVED — only PUBLISHED is public

    // publishing makes it visible
    await ctx.reviewer.post(`/admin/metrics/${created.body.metric.id}/publish`).send({});
    expect((await publicGet(ctx.app, 'trucks')).status).toBe(200);

    // unknown key
    expect((await publicGet(ctx.app, 'does-not-exist')).status).toBe(404);
  });

  it('separation of duties: the submitter cannot approve their own submission', async () => {
    const ctx = await makeCtx();

    const created = await ctx.admin
      .post('/admin/metrics')
      .send({ key: 'stations', label: 'Fuel Stations', value: '154', unit: 'fuel stations', source: 'Retail network registry', reason: 'New metric' });
    await ctx.admin.post(`/admin/metrics/${created.body.metric.id}/submit`).send({});

    // admin submitted it; admin is SUPER_ADMIN (an approver role) but must not approve own change
    const selfApprove = await ctx.admin.post(`/admin/metrics/${created.body.metric.id}/approve`).send({});
    expect(selfApprove.status).toBe(403);
    expect(selfApprove.body.error.code).toBe('SEPARATION_OF_DUTIES');

    // a different approver can
    const ok = await ctx.reviewer.post(`/admin/metrics/${created.body.metric.id}/approve`).send({});
    expect(ok.status).toBe(200);
  });

  it('a non-approver role cannot approve (403 FORBIDDEN)', async () => {
    const users = [await makeUser({ email: 'viewer@lakegroup.test', password: 'pw-viewer-1', role: 'VIEWER' })];
    const ctx = makeApp({ users });
    const viewer = await login(ctx.app, 'viewer@lakegroup.test', 'pw-viewer-1');
    const res = await viewer.post('/admin/metrics/something/approve').send({});
    expect(res.status).toBe(403);
  });

  it('verify records a re-check without changing value or status, and clears the stale flag', async () => {
    const ctx = await makeCtx();

    // published metric that has NOT been re-verified (verificationDate null)
    const created = await ctx.editor
      .post('/admin/metrics')
      .send({ key: 'fleet', label: 'Trucks', value: '700+', unit: 'trucks', source: 'Fleet registry', reason: 'New metric' });
    const id = created.body.metric.id;
    await ctx.editor.post(`/admin/metrics/${id}/submit`).send({});
    await ctx.reviewer.post(`/admin/metrics/${id}/approve`).send({});
    await ctx.reviewer.post(`/admin/metrics/${id}/publish`).send({});

    // it is stale (never verified)
    let stale = await ctx.reviewer.get('/admin/metrics/stale');
    expect(stale.body.metrics.map((m) => m.key)).toContain('fleet');

    // verify (as reviewer) — status and value must stay PUBLISHED / 700+
    const verified = await ctx.reviewer.post(`/admin/metrics/${id}/verify`).send({ note: 'Checked against fleet registry' });
    expect(verified.status).toBe(200);
    expect(verified.body.metric.status).toBe('PUBLISHED');
    expect(verified.body.metric.value).toBe('700+');
    expect(verified.body.metric.verificationStatus).toBe('VERIFIED');

    // no longer stale
    stale = await ctx.reviewer.get('/admin/metrics/stale');
    expect(stale.body.metrics.map((m) => m.key)).not.toContain('fleet');

    // audited
    const audit = ctx.db.auditRows.find((r) => r.action === 'METRIC_VERIFIED');
    expect(audit).toBeTruthy();
    expect(audit.metadata.previousVerificationDate).toBeNull();
    expect(audit.metadata.newVerificationDate).toBeTruthy();

    // still publicly served after verify
    expect((await publicGet(ctx.app, 'fleet')).body.metric.value).toBe('700+');
  });

  it('stale detection flags metrics with old or missing verification dates', async () => {
    const ctx = await makeCtx();

    const old = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000); // 200 days ago
    await ctx.editor.post('/admin/metrics').send({
      key: 'fleet', label: 'Trucks', value: '700+', unit: 'trucks', source: 'Fleet registry',
      reason: 'New metric', verificationStatus: 'VERIFIED', verificationDate: old.toISOString(),
    });
    await ctx.editor.post('/admin/metrics').send({
      key: 'recent', label: 'Countries', value: '8', unit: 'countries', source: 'Operations map',
      reason: 'New metric', verificationStatus: 'VERIFIED', verificationDate: new Date().toISOString(),
    });
    await ctx.editor.post('/admin/metrics').send({
      key: 'never-verified', label: 'Subsidiaries', value: '20+', unit: 'subsidiaries', source: 'Registry',
      reason: 'New metric',
    });

    const stale = await ctx.reviewer.get('/admin/metrics/stale');
    expect(stale.status).toBe(200);
    const keys = stale.body.metrics.map((m) => m.key);
    expect(keys).toContain('fleet'); // old verification date
    expect(keys).toContain('never-verified'); // no verification date at all
    expect(keys).not.toContain('recent'); // freshly verified
    expect(keys).not.toContain('employees'); // never created in this test
  });
});
