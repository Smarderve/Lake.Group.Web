import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { makeApp, makeUser } from './helpers.js';

async function makeCtx() {
  const users = [
    await makeUser({ email: 'admin@lakegroup.test', password: 'pw-admin-1', role: 'SUPER_ADMIN' }),
  ];
  const ctx = makeApp({ users });
  const agent = request.agent(ctx.app);
  await agent.post('/auth/login').send({ email: 'admin@lakegroup.test', password: 'pw-admin-1' });
  return { ...ctx, agent };
}

describe('SECURITY_ROADMAP Phase 9 — excessive data exposure', () => {
  let ctx;
  beforeEach(async () => {
    ctx = await makeCtx();
    // Seed a PUBLISHED media row carrying the internal fields.
    await ctx.db.media.create({
      data: {
        url: 'assets/images/hero.jpg', altText: 'Hero', caption: 'Hero image',
        tags: ['operations'], uploadedBy: 'u_adminlakegrouptest', folderId: 'f_internal',
        status: 'PUBLISHED',
      },
    });
    await ctx.db.contact.create({
      data: {
        name: 'Group HQ', type: 'HEADQUARTERS', phone: '+255 700 000 000', email: 'hq@lakegroup.test',
        verificationStatus: 'VERIFIED', verificationDate: new Date('2026-01-01'), order: 3,
        publicDisplay: true, status: 'PUBLISHED',
      },
    });
  });

  it('the public media shape never leaks uploader ids or internal folders', async () => {
    const list = await request(ctx.app).get('/api/public/media');
    expect(list.status).toBe(200);
    const row = list.body.media[0];
    expect(row).toBeTruthy();
    expect(row.url).toBe('assets/images/hero.jpg');
    expect(row.uploadedBy).toBeUndefined();
    expect(row.folderId).toBeUndefined();
    expect(row.status).toBeUndefined();
    expect(row.tags).toEqual(['operations']);

    const one = await request(ctx.app).get(`/api/public/media/${row.id}`);
    expect(one.status).toBe(200);
    expect(one.body.media.uploadedBy).toBeUndefined();
    expect(one.body.media.folderId).toBeUndefined();
  });

  it('the public contact shape never leaks verification workflow or sort metadata', async () => {
    const res = await request(ctx.app).get('/api/public/contacts');
    expect(res.status).toBe(200);
    const row = res.body.contact[0];
    expect(row).toBeTruthy();
    expect(row.name).toBe('Group HQ');
    expect(row.verificationStatus).toBeUndefined();
    expect(row.verificationDate).toBeUndefined();
    expect(row.order).toBeUndefined();
    expect(row.status).toBeUndefined();
  });

  it('no public entity response carries credentials or internal user references', async () => {
    const routes = ['companies', 'news', 'facilities', 'leadership', 'media', 'contacts', 'projects', 'career-listings'];
    for (const route of routes) {
      const res = await request(ctx.app).get(`/api/public/${route}`);
      expect(res.status, route).toBe(200);
      const key = Object.keys(res.body).find((k) => k !== 'generatedAt') || route;
      const rows = Array.isArray(res.body[key]) ? res.body[key] : [];
      for (const row of rows) {
        expect(row.passwordHash, `${route} passwordHash`).toBeUndefined();
        expect(row.mfaSecret, `${route} mfaSecret`).toBeUndefined();
        expect(row.uploadedBy, `${route} uploadedBy`).toBeUndefined();
      }
    }
  });

  it('the admin user list exposes only public fields (no hashes, no MFA secrets)', async () => {
    const res = await ctx.agent.get('/admin/users');
    expect(res.status).toBe(200);
    for (const user of res.body.users) {
      expect(user.passwordHash).toBeUndefined();
      expect(user.mfaSecret).toBeUndefined();
      expect(user.email).toBeTruthy();
    }
  });
});
