import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createLogger } from '../src/logger.js';

const silentLogger = createLogger('silent');
const dbUp = { $queryRaw: async () => {} };
const dbDown = {
  $queryRaw: async () => {
    throw new Error('connection refused');
  },
};

describe('GET /health', () => {
  it('returns 200 and reports db up when the database is reachable', async () => {
    const app = createApp({ logger: silentLogger, db: dbUp });
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.db).toBe('up');
    expect(res.body.service).toBe('lake-group-backend');
    expect(typeof res.body.timestamp).toBe('string');
  });

  it('returns 503 with a clear error when the database is unreachable', async () => {
    const app = createApp({ logger: silentLogger, db: dbDown });
    const res = await request(app).get('/health');

    expect(res.status).toBe(503);
    expect(res.body.status).toBe('degraded');
    expect(res.body.db).toBe('down');
    expect(res.body.error).toBe('database unreachable');
  });

  it('returns 503 with a clear error when DATABASE_URL is not configured', async () => {
    const app = createApp({ logger: silentLogger, db: null });
    const res = await request(app).get('/health');

    expect(res.status).toBe(503);
    expect(res.body.db).toBe('down');
    expect(res.body.error).toContain('DATABASE_URL');
  });
});
