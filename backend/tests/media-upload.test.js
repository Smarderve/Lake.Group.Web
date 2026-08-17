import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { makeApp, makeUser } from './helpers.js';

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

function memoryStorage() {
  const objects = new Map();
  return {
    provider: 'test',
    objects,
    async put({ key, body, contentType }) {
      objects.set(key, { body: Buffer.from(body), contentType });
      return { key, url: `https://media.example.test/${key}` };
    },
    async delete(key) {
      objects.delete(key);
    },
  };
}

async function setup() {
  const users = [
    await makeUser({ email: 'editor@lakegroup.test', password: 'pw-editor-1', role: 'EDITOR' }),
    await makeUser({ email: 'reviewer@lakegroup.test', password: 'pw-review-1', role: 'REVIEWER' }),
    await makeUser({ email: 'admin@lakegroup.test', password: 'pw-admin-1', role: 'SUPER_ADMIN' }),
  ];
  const storage = memoryStorage();
  const ctx = makeApp({ users, options: { mediaStorage: storage, mediaUploadMaxBytes: 1024 } });
  const login = async (email, password) => {
    const agent = request.agent(ctx.app);
    expect((await agent.post('/auth/login').send({ email, password })).status).toBe(200);
    return agent;
  };
  return {
    ...ctx,
    storage,
    editor: await login('editor@lakegroup.test', 'pw-editor-1'),
    reviewer: await login('reviewer@lakegroup.test', 'pw-review-1'),
    admin: await login('admin@lakegroup.test', 'pw-admin-1'),
  };
}

describe('binary media uploads', () => {
  it('authorizes editors, verifies file bytes, uses a generated key, and persists governed metadata', async () => {
    const ctx = await setup();
    const response = await ctx.editor
      .post('/admin/media/uploads')
      .field('altText', 'One transparent pixel')
      .field('reason', 'Upload approved source asset')
      .attach('file', PNG, { filename: '../../unsafe name.exe', contentType: 'image/png' });

    expect(response.status).toBe(201);
    expect(response.body.media).toMatchObject({
      altText: 'One transparent pixel',
      mimeType: 'image/png',
      sizeBytes: PNG.length,
      storageProvider: 'test',
      status: 'DRAFT',
    });
    expect(response.body.media.storageKey).toMatch(/^media\/\d{4}\/\d{2}\/[0-9a-f-]+\.png$/);
    expect(response.body.media.storageKey).not.toContain('unsafe');
    expect(ctx.storage.objects.has(response.body.media.storageKey)).toBe(true);
  });

  it('rejects unauthenticated, unsupported, and oversized uploads before storage', async () => {
    const ctx = await setup();
    expect((await request(ctx.app).post('/admin/media/uploads').attach('file', PNG, 'pixel.png')).status).toBe(401);

    const unsupported = await ctx.editor
      .post('/admin/media/uploads')
      .field('reason', 'Invalid file')
      .attach('file', Buffer.from('<svg onload="alert(1)"/>'), { filename: 'attack.svg', contentType: 'image/svg+xml' });
    expect(unsupported.status).toBe(415);
    expect(unsupported.body.error.code).toBe('UNSUPPORTED_MEDIA_TYPE');

    const oversized = await ctx.editor
      .post('/admin/media/uploads')
      .field('reason', 'Too large')
      .attach('file', Buffer.alloc(2048), { filename: 'large.png', contentType: 'image/png' });
    expect(oversized.status).toBe(413);
    expect(ctx.storage.objects.size).toBe(0);
  });

  it('allows a super admin to delete only an unused draft upload', async () => {
    const ctx = await setup();
    const uploaded = await ctx.editor
      .post('/admin/media/uploads')
      .field('reason', 'Temporary asset')
      .attach('file', PNG, { filename: 'pixel.png', contentType: 'image/png' });
    const id = uploaded.body.media.id;
    const key = uploaded.body.media.storageKey;

    expect((await ctx.editor.delete(`/admin/media/${id}/upload`)).status).toBe(403);
    const deleted = await ctx.admin.delete(`/admin/media/${id}/upload`);
    expect(deleted.status).toBe(204);
    expect(ctx.storage.objects.has(key)).toBe(false);
    expect(await ctx.db.media.findFirst({ where: { id } })).toBeNull();
  });

  it('publishes uploaded media into the resilient public shape without leaking storage keys', async () => {
    const ctx = await setup();
    const uploaded = await ctx.editor
      .post('/admin/media/uploads')
      .field('altText', 'Published pixel')
      .field('reason', 'Public release asset')
      .attach('file', PNG, { filename: 'pixel.png', contentType: 'image/png' });
    const id = uploaded.body.media.id;
    await ctx.editor.post(`/admin/media/${id}/submit`).send({});
    await ctx.reviewer.post(`/admin/media/${id}/approve`).send({});
    expect((await ctx.reviewer.post(`/admin/media/${id}/publish`).send({})).status).toBe(200);

    const publicResponse = await request(ctx.app).get('/api/public/media');
    expect(publicResponse.body.media[0]).toMatchObject({
      id,
      url: expect.stringMatching(/^https:\/\/media\.example\.test\/media\//),
      altText: 'Published pixel',
    });
    expect(publicResponse.body.media[0]).not.toHaveProperty('storageProvider');
    expect(publicResponse.body.media[0]).not.toHaveProperty('storageKey');
    expect((await ctx.admin.delete(`/admin/media/${id}/upload`)).status).toBe(409);
  });
});
