import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { makeApp } from './helpers.js';

describe('CMS V2 deployment export', () => {
  const token = 'deployment-token-with-at-least-forty-characters-123';
  it('requires its bearer credential and returns the verified service bundle', async () => {
    const bundle = { pointer: { schemaVersion: 2, releaseId: 'release-a' }, snapshot: { schemaVersion: 1, releaseId: 'release-a', documents: {} } };
    const { app } = makeApp({ options: { cmsV2Service: { readDeploymentBundle: async () => bundle }, cmsV2DeploymentToken: token } });
    expect((await request(app).get('/api/cms-v2-release')).status).toBe(401);
    const response = await request(app).get('/api/cms-v2-release').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200); expect(response.body).toEqual(bundle); expect(response.headers['cache-control']).toContain('no-store');
  });

  it('returns a controlled 404 before the first CMS V2 release', async () => {
    const error = Object.assign(new Error('missing'), { code: 'ENOENT' });
    const { app } = makeApp({ options: { cmsV2Service: { readDeploymentBundle: async () => { throw error; } }, cmsV2DeploymentToken: token } });
    const response = await request(app).get('/api/cms-v2-release').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(404); expect(response.body.error.code).toBe('CMS_V2_RELEASE_NOT_FOUND');
  });
});
