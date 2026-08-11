import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { makeApp, makeUser } from './helpers.js';

async function makeCtx(extraOptions = {}) {
  const users = [
    await makeUser({ email: 'viewer@lakegroup.test', password: 'pw-view-1', role: 'VIEWER' }),
    await makeUser({ email: 'editor@lakegroup.test', password: 'pw-edit-1', role: 'EDITOR' }),
    await makeUser({ email: 'reviewer@lakegroup.test', password: 'pw-rev-1', role: 'REVIEWER' }),
    await makeUser({ email: 'admin@lakegroup.test', password: 'pw-admin-1', role: 'SUPER_ADMIN' }),
    await makeUser({ email: 'victim@lakegroup.test', password: 'pw-victim-1', role: 'VIEWER' }),
  ];
  const ctx = makeApp({ users, options: extraOptions });
  const login = async (email, password) => {
    const agent = request.agent(ctx.app);
    const res = await agent.post('/auth/login').send({ email, password });
    expect(res.status).toBe(200);
    return agent;
  };
  return {
    ...ctx,
    viewer: await login('viewer@lakegroup.test', 'pw-view-1'),
    editor: await login('editor@lakegroup.test', 'pw-edit-1'),
    reviewer: await login('reviewer@lakegroup.test', 'pw-rev-1'),
    admin: await login('admin@lakegroup.test', 'pw-admin-1'),
    victim: await login('victim@lakegroup.test', 'pw-victim-1'),
    ids: { viewer: 'u_viewerlakegrouptest', editor: 'u_editorlakegrouptest', reviewer: 'u_reviewerlakegrouptest', admin: 'u_adminlakegrouptest', victim: 'u_victimlakegrouptest' },
  };
}

describe('SECURITY_ROADMAP Phase 4 — authorization matrix', () => {
  let ctx;
  beforeEach(async () => { ctx = await makeCtx(); });

  it('SUPER_ADMIN-only operations reject VIEWER / EDITOR / REVIEWER with 403', async () => {
    const superAdminOnly = [
      ['get', '/admin/users'],
      ['patch', `/admin/users/${ctx.ids.victim}/role`, { role: 'EDITOR' }],
      ['patch', `/admin/users/${ctx.ids.victim}/password`, { password: 'new-pass-123' }],
      ['post', `/admin/users/${ctx.ids.victim}/revoke-sessions`],
      ['get', '/admin/unanswered-questions'],
      ['get', '/admin/content-health'],
      ['get', '/admin/analytics/summary'],
      ['post', '/admin/publish-schedules/whatever/cancel'],
    ];
    for (const [method, route, body] of superAdminOnly) {
      for (const agent of [ctx.viewer, ctx.editor, ctx.reviewer]) {
        const res = await agent[method](route).send(body ?? {});
        expect(res.status, `${method.toUpperCase()} ${route} as non-admin`).toBe(403);
      }
    }
  });

  it('SUPER_ADMIN can reach the admin surface (and 404s on unknown ids, not leaks)', async () => {
    const users = await ctx.admin.get('/admin/users');
    expect(users.status).toBe(200);

    // Manipulated/unknown user id → 404, never another user's data.
    const ghostRole = await ctx.admin.patch('/admin/users/ghost-id/role').send({ role: 'EDITOR' });
    expect(ghostRole.status).toBe(404);
  });

  it('EDITOR+ operations reject VIEWER with 403 but allow EDITOR', async () => {
    const create = await ctx.viewer.post('/admin/news').send({ title: 'x', slug: 'x-1', body: 'y', reason: 'r' });
    expect(create.status).toBe(403);

    const folder = await ctx.viewer.post('/admin/media-folders').send({ name: 'Secrets' });
    expect(folder.status).toBe(403);

    const okCreate = await ctx.editor.post('/admin/news').send({ title: 'Editor news', slug: 'editor-news', body: 'Body.', reason: 'r' });
    expect(okCreate.status).toBe(201);

    const okFolder = await ctx.editor.post('/admin/media-folders').send({ name: 'Projects', slug: 'projects' });
    expect(okFolder.status).toBe(201);
  });

  it('REVIEWER+ operations reject VIEWER and EDITOR with 403 but allow REVIEWER', async () => {
    const asViewer = await ctx.viewer.get('/admin/review-queue');
    expect(asViewer.status).toBe(403);
    const asEditor = await ctx.editor.get('/admin/review-queue');
    expect(asEditor.status).toBe(403);
    const asReviewer = await ctx.reviewer.get('/admin/review-queue');
    expect(asReviewer.status).toBe(200);
  });

  it('privilege escalation is blocked: a non-admin cannot promote anyone', async () => {
    // Even with an escalated role body, the role gate fires before the lookup.
    const attempt = await ctx.editor.patch(`/admin/users/${ctx.ids.victim}/role`).send({ role: 'SUPER_ADMIN' });
    expect(attempt.status).toBe(403);
    const victimStill = (await ctx.db.user.findUnique({ where: { id: ctx.ids.victim } }));
    expect(victimStill.role).toBe('VIEWER');
  });

  it('mass assignment is blocked: a smuggled status/role field never sticks', async () => {
    const res = await ctx.editor.post('/admin/news').send({
      title: 'Sneaky', slug: 'sneaky-news', body: 'Body.', status: 'PUBLISHED', reason: 'r',
    });
    expect(res.status).toBe(201);
    expect(res.body.news.status).toBe('DRAFT');

    // No route lets a user update their own role; the only role surface is
    // the SUPER_ADMIN-only admin route.
    const selfPromote = await ctx.viewer.patch('/admin/users/u_viewerlakegrouptest/role').send({ role: 'SUPER_ADMIN' });
    expect(selfPromote.status).toBe(403);
  });

  it('recent-auth gate applies to governed mutations too (stale session → REAUTH_REQUIRED)', async () => {
    const ctxStale = await makeCtx({ recentAuthWindowMs: 0 });
    const res = await ctxStale.editor.post('/admin/news').send({ title: 'Stale', slug: 'stale-news', body: 'Body.', reason: 'r' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('REAUTH_REQUIRED');
  });
});

describe('SECURITY_ROADMAP Phase 4 — IDOR / cross-user isolation', () => {
  let ctx;
  beforeEach(async () => { ctx = await makeCtx(); });

  async function seedNotifications() {
    const mine = await ctx.db.notification.create({ data: { userId: ctx.ids.viewer, type: 'MINE', message: 'mine', entityType: 'news' } });
    const theirs = await ctx.db.notification.create({ data: { userId: ctx.ids.editor, type: 'THEIRS', message: 'theirs', entityType: 'news' } });
    return { mine, theirs };
  }

  it('the notification list only ever contains the caller\u2019s rows', async () => {
    const { theirs } = await seedNotifications();
    const inbox = await ctx.viewer.get('/admin/notifications');
    expect(inbox.status).toBe(200);
    const rows = inbox.body.notifications;
    expect(rows.every((n) => n.userId === ctx.ids.viewer)).toBe(true);
    expect(rows.some((n) => n.id === theirs.id)).toBe(false);
  });

  it('read-all marks only my notifications read', async () => {
    const { mine, theirs } = await seedNotifications();
    const res = await ctx.viewer.post('/admin/notifications/read-all').send({});
    expect(res.body.markedRead).toBeGreaterThanOrEqual(1);

    const mineAfter = (await ctx.db.notification.findFirst({ where: { id: mine.id } }));
    const theirsAfter = (await ctx.db.notification.findFirst({ where: { id: theirs.id } }));
    expect(mineAfter.read).toBe(true);
    expect(theirsAfter.read).toBe(false);
  });

  it('marking another user\u2019s notification read returns 404 (no data leak, no side effect)', async () => {
    const { theirs } = await seedNotifications();
    const res = await ctx.viewer.post(`/admin/notifications/${theirs.id}/read`).send({});
    expect(res.status).toBe(404);
    const stillUnread = (await ctx.db.notification.findFirst({ where: { id: theirs.id } }));
    expect(stillUnread.read).toBe(false);
  });

  it('manipulated entity IDs on governed routes return 404, not another record', async () => {
    const missing = await ctx.editor.post('/admin/news/ghost-news/submit').send({});
    expect(missing.status).toBe(404);
    const missingDetail = await ctx.editor.get('/admin/news/ghost-news');
    expect(missingDetail.status).toBe(404);
  });
});
