import 'dotenv/config';
import pg from 'pg';
import connectPgSimple from 'connect-pg-simple';
import session from 'express-session';
import { PrismaClient } from '../generated/client.ts';
import { PrismaPg } from '@prisma/adapter-pg';
import { enableSessionRevocation } from './lib/sessions.js';

const { Pool } = pg;

// The Prisma client is generated as TypeScript (prisma-client generator,
// output to ../generated). Node >= 22.6 imports it directly via native
// type stripping — no build step is required.

/**
 * Creates a PrismaClient wired to PostgreSQL through the pg driver adapter.
 * Returns null when DATABASE_URL is not configured so the server can boot
 * and report the database as down instead of crashing.
 */
export function createDb(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl) return null;
  const adapter = new PrismaPg({ connectionString: databaseUrl });
  return new PrismaClient({ adapter });
}

/**
 * Lightweight liveness probe used by GET /health. Throws when the
 * database is unreachable or unconfigured.
 */
export async function pingDb(db) {
  if (!db) throw new Error('DATABASE_URL not configured');
  await db.$queryRaw`SELECT 1`;
}

/**
 * Creates a PostgreSQL-backed express-session store (connect-pg-simple)
 * using the same local database as Prisma. The store creates its own
 * `session` table at runtime; revocation helpers are attached so any
 * session of a user can be killed (Task 2.4). Returns null when there is
 * no DATABASE_URL so the server can still boot without auth.
 */
export function createSessionStore(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl) return null;
  const pool = new Pool({ connectionString: databaseUrl, max: 10 });
  const PgStore = connectPgSimple(session);
  const store = new PgStore({
    pool,
    tableName: 'session',
    // Phase 6 (SECURITY_ROADMAP): the runtime role has no DDL rights, so
    // the session table is migration-owned (0002+0010) instead of being
    // auto-created here.
    createTableIfMissing: false,
    pruneSessionInterval: 60,
  });
  return enableSessionRevocation(store, pool);
}
