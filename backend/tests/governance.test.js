import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { makeApp, makeUser } from './helpers.js';

const KEY = {
  countries: 'country',
  categories: 'category',
  locations: 'location',
  news: 'news',
  companies: 'company',
  facilities: 'facility',
  'product-services': 'productService',
  pages: 'page',
  'content-blocks': 'contentBlock',
  media: 'media',
};

async function makeCtx() {
  const users = [
    await makeUser({ email: 'editor@lakegroup.test', password: 'pw-editor-1', role: 'EDITOR' }),
    await makeUser({ email: 'reviewer@lakegroup.test', password: 'pw-review-1', role: 'REVIEWER' }),
    await makeUser({ email: 'admin@lakegroup.test', password: 'pw-admin-1', role: 'SUPER_ADMIN' }),
  ];
  const ctx = makeApp({ users });
  const login = async (email, password) => {
    const agent = request.agent(ctx.app);
    const res = await agent.post('/auth/login').send({ email, password });
    expect(res.status).toBe(200);
    return agent;
  };
  return {
    ...ctx,
    editor: await login('editor@lakegroup.test', 'pw-editor-1'),
    reviewer: await login('reviewer@lakegroup.test', 'pw-review-1'),
    admin: await login('admin@lakegroup.test', 'pw-admin-1'),
  };
}

async function createAndSubmit(ctx, route, body) {
  const created = await ctx.editor.post(`/admin/${route}`).send({ ...body, reason: 'Initial record' });
  expect(created.status).toBe(201);
  const row = created.body[KEY[route]];
  await ctx.editor.post(`/admin/${route}/${row.id}/submit`).send({});
  return row;
}

async function publish(ctx, route, body) {
  const row = await createAndSubmit(ctx, route, body);
  await ctx.reviewer.post(`/admin/${route}/${row.id}/approve`).send({});
  await ctx.reviewer.post(`/admin/${route}/${row.id}/publish`).send({});
  return row;
}

describe('Phase 7 — governance & publishing', () => {
  it('reject sends an IN_REVIEW record back to DRAFT with a required reason, audited + notified', async () => {
    const ctx = await makeCtx();
    const news = await createAndSubmit(ctx, 'news', {
      title: 'Draft headline', slug: 'draft-headline', body: 'Body.',
    });

    // missing reason → 400
    const noReason = await ctx.reviewer.post(`/admin/news/${news.id}/reject`).send({});
    expect(noReason.status).toBe(400);

    const rejected = await ctx.reviewer.post(`/admin/news/${news.id}/reject`).send({ reason: 'Headline needs source attribution' });
    expect(rejected.status).toBe(200);
    expect(rejected.body.news.status).toBe('DRAFT');

    const actions = ctx.db.auditRows.map((r) => r.action);
    expect(actions).toContain('NEWS_REJECTED');
    const rejectAudit = ctx.db.auditRows.find((r) => r.action === 'NEWS_REJECTED');
    expect(rejectAudit.metadata.reason).toBe('Headline needs source attribution');

    // the editor (submitter) was notified
    const editorNotifications = await ctx.db.notification.findMany({ where: { userId: 'u_editorlakegrouptest' } });
    expect(editorNotifications.some((n) => n.type === 'REJECTED')).toBe(true);

    // the editor can pick it up again (DRAFT → edit → resubmit)
    const reedited = await ctx.editor.patch(`/admin/news/${news.id}`).send({
      title: 'Draft headline (sourced)', body: 'Body. Source: Q3 report', reason: 'Fix per review',
    });
    expect(reedited.status).toBe(200);
  });

  it('review queue aggregates in-review + approved + scheduled across entities and metrics', async () => {
    const ctx = await makeCtx();
    const news = await createAndSubmit(ctx, 'news', { title: 'Queue news', slug: 'queue-news', body: 'Body.' });
    const company = await createAndSubmit(ctx, 'companies', {
      name: 'Queue Co', slug: 'queue-co', description: 'x',
    });
    // a metric in review shows up too
    const metric = await ctx.editor.post('/admin/metrics').send({
      key: 'queue-fleet', label: 'Fleet size', value: '1,200', unit: 'trucks', source: 'Fleet register', reason: 'Initial',
    });
    const metricId = metric.body.metric.id;
    await ctx.editor.post(`/admin/metrics/${metricId}/submit`).send({});

    const queue = await ctx.reviewer.get('/admin/review-queue');
    expect(queue.status).toBe(200);
    const types = queue.body.inReview.map((i) => i.entityType).sort();
    expect(types).toEqual(['company', 'metric', 'news']);
    const newsItem = queue.body.inReview.find((i) => i.entityType === 'news');
    expect(newsItem.id).toBe(news.id);
    expect(newsItem.label).toBe('queue-news');
    expect(newsItem.submitterEmail).toBe('editor@lakegroup.test');
    const metricItem = queue.body.inReview.find((i) => i.entityType === 'metric');
    expect(metricItem.label).toBe('Fleet size');

    // approve the news → it moves to approvedAwaitingPublish
    await ctx.reviewer.post(`/admin/news/${news.id}/approve`).send({});
    const queue2 = await ctx.reviewer.get('/admin/review-queue');
    expect(queue2.body.inReview.map((i) => i.entityType)).not.toContain('news');
    expect(queue2.body.approvedAwaitingPublish.map((a) => a.entityType)).toContain('news');
    // company still in review
    expect(queue2.body.inReview.map((i) => i.entityType)).toContain('company');
    void company;
  });

  it('scheduled publishing: APPROVED item stays hidden until publishAt, then lazy promotion publishes it on read', async () => {
    const ctx = await makeCtx();
    const news = await createAndSubmit(ctx, 'news', { title: 'Scheduled news', slug: 'scheduled-news', body: 'Body.' });
    await ctx.reviewer.post(`/admin/news/${news.id}/approve`).send({});

    // scheduling a non-APPROVED item is rejected
    const draftNews = await ctx.editor.post('/admin/news').send({ title: 'x', slug: 'x-news', body: 'y', reason: 'r' });
    const draftId = draftNews.body.news.id;
    const badState = await ctx.editor.post(`/admin/news/${draftId}/schedule`).send({ publishAt: new Date(Date.now() + 864e5).toISOString() });
    expect(badState.status).toBe(409);

    // past publishAt → 400
    const past = await ctx.editor.post(`/admin/news/${news.id}/schedule`).send({ publishAt: new Date(Date.now() - 864e5).toISOString() });
    expect(past.status).toBe(400);

    const future = new Date(Date.now() + 30 * 864e5).toISOString();
    const scheduled = await ctx.editor.post(`/admin/news/${news.id}/schedule`).send({ publishAt: future });
    expect(scheduled.status).toBe(200);
    // entity stays APPROVED (not public), schedule is PENDING
    expect(scheduled.body.news.status).toBe('APPROVED');
    const schedule = (await ctx.db.publishSchedule.findMany({ where: { entityType: 'news', entityId: news.id } }))[0];
    expect(schedule.status).toBe('PENDING');

    // not public yet; appears in the queue's scheduled list
    expect((await request(ctx.app).get(`/api/public/news/${news.id}`)).status).toBe(404);
    const queue = await ctx.reviewer.get('/admin/review-queue');
    expect(queue.body.scheduled.some((s) => s.entityType === 'news' && s.entityId === news.id)).toBe(true);

    // time passes: bump publishAt into the past, then the next public read promotes it
    await ctx.db.publishSchedule.update({ where: { id: schedule.id }, data: { publishAt: new Date(Date.now() - 1000) } });
    const publicAfter = await request(ctx.app).get(`/api/public/news/${news.id}`);
    expect(publicAfter.status).toBe(200);

    const promoted = (await ctx.db.publishSchedule.findMany({ where: { id: schedule.id } }))[0];
    expect(promoted.status).toBe('PUBLISHED');
    expect(promoted.publishedAt).toBeTruthy();
    const detail = await ctx.editor.get(`/admin/news/${news.id}`);
    expect(detail.body.news.status).toBe('PUBLISHED');
    expect(ctx.db.auditRows.map((r) => r.action)).toContain('NEWS_PUBLISHED_SCHEDULED');
    const events = await ctx.db.publicationEvent.findMany({ where: { entityType: 'news', entityId: news.id } });
    expect(events.some((e) => e.action === 'PUBLISHED' && e.publishAt)).toBe(true);
    // the submitter is notified that their scheduled item went live
    const editorNotifications = await ctx.db.notification.findMany({ where: { userId: 'u_editorlakegrouptest' } });
    expect(editorNotifications.some((n) => n.type === 'PUBLISHED_SCHEDULED')).toBe(true);
  });

  it('publication event ledger records publish, unpublish, rollback, and schedule', async () => {
    const ctx = await makeCtx();
    const news = await publish(ctx, 'news', { title: 'Ledger news', slug: 'ledger-news', body: 'Body.' });

    const events = async () => (await ctx.db.publicationEvent.findMany({ where: { entityType: 'news', entityId: news.id } })).map((e) => e.action);
    expect(await events()).toContain('PUBLISHED');

    await ctx.reviewer.post(`/admin/news/${news.id}/unpublish`).send({ reason: 'Take down' });
    expect(await events()).toContain('UNPUBLISHED');

    // edit + republish so rollback has a previous published snapshot
    await ctx.editor.patch(`/admin/news/${news.id}`).send({ title: 'Ledger news v2', body: 'Body.', reason: 'Update' });
    await ctx.editor.post(`/admin/news/${news.id}/submit`).send({});
    await ctx.reviewer.post(`/admin/news/${news.id}/approve`).send({});
    await ctx.reviewer.post(`/admin/news/${news.id}/publish`).send({});
    await ctx.admin.post(`/admin/news/${news.id}/rollback`).send({});
    expect(await events()).toContain('ROLLED_BACK');
  });

  it('impact analysis: metric consumers + pending diff (the Employees 4,600 → 4,850 check)', async () => {
    const ctx = await makeCtx();
    const created = await ctx.editor.post('/admin/metrics').send({
      key: 'employees', label: 'Employees', value: '4,600+', unit: 'employees',
      source: 'HR register', consumers: ['homepage-hero-keyfacts', 'about-page'], reason: 'Initial',
    });
    const id = created.body.metric.id;
    await ctx.editor.post(`/admin/metrics/${id}/submit`).send({});
    await ctx.reviewer.post(`/admin/metrics/${id}/approve`).send({});
    await ctx.reviewer.post(`/admin/metrics/${id}/publish`).send({});

    // while PUBLISHED there is no pending change — old APPROVED version rows
    // are history, not a phantom in-flight edit
    const idle = await ctx.editor.get('/admin/metrics/employees/impact');
    expect(idle.body.pending).toBeNull();
    expect(idle.body.diff).toEqual({});

    // start the next cycle: 4,600 → 4,850 (still in flight)
    await ctx.editor.patch('/admin/metrics/employees').send({
      label: 'Employees', value: '4,850+', unit: 'employees', source: 'Q3 workforce report', reason: 'Q3 update',
    });

    const impact = await ctx.editor.get('/admin/metrics/employees/impact');
    expect(impact.status).toBe(200);
    expect(impact.body.consumers).toContain('homepage-hero-keyfacts');
    expect(impact.body.pending.value).toBe('4,850+');
    expect(impact.body.diff.value).toEqual({ from: '4,600+', to: '4,850+' });
    expect(impact.body.stale).toBe(true); // the value change reset verification
    expect(impact.body.versionCount).toBeGreaterThanOrEqual(5);
  });

  it('impact analysis: governed entities list their dependents (company, media, content block)', async () => {
    const ctx = await makeCtx();
    const tz = await publish(ctx, 'countries', { name: 'Tanzania', isoCode: 'TZ' });
    const cat = await publish(ctx, 'categories', { name: 'Energy', description: 'x' });
    const company = await publish(ctx, 'companies', {
      name: 'Lake Oil Ltd', slug: 'lake-oil', description: 'Petroleum', categoryId: cat.id, headquartersCountryId: tz.id,
    });
    const loc = await publish(ctx, 'locations', { name: 'Dar es Salaam', countryId: tz.id, latitude: -6.8, longitude: 39.28 });

    // dependents (any status — the impact view warns before publishing)
    const fac = await ctx.editor.post('/admin/facilities').send({
      name: 'Kigamboni Depot', locationId: loc.id, companyId: company.id, reason: 'Create',
    });
    const ps = await ctx.editor.post('/admin/product-services').send({
      name: 'Premium Diesel', companyId: company.id, categoryId: cat.id, reason: 'Create',
    });
    void fac; void ps;

    const companyImpact = await ctx.editor.get(`/admin/companies/${company.id}/impact`);
    expect(companyImpact.status).toBe(200);
    const refs = companyImpact.body.references.map((r) => r.type).sort();
    expect(refs).toContain('facility');
    expect(refs).toContain('productService');
    expect(companyImpact.body.entityType).toBe('company');

    // media impact: shows the news using it
    const media = await publish(ctx, 'media', { url: 'https://cdn.example.com/hero.jpg', altText: 'Hero' });
    await publish(ctx, 'news', { title: 'Uses hero', slug: 'uses-hero', body: 'x', heroMediaId: media.id });
    const mediaImpact = await ctx.editor.get(`/admin/media/${media.id}/impact`);
    expect(mediaImpact.body.references.some((r) => r.type === 'news' && r.field === 'heroMediaId')).toBe(true);

    // content block impact: shows the pages composing it
    const block = await publish(ctx, 'content-blocks', { key: 'mission', type: 'RICHTEXT', content: { html: '<p>m</p>' } });
    await publish(ctx, 'pages', { slug: 'mission-page', title: 'Mission', contentBlocks: ['mission'] });
    const blockImpact = await ctx.editor.get(`/admin/content-blocks/${block.id}/impact`);
    expect(blockImpact.body.references.some((r) => r.type === 'page' && r.label === 'mission-page')).toBe(true);
  });

  it('notifications: submit → reviewers, approve → submitter; mark-read lifecycle', async () => {
    const ctx = await makeCtx();
    const userIds = {
      editor: 'u_editorlakegrouptest',
      reviewer: 'u_reviewerlakegrouptest',
      admin: 'u_adminlakegrouptest',
    };
    const news = await createAndSubmit(ctx, 'news', { title: 'Notify news', slug: 'notify-news', body: 'Body.' });

    // submit → REVIEWER + SUPER_ADMIN notified, not the editor
    const all = await ctx.db.notification.findMany({});
    const submitted = all.filter((n) => n.type === 'SUBMITTED');
    expect(submitted.map((n) => n.userId).sort()).toEqual([userIds.admin, userIds.reviewer].sort());
    expect(submitted.every((n) => n.entityId === news.id)).toBe(true);

    // approve → the editor (submitter) is notified
    await ctx.reviewer.post(`/admin/news/${news.id}/approve`).send({});
    const approvedForEditor = (await ctx.db.notification.findMany({ where: { userId: userIds.editor } }))
      .filter((n) => n.type === 'APPROVED');
    expect(approvedForEditor.length).toBe(1);

    // editor sees them unread first
    const inbox = await ctx.editor.get('/admin/notifications');
    expect(inbox.status).toBe(200);
    expect(inbox.body.unreadCount).toBeGreaterThanOrEqual(1);
    expect(inbox.body.notifications[0].read).toBe(false);

    // mark one read; read-all for the rest
    const first = inbox.body.notifications[0];
    const marked = await ctx.editor.post(`/admin/notifications/${first.id}/read`).send({});
    expect(marked.status).toBe(200);
    expect(marked.body.notification.read).toBe(true);
    const after = await ctx.editor.get('/admin/notifications');
    expect(after.body.unreadCount).toBe(inbox.body.unreadCount - 1);

    const readAll = await ctx.editor.post('/admin/notifications/read-all').send({});
    expect(readAll.body.markedRead).toBeGreaterThanOrEqual(0);
    const final = await ctx.editor.get('/admin/notifications');
    expect(final.body.unreadCount).toBe(0);

    // other users cannot mark the editor's notification read (404)
    const notMine = await ctx.reviewer.post(`/admin/notifications/${first.id}/read`).send({});
    expect(notMine.status).toBe(404);
  });

  it('cancel a pending schedule (SUPER_ADMIN); the item stays unpublished', async () => {
    const ctx = await makeCtx();
    const news = await createAndSubmit(ctx, 'news', { title: 'Cancel news', slug: 'cancel-news', body: 'Body.' });
    await ctx.reviewer.post(`/admin/news/${news.id}/approve`).send({});
    await ctx.editor.post(`/admin/news/${news.id}/schedule`).send({ publishAt: new Date(Date.now() + 7 * 864e5).toISOString() });

    const schedules = await ctx.db.publishSchedule.findMany({ where: { entityType: 'news', entityId: news.id } });
    const schedule = schedules[0];

    // non-admin cannot cancel
    const forbidden = await ctx.editor.post(`/admin/publish-schedules/${schedule.id}/cancel`).send({});
    expect(forbidden.status).toBe(403);

    const cancelled = await ctx.admin.post(`/admin/publish-schedules/${schedule.id}/cancel`).send({});
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.schedule.status).toBe('CANCELLED');
    expect(ctx.db.auditRows.map((r) => r.action)).toContain('SCHEDULE_CANCELLED');

    // still not public, and no longer in the queue's scheduled list
    expect((await request(ctx.app).get(`/api/public/news/${news.id}`)).status).toBe(404);
    const queue = await ctx.reviewer.get('/admin/review-queue');
    expect(queue.body.scheduled.some((s) => s.entityType === 'news' && s.entityId === news.id)).toBe(false);
    // the entity itself is still APPROVED — a human can publish or reschedule
    const detail = await ctx.editor.get(`/admin/news/${news.id}`);
    expect(detail.body.news.status).toBe('APPROVED');
  });
});
