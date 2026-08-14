// Phase 22 DR drill — capture DB state (version, size, tables, row counts,
// migration state). Accepts an optional DATABASE_URL env override so the
// same script inspects both the live lakegroup DB and the scratch restore.
// One-off drill helper — run from the repo root: node scripts/_p22_state.mjs
import 'dotenv/config';
import { createDb } from '../src/db.js';

const db = createDb(process.env.DATABASE_URL);
if (!db) {
  console.error('DATABASE_URL not configured.');
  process.exit(1);
}

const rows = await db.$queryRawUnsafe(`
  SELECT current_database() AS db,
         current_setting('server_version') AS version,
         pg_size_pretty(pg_database_size(current_database())) AS size
`);
const info = rows[0];

const tables = await db.$queryRawUnsafe(`
  SELECT tablename FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY tablename
`);

const counts = {};
for (const t of tables) {
  const [c] = await db.$queryRawUnsafe(`SELECT count(*)::int AS n FROM "${t.tablename}"`);
  counts[t.tablename] = c.n;
}

const migrations = await db.$queryRawUnsafe(`
  SELECT count(*)::int AS applied, max(finished_at) AS last_applied
  FROM _prisma_migrations
`);

const out = {
  database: info.db,
  server_version: info.version,
  size: info.size,
  table_count: tables.length,
  row_counts: counts,
  prisma_migrations: {
    applied: migrations[0].applied,
    last_applied: migrations[0].last_applied,
  },
};
console.log(JSON.stringify(out, null, 2));
await db.$disconnect();
