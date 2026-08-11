import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { makeApp, makeUser } from './helpers.js';

// Response key for each admin/public route (registry deps + CMS entities).
const KEY = {
  countries: 'country',
  categories: 'category',
  companies: 'company',
  locations: 'location',
  pages: 'page',
  'content-blocks': 'contentBlock',
  news: 'news',
  projects: 'project',
  leadership: 'leadership',
  contacts: 'contact',
  'history-events': 'historyEvent',
  'career-listings': 'careerListing',
  'csr-entries': 'cSREntry',
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

/** create → submit → approve → publish via the API; returns the record. */
async function publish(ctx, route, body) {
  const created = await ctx.editor.post(`/admin/${route}`).send({ ...body, reason: 'Initial record' });
  expect(created.status, `${route} create`).toBe(201);
  const row = created.body[KEY[route]];
  await ctx.editor.post(`/admin/${route}/${row.id}/submit`).send({});
  await ctx.reviewer.post(`/admin/${route}/${row.id}/approve`).send({});
  await ctx.reviewer.post(`/admin/${route}/${row.id}/publish`).send({});
  return row;
}

/** Published registry + CMS deps reused across tests. */
async function publishDeps(ctx) {
  const tz = await publish(ctx, 'countries', { name: 'Tanzania', isoCode: 'TZ', regionGrouping: 'East Africa' });
  const cat = await publish(ctx, 'categories', { name: 'Energy', description: 'Energy sector' });
  const coA = await publish(ctx, 'companies', {
    name: 'Lake Oil Ltd', slug: 'lake-oil', description: 'Petroleum distribution',
    categoryId: cat.id, headquartersCountryId: tz.id,
  });
  const coB = await publish(ctx, 'companies', {
    name: 'Lake Gas Ltd', slug: 'lake-gas', description: 'LPG bottling and distribution',
    categoryId: cat.id, headquartersCountryId: tz.id,
  });
  const loc = await publish(ctx, 'locations', {
    name: 'Dar es Salaam', countryId: tz.id, latitude: -6.8, longitude: 39.28, type: 'city',
  });
  const cb = await publish(ctx, 'content-blocks', {
    key: 'about-mission', type: 'RICHTEXT', content: { html: '<p>Our mission</p>' },
  });
  return { tz, cat, coA, coB, loc, cb };
}

// One case per entity. `create` is the create-body (plus reason by the
// helper); `edit` the full update-body. `@dep` refs and arrays of `@dep`
// refs are resolved against the published dependency set by the fill fn.
const CASES = [
  {
    route: 'pages', prefix: 'PAGE', field: 'title',
    create: { slug: 'about-us', title: 'About Us', layoutType: 'standard', contentBlocks: ['about-mission'] },
    edit: { title: 'About the Lake Group', layoutType: 'standard', contentBlocks: ['about-mission'] },
  },
  {
    route: 'content-blocks', prefix: 'CONTENT_BLOCK', field: 'type', // scalar — content is JSON
    create: { key: 'values-quote', type: 'QUOTE', content: { text: 'Integrity first' } },
    edit: { type: 'CALLOUT', content: { text: 'Integrity and safety first' } },
  },
  {
    route: 'news', prefix: 'NEWS', field: 'title',
    create: { title: 'Lake Oil opens new depot', slug: 'lake-oil-new-depot', body: 'A new depot in Dar es Salaam.', categoryId: '@cat', relatedCompanyId: '@coA' },
    edit: { title: 'Lake Oil opens new depot in Dar es Salaam', body: 'A new depot in Dar es Salaam.', categoryId: '@cat', relatedCompanyId: '@coA' },
  },
  {
    route: 'projects', prefix: 'PROJECT', field: 'title',
    create: { title: 'Kigamboni terminal upgrade', companyId: '@coA', locationId: '@loc', sector: 'Logistics', description: 'Upgrade of the Kigamboni terminal.', impact: 'Faster fuel distribution' },
    edit: { title: 'Kigamboni terminal expansion', companyId: '@coA', locationId: '@loc', sector: 'Logistics', description: 'Expansion of the Kigamboni terminal.', impact: 'Faster fuel distribution' },
  },
  {
    route: 'leadership', prefix: 'LEADERSHIP', field: 'position',
    create: { name: 'Jane Mwanga', position: 'Managing Director', bio: 'Leads the group.', order: 1, companyId: '@coA' },
    edit: { name: 'Jane Mwanga', position: 'Group Managing Director', bio: 'Leads the group.', order: 1, companyId: '@coA' },
  },
  {
    route: 'contacts', prefix: 'CONTACT', field: 'name',
    create: { name: 'Corporate Office', type: 'CORPORATE', phone: '+255 22 000 0000', email: 'info@lakeoilgroup.com', publicDisplay: true, order: 1, companyId: '@coA', locationId: '@loc' },
    edit: { name: 'Corporate Headquarters', type: 'CORPORATE', phone: '+255 22 000 0001', email: 'info@lakeoilgroup.com', publicDisplay: true, order: 1, companyId: '@coA', locationId: '@loc' },
  },
  {
    route: 'history-events', prefix: 'HISTORY_EVENT', field: 'title',
    create: { title: 'Lake Group founded', date: '1998-03-01T00:00:00.000Z', description: 'Founded in Dar es Salaam.', companyIds: ['@coA', '@coB'] },
    edit: { title: 'Lake Group founded in Dar es Salaam', date: '1998-03-01T00:00:00.000Z', description: 'Founded in Dar es Salaam.', companyIds: ['@coA'] },
  },
  {
    route: 'career-listings', prefix: 'CAREER_LISTING', field: 'jobTitle',
    create: { jobTitle: 'Operations Manager', department: 'Operations', companyId: '@coA', locationId: '@loc', employmentType: 'full-time', listingStatus: 'OPEN' },
    edit: { jobTitle: 'Senior Operations Manager', department: 'Operations', companyId: '@coA', locationId: '@loc', employmentType: 'full-time', listingStatus: 'OPEN' },
  },
  {
    route: 'csr-entries', prefix: 'CSR_ENTRY', field: 'title',
    create: { title: 'Coastal clean-up 2024', description: 'Community beach clean-up.', category: 'environment', companyId: '@coA', date: '2024-06-01T00:00:00.000Z', period: '2024' },
    edit: { title: 'Coastal clean-up 2024 (Dar es Salaam)', description: 'Community beach clean-up.', category: 'environment', companyId: '@coA', date: '2024-06-01T00:00:00.000Z', period: '2024' },
  },
];

/** Resolve '@dep' references (scalars and arrays) against the dep set. */
function fill(body, deps) {
  const resolve = (v) => (typeof v === 'string' && v.startsWith('@') ? deps[v.slice(1)].id : v);
  return Object.fromEntries(
    Object.entries(body).map(([k, v]) => [k, Array.isArray(v) ? v.map(resolve) : resolve(v)]),
  );
}

describe('Phase 5 — CMS core', () => {
  it('full lifecycle (create → submit → approve → publish → edit → publish → rollback) works for ALL 9 entities, with versions + audit per entity', async () => {
    const ctx = await makeCtx();
    const deps = await publishDeps(ctx);

    for (const c of CASES) {
      const createBody = fill(c.create, deps);
      const editBody = { ...fill(c.edit, deps), reason: 'Factual update' };

      const created = await ctx.editor.post(`/admin/${c.route}`).send({ ...createBody, reason: 'Initial record' });
      expect(created.status, `${c.route} create`).toBe(201);
      expect(created.body[KEY[c.route]].status).toBe('DRAFT');
      const id = created.body[KEY[c.route]].id;

      const sub = await ctx.editor.post(`/admin/${c.route}/${id}/submit`).send({});
      expect(sub.status, `${c.route} submit`).toBe(200);
      expect(sub.body[KEY[c.route]].status).toBe('IN_REVIEW');

      const appr = await ctx.reviewer.post(`/admin/${c.route}/${id}/approve`).send({});
      expect(appr.status, `${c.route} approve`).toBe(200);
      expect(appr.body[KEY[c.route]].status).toBe('APPROVED');

      const pub = await ctx.reviewer.post(`/admin/${c.route}/${id}/publish`).send({});
      expect(pub.status, `${c.route} publish`).toBe(200);
      expect(pub.body[KEY[c.route]].status).toBe('PUBLISHED');

      const publicRes = await request(ctx.app).get(`/api/public/${c.route}/${id}`);
      expect(publicRes.status, `${c.route} public after first publish`).toBe(200);
      expect(publicRes.body[KEY[c.route]][c.field]).toBeTruthy();
      expect(publicRes.body[KEY[c.route]].status).toBeUndefined();

      // second cycle: edit → publish
      const edited = await ctx.editor.patch(`/admin/${c.route}/${id}`).send(editBody);
      expect(edited.status, `${c.route} edit`).toBe(200);
      expect(edited.body[KEY[c.route]].status).toBe('DRAFT');
      const editedVal = edited.body[KEY[c.route]][c.field];
      expect(editedVal).not.toBe(created.body[KEY[c.route]][c.field]);

      await ctx.editor.post(`/admin/${c.route}/${id}/submit`).send({});
      await ctx.reviewer.post(`/admin/${c.route}/${id}/approve`).send({});
      await ctx.reviewer.post(`/admin/${c.route}/${id}/publish`).send({});

      const publicAfterEdit = await request(ctx.app).get(`/api/public/${c.route}/${id}`);
      expect(publicAfterEdit.body[KEY[c.route]][c.field]).toBe(editedVal);

      // rollback restores the first published snapshot
      const rolled = await ctx.admin.post(`/admin/${c.route}/${id}/rollback`).send({});
      expect(rolled.status, `${c.route} rollback`).toBe(200);
      expect(rolled.body[KEY[c.route]].status).toBe('PUBLISHED');
      expect(rolled.body[KEY[c.route]][c.field]).toBe(created.body[KEY[c.route]][c.field]);

      const publicAfterRollback = await request(ctx.app).get(`/api/public/${c.route}/${id}`);
      expect(publicAfterRollback.body[KEY[c.route]][c.field]).toBe(created.body[KEY[c.route]][c.field]);

      // version history + audit trail for THIS entity
      const detail = await ctx.editor.get(`/admin/${c.route}/${id}`);
      expect(detail.status).toBe(200);
      expect(detail.body.versions.length, `${c.route} version count`).toBeGreaterThanOrEqual(9);

      const actions = ctx.db.auditRows.map((r) => r.action);
      for (const act of ['CREATED', 'SUBMITTED', 'APPROVED', 'PUBLISHED', 'EDITED', 'ROLLED_BACK']) {
        expect(actions, `${c.route} audit ${act}`).toContain(`${c.prefix}_${act}`);
      }
    }
  });

  it('separation of duties is enforced for every CMS entity (submitter cannot approve)', async () => {
    const ctx = await makeCtx();
    const deps = await publishDeps(ctx);

    const FKS = {
      pages: { contentBlocks: [deps.cb.key] },
      news: { categoryId: deps.cat.id, relatedCompanyId: deps.coA.id },
      projects: { companyId: deps.coA.id, locationId: deps.loc.id },
      leadership: { companyId: deps.coA.id },
      contacts: { companyId: deps.coA.id, locationId: deps.loc.id },
      'history-events': { companyIds: [deps.coA.id, deps.coB.id] },
      'career-listings': { companyId: deps.coA.id, locationId: deps.loc.id },
      'csr-entries': { companyId: deps.coA.id },
    };

    for (const c of CASES) {
      const body = { ...fill(c.create, deps), ...(FKS[c.route] ?? {}), reason: 'Created by admin for separation test' };
      const created = await ctx.admin.post(`/admin/${c.route}`).send(body);
      expect(created.status, `${c.route} admin create`).toBe(201);
      const id = created.body[KEY[c.route]].id;
      const submitted = await ctx.admin.post(`/admin/${c.route}/${id}/submit`).send({});
      expect(submitted.status, `${c.route} admin submit`).toBe(200);

      const selfApprove = await ctx.admin.post(`/admin/${c.route}/${id}/approve`).send({});
      expect(selfApprove.status, `${c.route} separation of duties`).toBe(403);
      expect(selfApprove.body.error.code).toBe('SEPARATION_OF_DUTIES');
    }
  });

  it('scheduled News: a future-dated item is PUBLISHED in workflow but not served publicly until its date', async () => {
    const ctx = await makeCtx();
    const deps = await publishDeps(ctx);

    const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const created = await ctx.editor.post('/admin/news').send({
      title: 'Upcoming announcement', slug: 'upcoming-announcement', body: 'Details soon.',
      categoryId: deps.cat.id, publicationDate: future, reason: 'Create scheduled item',
    });
    expect(created.status).toBe(201);
    const id = created.body.news.id;
    await ctx.editor.post(`/admin/news/${id}/submit`).send({});
    await ctx.reviewer.post(`/admin/news/${id}/approve`).send({});
    await ctx.reviewer.post(`/admin/news/${id}/publish`).send({});

    // Workflow says PUBLISHED, public says 404 — not visible before the date.
    const hidden = await request(ctx.app).get(`/api/public/news/${id}`);
    expect(hidden.status).toBe(404);

    // Bring the date into the past → the already-published item becomes visible.
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const edited = await ctx.editor.patch(`/admin/news/${id}`).send({
      title: 'Upcoming announcement', body: 'Details soon.', categoryId: deps.cat.id,
      publicationDate: past, reason: 'Bring date forward',
    });
    expect(edited.status).toBe(200);
    await ctx.editor.post(`/admin/news/${id}/submit`).send({});
    await ctx.reviewer.post(`/admin/news/${id}/approve`).send({});
    await ctx.reviewer.post(`/admin/news/${id}/publish`).send({});

    const visible = await request(ctx.app).get(`/api/public/news/${id}`);
    expect(visible.status).toBe(200);
    expect(visible.body.news.title).toBe('Upcoming announcement');
  });

  it('News unpublish takes a published item down (PUBLISHED → DRAFT) and the public endpoint 404s', async () => {
    const ctx = await makeCtx();
    const deps = await publishDeps(ctx);

    const item = await publish(ctx, 'news', {
      title: 'Depot opening', slug: 'depot-opening', body: 'We opened a depot.', categoryId: deps.cat.id,
    });
    const up = await request(ctx.app).get(`/api/public/news/${item.id}`);
    expect(up.status).toBe(200);

    const takenDown = await ctx.reviewer.post(`/admin/news/${item.id}/unpublish`).send({ reason: 'Wrong date' });
    expect(takenDown.status).toBe(200);
    expect(takenDown.body.news.status).toBe('DRAFT');

    const down = await request(ctx.app).get(`/api/public/news/${item.id}`);
    expect(down.status).toBe(404);
    expect(ctx.db.auditRows.map((r) => r.action)).toContain('NEWS_UNPUBLISHED');
  });

  it('Leadership timeline: APPOINTED then DEPARTED events update currentStatus without erasing history', async () => {
    const ctx = await makeCtx();
    const deps = await publishDeps(ctx);

    const created = await ctx.editor.post('/admin/leadership').send({
      name: 'Khalid Hassan', position: 'Director', bio: 'Leads operations.', companyId: deps.coA.id, reason: 'Create',
    });
    const leaderId = created.body.leadership.id;
    expect(created.body.leadership.currentStatus).toBe('ACTIVE');

    const appointed = await ctx.editor.post(`/admin/leadership/${leaderId}/events`).send({
      eventType: 'APPOINTED', date: '2020-01-01T00:00:00.000Z', notes: 'Joined the board',
    });
    expect(appointed.status).toBe(201);

    const afterAppointed = await ctx.editor.get(`/admin/leadership/${leaderId}`);
    expect(afterAppointed.body.leadership.currentStatus).toBe('ACTIVE');

    const departed = await ctx.editor.post(`/admin/leadership/${leaderId}/events`).send({
      eventType: 'DEPARTED', date: '2024-12-31T00:00:00.000Z', notes: 'Retired',
    });
    expect(departed.status).toBe(201);

    // current status reflects the latest event…
    const afterDeparted = await ctx.editor.get(`/admin/leadership/${leaderId}`);
    expect(afterDeparted.body.leadership.currentStatus).toBe('DEPARTED');

    // …and the full timeline is intact (history never erased).
    const events = await ctx.db.leadershipEvent.findMany({ where: { leadershipId: leaderId } });
    expect(events.map((e) => e.eventType).sort()).toEqual(['APPOINTED', 'DEPARTED']);
    expect(ctx.db.auditRows.map((r) => r.action)).toContain('LEADERSHIP_EVENT_CREATED');
  });

  it('HistoryEvent links multiple companies via the join table, and public read works', async () => {
    const ctx = await makeCtx();
    const deps = await publishDeps(ctx);

    const event = await publish(ctx, 'history-events', {
      title: 'Joint venture formed', date: '2010-05-01T00:00:00.000Z', companyIds: [deps.coA.id, deps.coB.id],
    });
    const joins = await ctx.db.historyEventCompany.findMany({ where: { historyEventId: event.id } });
    expect(joins.length).toBe(2);

    const pub = await request(ctx.app).get(`/api/public/history-events/${event.id}`);
    expect(pub.status).toBe(200);
    expect(pub.body.historyEvent.title).toBe('Joint venture formed');
  });

  it('CareerListing OPEN/CLOSED works independently of the lifecycle: closed listings are not public', async () => {
    const ctx = await makeCtx();
    const deps = await publishDeps(ctx);

    const open = await publish(ctx, 'career-listings', {
      jobTitle: 'Accountant', department: 'Finance', companyId: deps.coA.id, locationId: deps.loc.id, listingStatus: 'OPEN',
    });
    const closed = await publish(ctx, 'career-listings', {
      jobTitle: 'Intern', department: 'Finance', companyId: deps.coA.id, locationId: deps.loc.id, listingStatus: 'CLOSED',
    });

    const openPub = await request(ctx.app).get(`/api/public/career-listings/${open.id}`);
    expect(openPub.status).toBe(200);
    const closedPub = await request(ctx.app).get(`/api/public/career-listings/${closed.id}`);
    expect(closedPub.status).toBe(404);
    const list = await request(ctx.app).get('/api/public/career-listings');
    expect(list.body.careerListing.length).toBe(1);
    expect(list.body.careerListing[0].jobTitle).toBe('Accountant');
  });

  it('Contact publicDisplay=false hides a published contact from the public API', async () => {
    const ctx = await makeCtx();
    const deps = await publishDeps(ctx);

    const hidden = await publish(ctx, 'contacts', {
      name: 'Internal Line', type: 'CORPORATE', email: 'internal@lakeoilgroup.com', publicDisplay: false, companyId: deps.coA.id,
    });
    const shown = await publish(ctx, 'contacts', {
      name: 'Public Line', type: 'CORPORATE', email: 'info@lakeoilgroup.com', publicDisplay: true, companyId: deps.coA.id,
    });

    const hiddenPub = await request(ctx.app).get(`/api/public/contacts/${hidden.id}`);
    expect(hiddenPub.status).toBe(404);
    const shownPub = await request(ctx.app).get(`/api/public/contacts/${shown.id}`);
    expect(shownPub.status).toBe(200);
  });

  it('Page ↔ ContentBlock join: a block can appear on multiple pages; rollback restores composition', async () => {
    const ctx = await makeCtx();
    const deps = await publishDeps(ctx);

    const cb2 = await publish(ctx, 'content-blocks', { key: 'cta-quote', type: 'CALLOUT', content: { text: 'Contact us' } });

    // page A uses [mission, cta], page B reuses [mission] — referenced by KEY
    const pageA = await publish(ctx, 'pages', { slug: 'page-a', title: 'Page A', contentBlocks: ['about-mission', 'cta-quote'] });
    const pageB = await publish(ctx, 'pages', { slug: 'page-b', title: 'Page B', contentBlocks: ['about-mission'] });

    const joinsFor = async (pageId) => {
      const joins = await ctx.db.pageContentBlock.findMany({
        where: { pageId },
        orderBy: { position: 'asc' },
      });
      return joins.map((j) => j.contentBlockId);
    };
    expect(await joinsFor(pageA.id)).toEqual([deps.cb.id, cb2.id]);
    expect(await joinsFor(pageB.id)).toEqual([deps.cb.id]);

    // edit page A to drop the CTA block → composition changes
    const edited = await ctx.editor.patch(`/admin/pages/${pageA.id}`).send({
      title: 'Page A', contentBlocks: ['about-mission'], reason: 'Drop CTA',
    });
    expect(edited.status).toBe(200);
    await ctx.editor.post(`/admin/pages/${pageA.id}/submit`).send({});
    await ctx.reviewer.post(`/admin/pages/${pageA.id}/approve`).send({});
    await ctx.reviewer.post(`/admin/pages/${pageA.id}/publish`).send({});
    expect(await joinsFor(pageA.id)).toEqual([deps.cb.id]);

    // rollback restores the original composition too, not just the title
    const rolled = await ctx.admin.post(`/admin/pages/${pageA.id}/rollback`).send({});
    expect(rolled.status).toBe(200);
    expect(await joinsFor(pageA.id)).toEqual([deps.cb.id, cb2.id]);
    expect(rolled.body.page.title).toBe('Page A');

    // block is still reusable on page B
    expect(await joinsFor(pageB.id)).toEqual([deps.cb.id]);
  });

  it('Milestone child CRUD works under a Project (create/list/patch/delete, audited)', async () => {
    const ctx = await makeCtx();
    const deps = await publishDeps(ctx);

    const project = await publish(ctx, 'projects', { title: 'New depot', companyId: deps.coA.id, locationId: deps.loc.id });

    const created = await ctx.editor.post(`/admin/projects/${project.id}/milestones`).send({
      title: 'Groundbreaking', date: '2025-06-01T00:00:00.000Z',
    });
    expect(created.status).toBe(201);
    expect(created.body.milestone.status).toBeUndefined(); // not governed
    const mId = created.body.milestone.id;

    const list = await ctx.editor.get(`/admin/projects/${project.id}/milestones`);
    expect(list.body.milestones.length).toBe(1);

    const patched = await ctx.editor.patch(`/admin/projects/${project.id}/milestones/${mId}`).send({
      title: 'Groundbreaking ceremony', date: '2025-06-01T00:00:00.000Z',
    });
    expect(patched.status).toBe(200);
    expect(patched.body.milestone.title).toBe('Groundbreaking ceremony');

    const deleted = await ctx.editor.delete(`/admin/projects/${project.id}/milestones/${mId}`);
    expect(deleted.status).toBe(204);
    const after = await ctx.editor.get(`/admin/projects/${project.id}/milestones`);
    expect(after.body.milestones.length).toBe(0);

    const actions = ctx.db.auditRows.map((r) => r.action);
    expect(actions).toContain('MILESTONE_CREATED');
    expect(actions).toContain('MILESTONE_UPDATED');
    expect(actions).toContain('MILESTONE_DELETED');
  });

  it('Media (Phase 6 library) create stores the uploader from the session, lands in DRAFT, and is listable', async () => {
    const ctx = await makeCtx();

    const created = await ctx.editor.post('/admin/media').send({
      url: 'https://cdn.example.com/logo.png', altText: 'Lake Group logo', caption: 'Corporate logo', reason: 'Upload',
    });
    expect(created.status).toBe(201);
    expect(created.body.media.url).toBe('https://cdn.example.com/logo.png');
    // Media is a governed entity like everything else.
    expect(created.body.media.status).toBe('DRAFT');
    // uploadedBy is always server-set from the session, never client input
    // (editor user id is deterministic in helpers.js: u_<sanitized email>)
    expect(created.body.media.uploadedBy).toBe('u_editorlakegrouptest');

    const list = await ctx.editor.get('/admin/media');
    expect(list.body.media.length).toBe(1);
    expect(ctx.db.auditRows.map((r) => r.action)).toContain('MEDIA_CREATED');

    // unauthenticated → 401
    const anon = await request(ctx.app).post('/admin/media').send({ url: 'https://x.example.com/a.png' });
    expect(anon.status).toBe(401);
  });
});
