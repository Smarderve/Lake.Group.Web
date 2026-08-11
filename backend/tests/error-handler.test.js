import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { makeApp } from './helpers.js';

describe('centralized error handling', () => {
  it('maps database-unreachable errors (P1001 / ECONNREFUSED) to 503 SERVICE_UNAVAILABLE', async () => {
    const db = {
      user: {
        findUnique: async () => {
          const err = new Error("Can't reach database server at `localhost:5432`");
          err.code = 'P1001';
          throw err;
        },
      },
      auditLog: { create: async () => {} },
      $queryRaw: async () => {},
    };
    const { app } = makeApp({ db });

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'admin@lakegroup.test', password: 'whatever' });
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('SERVICE_UNAVAILABLE');
    expect(res.body.error.message).toBe('Database unavailable');
  });

  it('never leaks stack traces for generic server errors (500 INTERNAL_ERROR)', async () => {
    const db = {
      user: {
        findUnique: async () => {
          throw new Error('secret internal detail: query 42 exploded');
        },
      },
      auditLog: { create: async () => {} },
      $queryRaw: async () => {},
    };
    const { app } = makeApp({ db });

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'admin@lakegroup.test', password: 'whatever' });
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
    expect(res.body.error.message).toBe('Internal server error');
    expect(JSON.stringify(res.body)).not.toContain('query 42 exploded');
  });
});
