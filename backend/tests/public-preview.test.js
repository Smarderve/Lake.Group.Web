import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { makeApp, makeUser } from './helpers.js';

async function setup() {
  const users = [
    await makeUser({ email: 'editor@lakegroup.test', password: 'pw-editor-1', role: 'EDITOR' }),
    await makeUser({ email: 'reviewer@lakegroup.test', password: 'pw-review-1', role: 'REVIEWER' }),
    await makeUser({ email: 'viewer@lakegroup.test', password: 'pw-viewer-1', role: 'VIEWER' }),
  ];
  const ctx = makeApp({ users });

  async function login(email, password) {
    const agent = request.agent(ctx.app);
    const response = await agent.post('/auth/login').send({ email, password });
    expect(response.status).toBe(200);
    return agent;
  }

  return {
    ...ctx,
    editor: await login('editor@lakegroup.test', 'pw-editor-1'),
    reviewer: await login('reviewer@lakegroup.test', 'pw-review-1'),
    viewer: await login('viewer@lakegroup.test', 'pw-viewer-1'),
  };
}

describe('Phase 16 — secure public-content preview', () => {
  it('keeps a draft off the public API while allowing an authenticated preview in the public response shape', async () => {
    const ctx = await setup();
    const created = await ctx.editor.post('/admin/news').send({
      title: 'Preview-only expansion',
      slug: 'preview-only-expansion',
      body: 'This draft must not be visible on the public website.',
      reason: 'Prepare the announcement',
    });
    expect(created.status).toBe(201);
    const id = created.body.news.id;

    const unauthenticated = await request(ctx.app).get(`/admin/preview/news/${id}`);
    expect(unauthenticated.status).toBe(401);

    const publicResponse = await request(ctx.app).get(`/api/public/news/${id}`);
    expect(publicResponse.status).toBe(404);

    const preview = await ctx.viewer.get(`/admin/preview/news/${id}`);
    expect(preview.status).toBe(200);
    expect(preview.headers['cache-control']).toBe('private, no-store');
    expect(preview.headers['x-robots-tag']).toBe('noindex, nofollow, noarchive');
    expect(preview.headers['access-control-allow-origin']).toBeUndefined();
    expect(preview.body.preview).toMatchObject({
      route: 'news',
      entity: 'news',
      status: 'DRAFT',
      publiclyVisible: false,
      publicPath: '/api/public/news/preview-only-expansion',
      record: {
        id,
        title: 'Preview-only expansion',
        slug: 'preview-only-expansion',
        body: 'This draft must not be visible on the public website.',
      },
    });
    expect(preview.body.preview.record.status).toBeUndefined();
    expect(preview.body.preview.record.createdAt).toBeUndefined();
  });

  it('matches the public response after publication and reports visibility gates truthfully', async () => {
    const ctx = await setup();
    const created = await ctx.editor.post('/admin/news').send({
      title: 'Scheduled expansion',
      slug: 'scheduled-expansion',
      body: 'Approved now, public next month.',
      publicationDate: '2099-01-01T00:00:00.000Z',
      reason: 'Prepare the announcement',
    });
    const id = created.body.news.id;

    await ctx.editor.post(`/admin/news/${id}/submit`).send({});
    await ctx.reviewer.post(`/admin/news/${id}/approve`).send({});
    await ctx.reviewer.post(`/admin/news/${id}/publish`).send({});

    const gatedPreview = await ctx.viewer.get(`/admin/preview/news/${id}`);
    expect(gatedPreview.status).toBe(200);
    expect(gatedPreview.body.preview).toMatchObject({
      status: 'PUBLISHED',
      publiclyVisible: false,
      visibilityReason: 'Scheduled for future publication',
    });
    expect((await request(ctx.app).get(`/api/public/news/${id}`)).status).toBe(404);

    const updated = await ctx.editor.patch(`/admin/news/${id}`).send({
      title: 'Scheduled expansion',
      body: 'Approved and public now.',
      publicationDate: '2020-01-01T00:00:00.000Z',
      reason: 'Publish immediately',
    });
    expect(updated.status).toBe(200);
    await ctx.editor.post(`/admin/news/${id}/submit`).send({});
    await ctx.reviewer.post(`/admin/news/${id}/approve`).send({});
    await ctx.reviewer.post(`/admin/news/${id}/publish`).send({});

    const livePreview = await ctx.viewer.get(`/admin/preview/news/${id}`);
    const publicResponse = await request(ctx.app).get(`/api/public/news/${id}`);
    expect(livePreview.body.preview.publiclyVisible).toBe(true);
    expect(publicResponse.status).toBe(200);
    expect(livePreview.body.preview.record).toEqual(publicResponse.body.news);
  });

  it('previews draft metrics without exposing them through the public metric endpoint', async () => {
    const ctx = await setup();
    const created = await ctx.editor.post('/admin/metrics').send({
      key: 'phase16-preview',
      label: 'Phase 16 preview metric',
      value: '42',
      unit: 'sites',
      source: 'Integration test fixture',
      reason: 'Verify secure metric preview',
    });
    expect(created.status).toBe(201);
    const id = created.body.metric.id;

    expect((await request(ctx.app).get('/api/public/metrics/phase16-preview')).status).toBe(404);

    const preview = await ctx.viewer.get(`/admin/preview/metrics/${id}`);
    expect(preview.status).toBe(200);
    expect(preview.body.preview).toMatchObject({
      route: 'metrics',
      entity: 'metric',
      status: 'DRAFT',
      publiclyVisible: false,
      publicPath: '/api/public/metrics/phase16-preview',
      record: {
        key: 'phase16-preview',
        label: 'Phase 16 preview metric',
        value: '42',
        unit: 'sites',
      },
    });
    expect(preview.body.preview.record.source).toBeUndefined();
  });
});
