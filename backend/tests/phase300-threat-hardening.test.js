import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createS3Storage } from '../src/lib/object-storage.js';
import { createSecretBox } from '../src/lib/secret-box.js';
import { makeApp, makeUser } from './helpers.js';

describe('300-threat plan application hardening', () => {
  it('requires configured privileged roles to enroll MFA before admin access', async () => {
    const user = await makeUser({
      email: 'admin-no-mfa@lakegroup.test',
      password: 'admin-password-1',
      role: 'SUPER_ADMIN',
    });
    const { app } = makeApp({
      users: [user],
      options: { mfaRequiredRoles: ['SUPER_ADMIN'] },
    });
    const agent = request.agent(app);

    expect((await agent.post('/auth/login').send({
      email: user.email,
      password: 'admin-password-1',
    })).status).toBe(200);

    const denied = await agent.get('/admin/users');
    expect(denied.status).toBe(403);
    expect(denied.body.error.code).toBe('MFA_ENROLLMENT_REQUIRED');

    // Enrollment remains reachable so the account cannot be locked out.
    expect((await agent.post('/auth/mfa/setup').send({})).status).toBe(200);
  });

  it('marks authenticated surfaces private and non-cacheable', async () => {
    const user = await makeUser({
      email: 'cache-control@lakegroup.test',
      password: 'cache-password-1',
      role: 'EDITOR',
    });
    const { app } = makeApp({ users: [user] });
    const agent = request.agent(app);

    const login = await agent.post('/auth/login').send({
      email: user.email,
      password: 'cache-password-1',
    });
    expect(login.headers['cache-control']).toBe('private, no-store');

    const admin = await agent.get('/admin/notifications');
    expect(admin.status).toBe(200);
    expect(admin.headers['cache-control']).toBe('private, no-store');
    expect(admin.headers.pragma).toBe('no-cache');
  });

  it('forces active document uploads to download from object storage', async () => {
    const sent = [];
    const storage = createS3Storage({
      region: 'af-south-1',
      bucket: 'media',
      publicBaseUrl: 'https://media.example.test',
      client: { send: async (command) => sent.push(command.input) },
    });

    await storage.put({
      key: 'media/2026/08/document.pdf',
      body: Buffer.from('%PDF-1.7'),
      contentType: 'application/pdf',
      contentDisposition: 'attachment; filename="document.pdf"',
    });

    expect(sent[0].ContentDisposition).toBe('attachment; filename="document.pdf"');
  });

  it('encrypts newly enrolled TOTP secrets before database persistence', async () => {
    const user = await makeUser({
      email: 'mfa-at-rest@lakegroup.test',
      password: 'mfa-password-1',
      role: 'SUPER_ADMIN',
    });
    const secretBox = createSecretBox(Buffer.alloc(32, 7).toString('base64'));
    const { app, db } = makeApp({ users: [user], options: { secretBox } });
    const agent = request.agent(app);
    await agent.post('/auth/login').send({ email: user.email, password: 'mfa-password-1' });

    const setup = await agent.post('/auth/mfa/setup').send({});
    expect(setup.status).toBe(200);
    const stored = await db.user.findUnique({ where: { id: user.id } });
    expect(stored.mfaSecret).toMatch(/^enc:v1:/);
    expect(stored.mfaSecret).not.toContain(setup.body.secret);
    expect(secretBox.open(stored.mfaSecret)).toBe(setup.body.secret);
  });
});
