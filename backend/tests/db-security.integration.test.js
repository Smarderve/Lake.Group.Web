import { describe, it, expect } from 'vitest';
import { createDb, createSessionStore } from '../src/db.js';
import { resolveConfig } from '../src/config.js';

// SECURITY_ROADMAP Phase 6 — PostgreSQL least privilege, verified against
// the REAL database. Skipped automatically when the runtime role is not
// configured (DATABASE_URL_RUNTIME missing/unreachable), so `npm test`
// still passes on machines without the split.

async function tryRuntimeDb() {
  if (!process.env.DATABASE_URL_RUNTIME) return null;
  const db = createDb(process.env.DATABASE_URL_RUNTIME);
  try {
    await Promise.race([
      db.$queryRaw`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error('connection timeout')), 3000)),
    ]);
    return db;
  } catch {
    await db.$disconnect().catch(() => {});
    return null;
  }
}

const runtimeDb = await tryRuntimeDb();

describe.skipIf(!runtimeDb)('SECURITY_ROADMAP Phase 6 — PostgreSQL least privilege (real DB)', () => {
  it('the runtime role is not a superuser and has no role/DB creation rights', async () => {
    const rows = await runtimeDb.$queryRaw`
      SELECT rolsuper, rolcreatedb, rolcreaterole
      FROM pg_roles WHERE rolname = current_user`;
    expect(rows.length).toBe(1);
    expect(rows[0].rolsuper).toBe(false);
    expect(rows[0].rolcreatedb).toBe(false);
    expect(rows[0].rolcreaterole).toBe(false);
  });

  it('the runtime role can run DML (insert + delete) on an existing table', async () => {
    // Exercise real DML through the Prisma adapter as lake_app.
    const created = await runtimeDb.analyticsEvent.create({
      data: { type: 'PAGE_VIEW', page: '/phase6-probe.html' },
    });
    expect(created.id).toBeTruthy();
    await runtimeDb.analyticsEvent.delete({ where: { id: created.id } });
    const gone = await runtimeDb.analyticsEvent.findUnique({ where: { id: created.id } });
    expect(gone).toBeNull();
  });

  it('the runtime role cannot run DDL (CREATE TABLE is denied)', async () => {
    let threw = null;
    try {
      await runtimeDb.$executeRaw`CREATE TABLE _ddl_probe_phase6 (id int)`;
    } catch (err) {
      threw = err;
    }
    expect(threw).toBeTruthy();
    expect(String(threw.message)).toMatch(/permission denied|insufficient privilege/i);
  });

  it('the session store initializes without DDL (migration-owned table)', async () => {
    // Boot risk: connect-pg-simple must not attempt CREATE TABLE. With
    // createTableIfMissing:false + migration 0010 this constructs cleanly
    // under the least-privilege role.
    const store = createSessionStore(process.env.DATABASE_URL_RUNTIME);
    expect(store).toBeTruthy();
    await new Promise((resolve, reject) => {
      store.set('phase6-probe-sid', { userId: 'probe', cookie: {} }, (err) => (err ? reject(err) : resolve()));
    });
    await new Promise((resolve, reject) => {
      store.get('phase6-probe-sid', (err, sess) => {
        if (err) return reject(err);
        expect(sess.userId).toBe('probe');
        resolve();
      });
    });
    await new Promise((resolve, reject) => {
      store.destroy('phase6-probe-sid', (err) => (err ? reject(err) : resolve()));
    });
  });

  it('PostgreSQL listens on localhost only (not the public interface)', async () => {
    const rows = await runtimeDb.$queryRaw`
      SELECT setting FROM pg_settings WHERE name = 'listen_addresses'`;
    expect(rows.length).toBe(1);
    expect(String(rows[0].setting)).toBe('127.0.0.1');
  });
});

describe('SECURITY_ROADMAP Phase 6 — runtime URL configuration (unit)', () => {
  it('DATABASE_URL_RUNTIME wins when set; otherwise falls back to DATABASE_URL', () => {
    const split = resolveConfig({ DATABASE_URL: 'owner-url', DATABASE_URL_RUNTIME: 'app-url' });
    expect(split.databaseUrlRuntime).toBe('app-url');
    expect(split.databaseUrl).toBe('owner-url');

    const noSplit = resolveConfig({ DATABASE_URL: 'owner-url' });
    expect(noSplit.databaseUrlRuntime).toBe('owner-url');
  });
});
