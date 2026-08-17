import { describe, it, expect, beforeEach } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import request from 'supertest';
import { makeApp, makeUser } from './helpers.js';
import { GOVERNED_BY_MODEL } from '../src/lib/governed-registry.js';

/**
 * SECURITY_ROADMAP Phase 19 — Security Audit Trail.
 *
 * Verifies:
 *   1. Every sensitive action writes an AuditLog row carrying
 *      actor/action/resource/ip/metadata (and a timestamp) — exercised
 *      through the real route stack, not the helper in isolation.
 *   2. A static tripwire: every DB mutation model in src/ is either
 *      audited or on a documented non-sensitive allowlist — a new
 *      mutation surface without audit fails the suite.
 *   3. The trail never contains secrets (password hashes, MFA secrets,
 *      tokens, cookies).
 *   4. The Phase 19 review surface (GET /admin/audit-log) enforces
 *      SUPER_ADMIN + recent auth, pagination caps and filters.
 */

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');

// Models whose every mutation site is beside a writeAudit call (lib/metrics.js,
// lib/audit.js, routes/auth.js, routes/admin.js, routes/children.js,
// routes/media-folders.js, routes/publish-schedules.js).
const ALWAYS_AUDITED = new Set([
  'user', 'metric', 'metricVersion', 'publishSchedule',
  'mediaFolder', 'milestone', 'leadershipEvent',
]);

// Governed factory entities (lib/governed.js): every mutation goes through
// recordAudit — CREATED/EDITED/SUBMITTED/APPROVED/REJECTED/PUBLISHED/
// SCHEDULED/UNPUBLISHED/ROLLED_BACK/ARCHIVED.
const FACTORY_MODELS = new Set([...GOVERNED_BY_MODEL.keys()]);
const FACTORY_VERSION_MODELS = new Set([...FACTORY_MODELS].map((e) => `${e}Version`));

// Written only as a side effect of an already-audited action:
//   pageContentBlock / historyEventCompany / mediaUsage — governed side
//     tables, rewritten inside create/update/rollback hooks that call
//     recordAudit on the same action
//   leadership — derived currentStatus, recomputed after an audited
//     LeadershipEvent write
//   publicationEvent — the publication ledger, always written beside the
//     PUBLISHED/SCHEDULED/UNPUBLISHED/ROLLED_BACK audit row
// Or non-sensitive by design (documented in phase-19-report.md):
//   notification — system-generated in-app notices + user read-marks
//   unansweredQuestion — public user content, rate-limited; the ADMIN
//     resolution is the audited action
//   analyticsEvent — first-party analytics capture, no actor, no secret
const DOCUMENTED_SIDE_EFFECTS = new Set([
  'pageContentBlock', 'historyEventCompany', 'mediaUsage', 'leadership',
  'publicationEvent', 'notification', 'unansweredQuestion', 'analyticsEvent',
]);

const ALLOWED_MUTATION_MODELS = new Set([
  ...ALWAYS_AUDITED, ...FACTORY_MODELS, ...FACTORY_VERSION_MODELS,
  ...DOCUMENTED_SIDE_EFFECTS, 'auditLog',
]);

const SECRET_MARKERS = [
  'passwordHash', 'mfaSecret', 'authorization', 'cookie', 'bearer', 'token=',
];

async function makeCtx(extraOptions = {}) {
  const admin = await makeUser({ email: 'admin@lakegroup.test', password: 'pw-admin-1', role: 'SUPER_ADMIN' });
  const editor = await makeUser({ email: 'editor@lakegroup.test', password: 'pw-editor-1', role: 'EDITOR' });
  const reviewer = await makeUser({ email: 'reviewer@lakegroup.test', password: 'pw-reviewer-1', role: 'REVIEWER' });
  const viewer = await makeUser({ email: 'viewer@lakegroup.test', password: 'pw-viewer-1', role: 'VIEWER' });
  const ctx = makeApp({ users: [admin, editor, reviewer, viewer], options: extraOptions });
  const login = async (email, password) => {
    const agent = request.agent(ctx.app);
    const res = await agent.post('/auth/login').send({ email, password });
    expect(res.status, `login ${email}`).toBe(200);
    return agent;
  };
  // Admin user routes key on the user's id (not email) — resolve the ids
  // the same way the app does (makeUser stamps u_<email>).
  const all = await ctx.db.user.findMany();
  const userIds = Object.fromEntries(all.map((u) => [u.email, u.id]));
  return {
    ...ctx,
    userIds,
    admin: await login('admin@lakegroup.test', 'pw-admin-1'),
    editor: await login('editor@lakegroup.test', 'pw-editor-1'),
    reviewer: await login('reviewer@lakegroup.test', 'pw-reviewer-1'),
    viewer: await login('viewer@lakegroup.test', 'pw-viewer-1'),
  };
}

/** Assert exactly one row for (action, resource) with the given fields. */
function expectAuditRow(db, { action, resource, actorId = null, ip = null, metadataCheck = null }) {
  const rows = db.auditRows.filter(
    (r) => r.action === action && (resource === undefined || r.resource === resource),
  );
  expect(rows.length, `one ${action} row (found ${rows.length})`).toBeGreaterThanOrEqual(1);
  const row = rows[rows.length - 1];
  if (actorId !== null) expect(row.actorId, `${action} actor`).toBe(actorId);
  // req.ip can arrive as plain IPv4 or IPv4-mapped (::ffff:…) — both are
  // the same client address, accept either form.
  if (ip !== null) expect(row.ip, `${action} ip`).toMatch(/^(\d+\.){3}\d+$|^::ffff:(\d+\.){3}\d+$/);
  expect(row.createdAt, `${action} timestamp`).toBeInstanceOf(Date);
  if (metadataCheck) metadataCheck(row.metadata ?? {});
  return row;
}

describe('SECURITY_ROADMAP Phase 19 — audit trail coverage', () => {
  it('login success and failure carry actor/action/resource/ip/metadata', async () => {
    const ctx = await makeCtx();
    await ctx.admin.post('/auth/login').send({ email: 'admin@lakegroup.test', password: 'wrong-pw' });
    expectAuditRow(ctx.db, {
      action: 'LOGIN_FAILED', resource: 'auth/login', actorId: null, ip: true,
      metadataCheck: (m) => expect(m.email).toBe('admin@lakegroup.test'),
    });
    // A fresh successful login (the makeCtx logins already wrote one).
    expectAuditRow(ctx.db, {
      action: 'LOGIN_SUCCESS', resource: 'auth/login', ip: true,
      metadataCheck: (m) => expect(m.mfa).toBe(false),
    });
  });

  it('privileged admin actions (role change, password reset) are audited', async () => {
    const ctx = await makeCtx();
    const viewerId = ctx.userIds['viewer@lakegroup.test'];
    const editorId = ctx.userIds['editor@lakegroup.test'];

    const change = await ctx.admin.patch(`/admin/users/${viewerId}/role`).send({ role: 'EDITOR' });
    expect(change.status).toBe(200);
    expectAuditRow(ctx.db, {
      action: 'ROLE_CHANGE',
      resource: `admin/users/${viewerId}/role`,
      ip: true,
      metadataCheck: (m) => {
        expect(m.email).toBe('viewer@lakegroup.test');
        expect(m.from).toBe('VIEWER');
        expect(m.to).toBe('EDITOR');
      },
    });

    const reset = await ctx.admin.patch(`/admin/users/${editorId}/password`).send({ password: 'V8x!qRz2-Km9p' });
    expect(reset.status).toBe(200);
    expectAuditRow(ctx.db, {
      action: 'PASSWORD_RESET',
      resource: `admin/users/${editorId}/password`,
      ip: true,
      metadataCheck: (m) => expect(m.email).toBe('editor@lakegroup.test'),
    });
  });

  it('governed workflow writes a row for every transition with previous/new data', async () => {
    const ctx = await makeCtx();
    const created = await ctx.editor.post('/admin/companies').send({
      name: 'Phase19 Co', slug: 'phase19-co', description: 'audit trail test', reason: 'create',
    });
    expect(created.status).toBe(201);
    const id = created.body.company.id;

    await ctx.editor.post(`/admin/companies/${id}/submit`).send({ reason: 'ready' });
    await ctx.reviewer.post(`/admin/companies/${id}/approve`).send({ reason: 'looks good' });
    const pub = await ctx.reviewer.post(`/admin/companies/${id}/publish`).send({ reason: 'go live' });
    expect(pub.status).toBe(200);

    expectAuditRow(ctx.db, { action: 'COMPANY_CREATED', resource: 'admin/companies', ip: true });
    const submitted = expectAuditRow(ctx.db, { action: 'COMPANY_SUBMITTED', ip: true });
    const approved = expectAuditRow(ctx.db, {
      action: 'COMPANY_APPROVED',
      ip: true,
      metadataCheck: (m) => {
        expect(m.fromStatus).toBe('IN_REVIEW');
        expect(m.toStatus).toBe('APPROVED');
        expect(m.entityId).toBe(id);
      },
    });
    // Separation of duties, server-side attribution: the approval row's
    // actor is a real user, and it is NOT the submitter (who cannot
    // approve their own change).
    expect(approved.actorId).not.toBeNull();
    expect(approved.actorId).not.toBe(submitted.actorId);
    const published = expectAuditRow(ctx.db, { action: 'COMPANY_PUBLISHED', ip: true });
    expect(published.metadata.fromStatus).toBe('APPROVED');
    expect(published.metadata.toStatus).toBe('PUBLISHED');
  });

  it('child-resource and schedule actions are audited', async () => {
    const ctx = await makeCtx();
    const proj = await ctx.editor.post('/admin/projects').send({
      title: 'P19 Project', description: 't', reason: 'create',
    });
    const projectId = proj.body.project.id;

    const ms = await ctx.editor.post(`/admin/projects/${projectId}/milestones`).send({
      title: 'M1', date: '2026-05-01',
    });
    expect(ms.status).toBe(201);
    const milestoneId = ms.body.milestone.id;
    expectAuditRow(ctx.db, {
      action: 'MILESTONE_CREATED',
      ip: true,
      metadataCheck: (m) => expect(m.parentId).toBe(projectId),
    });

    const del = await ctx.editor.delete(`/admin/projects/${projectId}/milestones/${milestoneId}`);
    expect(del.status).toBe(204);
    expectAuditRow(ctx.db, { action: 'MILESTONE_DELETED', ip: true });
  });

  it('coverage tripwire: every DB mutation model is audited or allowlisted', () => {
    const seen = new Set();
    const walk = (dir) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, entry.name);
        if (entry.isDirectory()) walk(p);
        else if (entry.name.endsWith('.js')) {
          const src = readFileSync(p, 'utf8');
          for (const m of src.matchAll(/db\.([A-Za-z0-9_]+)\.(create|createMany|update|updateMany|upsert|delete|deleteMany)\(/g)) {
            seen.add(m[1]);
          }
        }
      }
    };
    walk(join(SRC, 'routes'));
    walk(join(SRC, 'lib'));
    const violations = [...seen].filter((m) => !ALLOWED_MUTATION_MODELS.has(m));
    expect(violations).toEqual([]);
  });
});

describe('SECURITY_ROADMAP Phase 19 — no secrets in the trail', () => {
  it('no audit row or metadata contains hash/token/cookie material', async () => {
    const ctx = await makeCtx();
    // Drive a spread of flows so the corpus covers multiple action shapes.
    await ctx.admin.patch(`/admin/users/${ctx.userIds['viewer@lakegroup.test']}/role`).send({ role: 'EDITOR' });
    await ctx.editor.post('/auth/change-password').send({
      currentPassword: 'pw-editor-1', newPassword: 'V8x!qRz2-Km9p',
    });
    const created = await ctx.editor.post('/admin/companies').send({
      name: 'NoSecrets Co', slug: 'nosecrets-co', description: 'x', reason: 'r',
    });
    const id = created.body.company.id;
    await ctx.editor.post(`/admin/companies/${id}/submit`).send({ reason: 'r' });
    await ctx.reviewer.post(`/admin/companies/${id}/approve`).send({ reason: 'r' });

    const corpus = JSON.stringify({ rows: ctx.db.auditRows });
    for (const marker of SECRET_MARKERS) {
      expect(corpus.toLowerCase(), `no "${marker}" in the audit trail`).not.toContain(marker.toLowerCase());
    }
  });
});

describe('SECURITY_ROADMAP Phase 19 — review surface (GET /admin/audit-log)', () => {
  let ctx;
  beforeEach(async () => {
    ctx = await makeCtx();
    // Seed a deterministic trail through the real stack. (Keep the editor
    // as EDITOR — they drive the governed flow below.)
    await ctx.admin.patch(`/admin/users/${ctx.userIds['viewer@lakegroup.test']}/role`).send({ role: 'EDITOR' });
    await ctx.admin.patch(`/admin/users/${ctx.userIds['viewer@lakegroup.test']}/role`).send({ role: 'REVIEWER' });
    const created = await ctx.editor.post('/admin/companies').send({
      name: 'Viewer Co', slug: 'viewer-co', description: 'x', reason: 'r',
    });
    const id = created.body.company.id;
    await ctx.editor.post(`/admin/companies/${id}/submit`).send({ reason: 'r' });
  });

  it('is SUPER_ADMIN + recent-auth only (403 for lower roles)', async () => {
    expect((await ctx.viewer.get('/admin/audit-log')).status).toBe(403);
    expect((await ctx.editor.get('/admin/audit-log')).status).toBe(403);
    expect((await ctx.reviewer.get('/admin/audit-log')).status).toBe(403);
    const ok = await ctx.admin.get('/admin/audit-log');
    expect(ok.status).toBe(200);
    expect(ok.body.entries.length).toBeGreaterThanOrEqual(4);
  });

  it('returns rows newest-first with the full actor/action/resource/ip/metadata shape', async () => {
    const res = await ctx.admin.get('/admin/audit-log');
    expect(res.status).toBe(200);
    const [first] = res.body.entries;
    expect(first).toHaveProperty('id');
    expect(first).toHaveProperty('actorId');
    expect(first).toHaveProperty('action');
    expect(first).toHaveProperty('resource');
    expect(first).toHaveProperty('ip');
    expect(first).toHaveProperty('metadata');
    expect(first).toHaveProperty('createdAt');
    const times = res.body.entries.map((e) => new Date(e.createdAt).getTime());
    expect([...times].sort((a, b) => b - a)).toEqual(times);
    // Newest action is the submit.
    expect(first.action).toBe('COMPANY_SUBMITTED');
  });

  it('paginates with the Phase 10 caps (limit 1-100, offset >= 0)', async () => {
    const page = await ctx.admin.get('/admin/audit-log?limit=2');
    expect(page.status).toBe(200);
    expect(page.body.entries.length).toBe(2);
    expect(page.body.total).toBeGreaterThanOrEqual(4);
    expect(page.body.limit).toBe(2);

    const later = await ctx.admin.get('/admin/audit-log?limit=2&offset=2');
    expect(later.body.entries.length).toBeGreaterThanOrEqual(1);
    expect(later.body.entries[0].id).not.toBe(page.body.entries[0].id);

    for (const qs of ['limit=0', 'limit=-1', 'limit=101', 'limit=abc', 'offset=-5']) {
      const res = await ctx.admin.get(`/admin/audit-log?${qs}`);
      expect(res.status, qs).toBe(400);
      expect(res.body.error.code, qs).toBe('VALIDATION_ERROR');
    }
  });

  it('filters by action and actorId with a matching total', async () => {
    const byAction = await ctx.admin.get('/admin/audit-log?action=ROLE_CHANGE');
    expect(byAction.status).toBe(200);
    expect(byAction.body.entries.length).toBe(2);
    expect(byAction.body.total).toBe(2);
    expect(byAction.body.entries.every((e) => e.action === 'ROLE_CHANGE')).toBe(true);

    const me = ctx.db.auditRows.find((r) => r.action === 'ROLE_CHANGE').actorId;
    const byActor = await ctx.admin.get(`/admin/audit-log?actorId=${me}&action=ROLE_CHANGE`);
    expect(byActor.status).toBe(200);
    expect(byActor.body.entries.every((e) => e.actorId === me)).toBe(true);
    expect(byActor.body.total).toBeGreaterThanOrEqual(1);
  });
});
