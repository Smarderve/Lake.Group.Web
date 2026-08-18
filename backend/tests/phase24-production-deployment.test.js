import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { makeApp } from './helpers.js';
import { productionConfigProblems, resolveConfig } from '../src/config.js';

const cmsOrigin = 'https://cms.lakegroup.example';

describe('production CMS origin controls', () => {
  it('returns exact credentialed CORS headers to an allowed CMS origin', async () => {
    const { app } = makeApp({ options: { cmsAllowedOrigins: [cmsOrigin] } });
    const response = await request(app).get('/auth/me').set('Origin', cmsOrigin);

    expect(response.status).toBe(401);
    expect(response.headers['access-control-allow-origin']).toBe(cmsOrigin);
    expect(response.headers['access-control-allow-credentials']).toBe('true');
    expect(response.headers.vary).toContain('Origin');
  });

  it('answers allowed administrative preflights without invoking auth or CSRF', async () => {
    const { app } = makeApp({ options: { cmsAllowedOrigins: [cmsOrigin] } });
    const response = await request(app)
      .options('/admin/users')
      .set('Origin', cmsOrigin)
      .set('Access-Control-Request-Method', 'GET')
      .set('Access-Control-Request-Headers', 'Content-Type');

    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe(cmsOrigin);
    expect(response.headers['access-control-allow-methods']).toContain('PATCH');
    expect(response.headers['access-control-allow-headers']).toBe('Content-Type, X-Request-Id');
  });

  it('rejects an untrusted cross-origin preflight', async () => {
    const { app } = makeApp({ options: { cmsAllowedOrigins: [cmsOrigin] } });
    const response = await request(app)
      .options('/admin/users')
      .set('Origin', 'https://attacker.example')
      .set('Access-Control-Request-Method', 'GET');

    expect(response.status).toBe(403);
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('preserves wildcard read access for the public content API', async () => {
    const { app } = makeApp({ options: { cmsAllowedOrigins: [cmsOrigin] } });
    const response = await request(app).get('/api/public/news').set('Origin', cmsOrigin);

    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe('*');
    expect(response.headers['access-control-allow-credentials']).toBeUndefined();
  });
});

describe('production deployment configuration', () => {
  const secureBase = {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://owner:secret@db.internal/lakegroup',
    DATABASE_URL_RUNTIME: 'postgresql://runtime:secret@db.internal/lakegroup',
    SESSION_SECRET: 'a'.repeat(64),
    MFA_ENCRYPTION_KEY: Buffer.alloc(32, 9).toString('base64'),
    SESSION_COOKIE_SECURE: 'true',
    TRUST_PROXY: '1',
    BACKUP_ENCRYPTION_KEY: 'b'.repeat(64),
    BACKUP_RETENTION_DAYS: '30',
    BACKUP_STORAGE_PREFIX: 'production/backups/',
    MEDIA_STORAGE_DRIVER: 's3',
    MEDIA_PUBLIC_BASE_URL: 'https://media.lakegroup.example',
    S3_REGION: 'af-south-1',
    S3_BUCKET: 'lake-group-production',
    PUBLIC_RELEASE_ENABLED: 'true',
    PUBLIC_RELEASE_GITHUB_REPOSITORY: 'lake-group/public-website',
    PUBLIC_RELEASE_GITHUB_TOKEN: 'github_pat_' + 'x'.repeat(64),
    PUBLIC_RELEASE_API_BASE_URL: 'https://api.lakegroup.example',
  };

  it('requires an explicit HTTPS CMS allowlist covered by CSRF protection', () => {
    expect(productionConfigProblems(resolveConfig(secureBase))).toContain(
      'CMS_ALLOWED_ORIGINS must include at least one HTTPS origin in production',
    );

    const insecure = resolveConfig({
      ...secureBase,
      CMS_ALLOWED_ORIGINS: 'http://cms.example.com',
      CSRF_ALLOWED_ORIGINS: 'http://cms.example.com',
    });
    expect(productionConfigProblems(insecure)).toContain(
      'CMS_ALLOWED_ORIGINS entries must be valid HTTPS origins in production',
    );

    const uncovered = resolveConfig({
      ...secureBase,
      CMS_ALLOWED_ORIGINS: cmsOrigin,
      CSRF_ALLOWED_ORIGINS: 'https://different.example',
    });
    expect(productionConfigProblems(uncovered)).toContain(
      'Every CMS_ALLOWED_ORIGINS entry must also appear in CSRF_ALLOWED_ORIGINS',
    );
  });

  it('accepts a complete production origin configuration', () => {
    const config = resolveConfig({
      ...secureBase,
      CMS_ALLOWED_ORIGINS: cmsOrigin,
      CSRF_ALLOWED_ORIGINS: cmsOrigin,
    });
    expect(productionConfigProblems(config)).toEqual([]);
  });

  it('allows only explicit direct, one-hop, or IP-range proxy trust settings', () => {
    for (const value of ['2', 'true', 'proxy.internal', '-1']) {
      const insecure = resolveConfig({
        ...secureBase,
        TRUST_PROXY: value,
        CMS_ALLOWED_ORIGINS: cmsOrigin,
        CSRF_ALLOWED_ORIGINS: cmsOrigin,
      });
      expect(productionConfigProblems(insecure)).toContain(
        'TRUST_PROXY must be 0, 1, or an explicit IP/CIDR allowlist in production',
      );
    }

    for (const value of ['0', '1', '10.20.0.0/16', '10.20.0.10,10.20.0.11']) {
      const secure = resolveConfig({
        ...secureBase,
        TRUST_PROXY: value,
        CMS_ALLOWED_ORIGINS: cmsOrigin,
        CSRF_ALLOWED_ORIGINS: cmsOrigin,
      });
      expect(productionConfigProblems(secure)).not.toContain(
        'TRUST_PROXY must be 0, 1, or an explicit IP/CIDR allowlist in production',
      );
    }
  });

  it('requires encrypted offsite backups, object storage, and a protected release trigger', () => {
    const incomplete = resolveConfig({
      ...secureBase,
      BACKUP_ENCRYPTION_KEY: '',
      BACKUP_STORAGE_PREFIX: '',
      MEDIA_STORAGE_DRIVER: 'local',
      MEDIA_PUBLIC_BASE_URL: '',
      S3_REGION: '',
      S3_BUCKET: '',
      PUBLIC_RELEASE_GITHUB_TOKEN: '',
      PUBLIC_RELEASE_API_BASE_URL: 'http://api.example.test',
    });

    expect(productionConfigProblems(incomplete)).toEqual(expect.arrayContaining([
      'BACKUP_ENCRYPTION_KEY must be at least 32 characters in production',
      'BACKUP_STORAGE_PREFIX is required for offsite production backups',
      'MEDIA_STORAGE_DRIVER must be s3 in production',
      'MEDIA_PUBLIC_BASE_URL must be an HTTPS origin in production',
      'S3_REGION is required in production',
      'S3_BUCKET is required in production',
      'PUBLIC_RELEASE_GITHUB_TOKEN must be configured securely in production',
      'PUBLIC_RELEASE_API_BASE_URL must be an HTTPS origin in production',
    ]));

    const unrecognizedToken = resolveConfig({
      ...secureBase,
      CMS_ALLOWED_ORIGINS: cmsOrigin,
      CSRF_ALLOWED_ORIGINS: cmsOrigin,
      PUBLIC_RELEASE_GITHUB_TOKEN: 'x'.repeat(80),
    });
    expect(productionConfigProblems(unrecognizedToken)).toContain(
      'PUBLIC_RELEASE_GITHUB_TOKEN must be a supported fine-grained, classic, or GitHub App token',
    );
  });
});
