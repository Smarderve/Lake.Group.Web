import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { makeApp } from './helpers.js';
import { productionConfigProblems, resolveConfig } from '../src/config.js';

const VALID_PAYLOAD = { name: 'demo', email: 'demo@lakegroup.test', age: 30 };

describe('SECURITY_ROADMAP Phase 1 — environment separation', () => {
  it('dev validation endpoint (/example/echo) exists outside production', async () => {
    const { app } = makeApp({});
    const res = await request(app).post('/example/echo').send(VALID_PAYLOAD);
    expect(res.status).toBe(200);
  });

  it('dev endpoint is NOT mounted in production (404, deny by default)', async () => {
    const { app } = makeApp({ options: { devEndpointsEnabled: false } });
    const res = await request(app).post('/example/echo').send(VALID_PAYLOAD);
    expect(res.status).toBe(404);
  });

  it('production app never serves /example even with a valid payload', async () => {
    const { app } = makeApp({ options: { devEndpointsEnabled: false } });
    const res = await request(app).get('/example/anything');
    expect(res.status).toBe(404);
  });
});

describe('SECURITY_ROADMAP Phase 1 — production configuration', () => {
  it('resolveConfig normalizes environments and hardens production defaults', () => {
    const prod = resolveConfig({ NODE_ENV: 'production', DATABASE_URL: 'x', SESSION_SECRET: 'y'.repeat(40) });
    expect(prod.isProduction).toBe(true);
    expect(prod.devEndpointsEnabled).toBe(false);
    expect(prod.cookieSecure).toBe(true);

    const dev = resolveConfig({});
    expect(dev.isProduction).toBe(false);
    expect(dev.devEndpointsEnabled).toBe(true);
    expect(dev.cookieSecure).toBe(false);

    const staged = resolveConfig({ NODE_ENV: 'staging', SESSION_COOKIE_SECURE: 'true' });
    expect(staged.env).toBe('staging');
    expect(staged.cookieSecure).toBe(true);
  });

  it('unknown NODE_ENV values fall back to development (deny-by-default, never prod)', () => {
    const weird = resolveConfig({ NODE_ENV: 'PROD', SESSION_SECRET: 'x'.repeat(40), DATABASE_URL: 'x' });
    expect(weird.env).toBe('development');
    expect(weird.isProduction).toBe(false);
  });

  it('productionConfigProblems refuses to boot on weak production config', () => {
    const problems = productionConfigProblems({
      isProduction: true,
      databaseUrl: '',
      sessionSecret: 'short',
      cookieSecure: false,
    });
    expect(problems.length).toBeGreaterThanOrEqual(3);
    expect(problems.join(' ')).toContain('DATABASE_URL');
    expect(problems.join(' ')).toContain('SESSION_SECRET');
    expect(problems.join(' ')).toContain('SESSION_COOKIE_SECURE');
  });

  it('productionConfigProblems passes a hardened production config', () => {
    const problems = productionConfigProblems({
      isProduction: true,
      databaseUrl: 'postgresql://owner:p@host/db',
      databaseUrlRuntime: 'postgresql://runtime:p@host/db',
      sessionSecret: 'x'.repeat(40),
      mfaEncryptionKey: Buffer.alloc(32, 9).toString('base64'),
      cookieSecure: true,
      trustProxy: 0,
      trustProxyValid: true,
      cmsAllowedOrigins: ['https://cms.example.com'],
      csrfAllowedOrigins: ['https://cms.example.com'],
      backupEncryptionKey: 'b'.repeat(64),
      backupRetentionDays: 30,
      backupStoragePrefix: 'production/backups/',
      mediaStorageDriver: 's3',
      mediaPublicBaseUrl: 'https://media.example.com',
      mediaUploadMaxBytes: 10 * 1024 * 1024,
      s3Region: 'af-south-1',
      s3Bucket: 'lake-group-production',
      publicReleaseEnabled: true,
      publicReleaseGithubRepository: 'lake-group/public-website',
      publicReleaseGithubToken: 'github_pat_' + 'x'.repeat(64),
      publicReleaseApiBaseUrl: 'https://api.example.com',
    });
    expect(problems).toEqual([]);
  });

  it('productionConfigProblems is a no-op outside production', () => {
    expect(productionConfigProblems({ isProduction: false, databaseUrl: '', sessionSecret: '', cookieSecure: false })).toEqual([]);
  });
});
