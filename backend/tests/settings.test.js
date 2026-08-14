import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { makeApp, makeUser } from './helpers.js';

/**
 * Settings Center API tests (backend/src/routes/settings.js).
 *
 * Uses an in-memory prefs store (app default) so the suite is hermetic; the
 * PostgreSQL store has its own persistence proof pattern (rate-limit store).
 */
describe('settings: preferences + system', () => {
  let ctx;
  let agent;

  beforeEach(async () => {
    const admin = await makeUser({ email: 'admin@lakegroup.test', password: 'correct-horse', role: 'SUPER_ADMIN' });
    ctx = makeApp({ users: [admin] });
    agent = request.agent(ctx.app);
    await agent.post('/auth/login').send({ email: 'admin@lakegroup.test', password: 'correct-horse' });
  });

  it('requires authentication', async () => {
    const res = await request(ctx.app).get('/admin/settings');
    expect(res.status).toBe(401);
  });

  it('returns defaults on first read, with option values for the UI', async () => {
    const res = await agent.get('/admin/settings');
    expect(res.status).toBe(200);
    expect(res.body.preferences.theme).toBe('system');
    expect(res.body.preferences.language).toBe('en');
    expect(res.body.preferences.timezone).toBe('UTC');
    expect(res.body.preferences.density).toBe('comfortable');
    expect(res.body.preferences.compactMode).toBe(false);
    expect(res.body.options.themes).toContain('dark');
    expect(res.body.options.languages).toContain('sw');
    expect(res.body.options.densities).toEqual(['comfortable', 'compact']);
  });

  it('persists a preference patch and reflects it on a later read', async () => {
    const patch = await agent.patch('/admin/settings').send({ theme: 'dark', compactMode: true, density: 'compact' });
    expect(patch.status).toBe(200);
    expect(patch.body.preferences.theme).toBe('dark');
    expect(patch.body.preferences.compactMode).toBe(true);

    const read = await agent.get('/admin/settings');
    expect(read.body.preferences.theme).toBe('dark');
    expect(read.body.preferences.density).toBe('compact');
  });

  it('merges partial patches without wiping untouched fields', async () => {
    await agent.patch('/admin/settings').send({ theme: 'light' });
    const patch = await agent.patch('/admin/settings').send({ timezone: 'Africa/Nairobi' });
    expect(patch.body.preferences.theme).toBe('light');
    expect(patch.body.preferences.timezone).toBe('Africa/Nairobi');
    expect(patch.body.preferences.language).toBe('en'); // untouched default survives
  });

  it('deep-merges the JSON setting groups', async () => {
    await agent.patch('/admin/settings').send({
      notificationSettings: { email: true, publishing: true },
    });
    const patch = await agent.patch('/admin/settings').send({
      notificationSettings: { security: false },
    });
    expect(patch.body.preferences.notificationSettings).toEqual({
      email: true,
      publishing: true,
      security: false,
    });
  });

  it('rejects unknown preference keys (strict whitelist)', async () => {
    const res = await agent.patch('/admin/settings').send({ evilField: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects invalid enum values', async () => {
    const res = await agent.patch('/admin/settings').send({ theme: 'neon' });
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].path).toBe('theme');
  });

  it('scopes preferences per user', async () => {
    const other = await makeUser({ email: 'viewer@lakegroup.test', password: 'viewer-pass', role: 'VIEWER' });
    const otherAgent = request.agent(makeApp({ users: [other] }).app);
    await otherAgent.post('/auth/login').send({ email: 'viewer@lakegroup.test', password: 'viewer-pass' });

    await agent.patch('/admin/settings').send({ theme: 'dark' });
    const otherRead = await otherAgent.get('/admin/settings');
    expect(otherRead.body.preferences.theme).toBe('system'); // defaults, not admin's
  });

  it('returns system posture (read-only health)', async () => {
    const res = await agent.get('/admin/settings/system');
    expect(res.status).toBe(200);
    expect(res.body.system.service).toBe('lake-group-backend');
    expect(res.body.system.db).toBe('up');
    expect(res.body.system.posture.secureSessionCookies).toBe(true);
    expect(res.body.system.posture.mfaEnabled).toBe(false);
    expect(res.body.system.posture.role).toBe('SUPER_ADMIN');
  });

  it('rejects a password change with a wrong current password and audits it', async () => {
    const res = await agent.patch('/admin/settings/password').send({ currentPassword: 'wrong', newPassword: 'NewPass123!' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('WRONG_CURRENT_PASSWORD');
    expect(ctx.db.auditRows.some((r) => r.action === 'PASSWORD_CHANGE_FAILED')).toBe(true);
  });

  it('changes the password and audits it', async () => {
    const res = await agent.patch('/admin/settings/password').send({ currentPassword: 'correct-horse', newPassword: 'NewPass123!' });
    expect(res.status).toBe(200);
    expect(ctx.db.auditRows.some((r) => r.action === 'PASSWORD_CHANGED')).toBe(true);

    // Old password no longer works; new one does.
    await agent.post('/auth/logout').send({});
    const oldLogin = await request(ctx.app).post('/auth/login').send({ email: 'admin@lakegroup.test', password: 'correct-horse' });
    expect(oldLogin.status).toBe(401);
    const newLogin = await request(ctx.app).post('/auth/login').send({ email: 'admin@lakegroup.test', password: 'NewPass123!' });
    expect(newLogin.status).toBe(200);
  });

  it('audits preference changes', async () => {
    await agent.patch('/admin/settings').send({ theme: 'dark' });
    const row = ctx.db.auditRows.find((r) => r.action === 'SETTINGS_UPDATED');
    expect(row).toBeTruthy();
    expect(row.metadata.changed).toEqual(['theme']);
  });
});
