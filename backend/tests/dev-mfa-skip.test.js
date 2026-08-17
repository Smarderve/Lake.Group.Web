import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { makeApp, makeUser } from './helpers.js';

/**
 * DEVELOPMENT-ONLY MFA skip (DEV_MFA_SKIP_EMAILS):
 *
 * A named demo account with TOTP enrolled can log in without the second
 * factor while the environment is NOT production — the password is still
 * verified, so this is a second-factor skip for a local account, never an
 * authentication bypass. In production the config fail-fast refuses to
 * boot with the list set, and the login handler gates on isProduction as
 * a second layer. These tests lock all three properties in.
 */
describe('DEV_MFA_SKIP_EMAILS (development-only TOTP skip)', () => {
  const PASSWORD = 'demo-password-1';

  it('skips the TOTP step for a listed account outside production', async () => {
    const user = await makeUser({
      email: 'demo@lakegroup.test',
      password: PASSWORD,
      role: 'SUPER_ADMIN',
      mfaEnabled: true,
      mfaSecret: 'enc:v1:some-sealed-secret',
    });
    const { app } = makeApp({
      users: [user],
      options: {
        devMfaSkipEmails: ['demo@lakegroup.test'],
        isProduction: false,
      },
    });
    const agent = request.agent(app);

    const login = await agent.post('/auth/login').send({
      email: user.email,
      password: PASSWORD,
    });
    expect(login.status).toBe(200);
    // Full session immediately — no { mfaRequired: true } second step.
    expect(login.body.mfaRequired).toBeUndefined();
    expect(login.body.user.email).toBe(user.email);

    // The session is actually usable on an authenticated surface.
    const admin = await agent.get('/admin/notifications');
    expect(admin.status).toBe(200);
  });

  it('still requires the TOTP step in production, even for a listed account', async () => {
    const user = await makeUser({
      email: 'demo@lakegroup.test',
      password: PASSWORD,
      role: 'SUPER_ADMIN',
      mfaEnabled: true,
      mfaSecret: 'enc:v1:some-sealed-secret',
    });
    const { app } = makeApp({
      users: [user],
      options: {
        devMfaSkipEmails: ['demo@lakegroup.test'],
        isProduction: true,
      },
    });
    const agent = request.agent(app);

    const login = await agent.post('/auth/login').send({
      email: user.email,
      password: PASSWORD,
    });
    expect(login.status).toBe(200);
    expect(login.body.mfaRequired).toBe(true);
  });

  it('still verifies the password — a wrong password is rejected even when listed', async () => {
    const user = await makeUser({
      email: 'demo@lakegroup.test',
      password: PASSWORD,
      role: 'SUPER_ADMIN',
      mfaEnabled: true,
      mfaSecret: 'enc:v1:some-sealed-secret',
    });
    const { app } = makeApp({
      users: [user],
      options: {
        devMfaSkipEmails: ['demo@lakegroup.test'],
        isProduction: false,
      },
    });
    const agent = request.agent(app);

    const login = await agent.post('/auth/login').send({
      email: user.email,
      password: 'wrong-password',
    });
    expect(login.status).toBe(401);
  });

  it('does not skip when the email is not listed', async () => {
    const user = await makeUser({
      email: 'demo@lakegroup.test',
      password: PASSWORD,
      role: 'SUPER_ADMIN',
      mfaEnabled: true,
      mfaSecret: 'enc:v1:some-sealed-secret',
    });
    const { app } = makeApp({
      users: [user],
      options: { devMfaSkipEmails: ['someone-else@lakegroup.test'] },
    });
    const agent = request.agent(app);

    const login = await agent.post('/auth/login').send({
      email: user.email,
      password: PASSWORD,
    });
    expect(login.status).toBe(200);
    expect(login.body.mfaRequired).toBe(true);
  });
});
