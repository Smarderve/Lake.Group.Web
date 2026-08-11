// Helper for scripts/_verify_live_backend.js — prints AnalyticsEvent counts
// by type from the REAL database. Run from backend/ (reads .env).
import 'dotenv/config';
import pg from 'pg';

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const res = await client.query('SELECT type, count(*)::int AS n FROM "AnalyticsEvent" GROUP BY type');
  const out = {};
  for (const row of res.rows) out[row.type] = row.n;
  console.log(JSON.stringify(out));
} finally {
  await client.end();
}
