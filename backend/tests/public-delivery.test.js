import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { makeApp } from './helpers.js';

describe('published snapshot source contract', () => {
  it('lists every published metric and excludes working copies', async () => {
    const { app, db } = makeApp();
    await db.metric.create({
      data: {
        key: 'employees.total',
        label: 'Employees',
        value: '1,200+',
        source: 'Audited report',
        verificationStatus: 'VERIFIED',
        status: 'PUBLISHED',
      },
    });
    await db.metric.create({
      data: {
        key: 'private.draft',
        label: 'Draft fact',
        value: '999',
        source: 'Working paper',
        verificationStatus: 'UNVERIFIED',
        status: 'DRAFT',
      },
    });

    const response = await request(app).get('/api/public/metrics');

    expect(response.status).toBe(200);
    expect(response.body.metrics).toHaveLength(1);
    expect(response.body.metrics[0]).toMatchObject({
      key: 'employees.total',
      value: '1,200+',
    });
    expect(response.body.metrics[0]).not.toHaveProperty('status');
  });
});
