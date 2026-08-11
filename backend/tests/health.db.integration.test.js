import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createDb, pingDb } from '../src/db.js';
import { createApp } from '../src/app.js';
import { createLogger } from '../src/logger.js';

// Integration test against the REAL configured PostgreSQL.
// Skipped automatically when DATABASE_URL is missing or the database is
// unreachable, so `npm test` still passes on machines without a database
// (e.g. this dev machine). On the company server with Postgres running,
// this test exercises the real path.

async function tryConnect() {
  if (!process.env.DATABASE_URL) return null;
  const db = createDb(process.env.DATABASE_URL);
  try {
    await Promise.race([
      pingDb(db),
      new Promise((_, reject) => setTimeout(() => reject(new Error('connection timeout')), 3000)),
    ]);
    return db;
  } catch {
    await db.$disconnect().catch(() => {});
    return null;
  }
}

const db = await tryConnect();
const silentLogger = createLogger('silent');

describe.skipIf(!db)('GET /health — real database integration', () => {
  it('reports db up against the configured PostgreSQL', async () => {
    const app = createApp({ logger: silentLogger, db });
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.db).toBe('up');
  });
});
