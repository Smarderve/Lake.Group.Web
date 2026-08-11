import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createLogger } from '../src/logger.js';

const silentLogger = createLogger('silent');

describe('POST /example/echo (Zod validation pattern demo)', () => {
  it('rejects an invalid payload with 400 and field details', async () => {
    const app = createApp({ logger: silentLogger, db: null });
    const res = await request(app)
      .post('/example/echo')
      .send({ name: 'A', email: 'not-an-email' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(res.body.error.details)).toBe(true);
    const paths = res.body.error.details.map((d) => d.path).sort();
    expect(paths).toEqual(['email', 'name']);
  });

  it('accepts a valid payload and echoes it back', async () => {
    const app = createApp({ logger: silentLogger, db: null });
    const res = await request(app)
      .post('/example/echo')
      .send({ name: 'Lake Group', email: 'admin@lakeoilgroup.com', age: 30 });

    expect(res.status).toBe(200);
    expect(res.body.received).toEqual({
      name: 'Lake Group',
      email: 'admin@lakeoilgroup.com',
      age: 30,
    });
  });
});
