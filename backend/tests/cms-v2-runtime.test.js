import { describe, expect, it } from 'vitest';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createCmsV2ReleaseStorage } from '../src/lib/cms-v2-release-storage.js';
import request from 'supertest';
import { makeApp, makeUser } from './helpers.js';

describe('CMS V2 release storage', () => {
  const document = { key: 'lake-aviation', schemaVersion: 1, currentDraftRevision: null, currentPublishedRevision: null };

  it('mounts the real V2 document route behind a session and CMS access', async () => {
    const user = await makeUser({ email: 'v2@lakegroup.test', password: 'correct-horse', role: 'VIEWER' });
    user.cmsAccessLevel = 'IT_ADMIN';
    const service = { readDocument: async () => ({ key: 'lake-aviation', schemaVersion: 1, currentDraftRevision: null, currentPublishedRevision: null }) };
    const ctx = makeApp({ users: [user], options: { cmsV2Service: service } });
    expect((await request(ctx.app).get('/admin/v2/content/lake-aviation')).status).toBe(401);
    const agent = request.agent(ctx.app);
    await agent.post('/auth/login').send({ email: user.email, password: 'correct-horse' });
    const response = await agent.get('/admin/v2/content/lake-aviation');
    expect(response.status).toBe(200);
    expect(response.body.document.key).toBe('lake-aviation');
  });

  it('lists registered pages with real revision state for the control center', async () => {
    const user = await makeUser({ email: 'catalog@lakegroup.test', password: 'correct-horse', role: 'VIEWER' });
    user.cmsAccessLevel = 'IT_ADMIN';
    const service = { readDocument: async (key) => ({
      key,
      currentDraftRevisionId: key === 'home' ? 'draft-2' : null,
      currentPublishedRevisionId: key === 'home' ? 'draft-1' : null,
      currentDraftRevision: key === 'home' ? { data: { seo: { title: 'Lake Group home' } } } : null,
    }) };
    const ctx = makeApp({ users: [user], options: { cmsV2Service: service } });
    expect((await request(ctx.app).get('/admin/v2/pages')).status).toBe(401);
    const agent = request.agent(ctx.app);
    await agent.post('/auth/login').send({ email: user.email, password: 'correct-horse' });
    const response = await agent.get('/admin/v2/pages');
    expect(response.status).toBe(200);
    expect(response.body.pages.find((page) => page.key === 'home')).toMatchObject({
      route: 'index.html', title: 'Lake Group home', draftRevisionId: 'draft-2', publishedRevisionId: 'draft-1',
    });
  });

  it('writes an immutable snapshot before atomically replacing the current pointer', async () => {
    const root = await mkdtemp(join(tmpdir(), 'lake-cms-v2-'));
    const storage = createCmsV2ReleaseStorage({ root });
    const snapshot = { schemaVersion: 1, documents: { 'lake-aviation': { hero: { heading: 'Lake Aviation' } } } };
    await storage.writeRelease('release-a', snapshot);
    await storage.replaceCurrent({ schemaVersion: 2, releaseId: 'release-a', integrity: 'sha256-test', publishedAt: '2026-09-16T00:00:00.000Z', snapshotUrl: 'releases/release-a/content.json' });
    await expect(storage.writeRelease('release-a', snapshot)).rejects.toMatchObject({ code: 'RELEASE_EXISTS' });
    expect((await storage.readCurrent()).releaseId).toBe('release-a');
    expect(JSON.parse(await readFile(join(root, 'releases', 'release-a', 'content.json'), 'utf8'))).toEqual(snapshot);
  });

  it('enforces normal CMS authentication when the local bypass flag is off', async () => {
    const ctx = makeApp({ options: { cmsV2Service: { readDocument: async () => document }, cmsAuthBypassEnabled: false } });
    expect((await request(ctx.app).get('/admin/v2/content/lake-aviation')).status).toBe(401);
  });

  it('allows the labelled local test identity through MFA, CSRF, role and recent-auth guards only when explicitly enabled', async () => {
    const service = {
      readDocument: async () => document,
      saveDraft: async (input) => ({ id: 'draft-local', authorId: input.actorId }),
      restore: async (input) => ({ id: 'restore-local', actorId: input.actorId }),
    };
    const ctx = makeApp({
      options: {
        cmsV2Service: service,
        cmsAuthBypassEnabled: true,
        isProduction: false,
        mfaRequiredRoles: ['SUPER_ADMIN'],
      },
    });

    const read = await request(ctx.app).get('/admin/v2/content/lake-aviation');
    expect(read.status).toBe(200);
    expect(read.headers['x-cms-auth-bypass']).toBe('local-testing');

    // Deliberately cross-site: a normal CMS mutation would be CSRF-rejected.
    const draft = await request(ctx.app)
      .put('/admin/v2/content/lake-aviation/draft')
      .set('Origin', 'https://untrusted.example')
      .send({ baseRevisionId: null, data: {} });
    expect(draft.status).toBe(201);
    expect(draft.body.revision.authorId).toBeTruthy();

    const restore = await request(ctx.app).post('/admin/v2/releases/release-local/restore').send({});
    expect(restore.status).toBe(201);
    expect(restore.body.release.actorId).toBeTruthy();
  });

  it('fails closed in production even if a caller attempts to enable the bypass', async () => {
    const ctx = makeApp({
      options: {
        cmsV2Service: { readDocument: async () => document },
        cmsAuthBypassEnabled: true,
        isProduction: true,
        mfaRequiredRoles: ['SUPER_ADMIN'],
      },
    });
    const response = await request(ctx.app).get('/admin/v2/content/lake-aviation');
    expect(response.status).toBe(401);
    expect(response.headers['x-cms-auth-bypass']).toBeUndefined();
  });
});
