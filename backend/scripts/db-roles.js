#!/usr/bin/env node
/**
 * SECURITY_ROADMAP Phase 6 — provision the least-privilege PostgreSQL
 * runtime role (lake_app) and lock down the public schema.
 *
 * Needs superuser access to the cluster. Credentials (first match wins):
 *   1. --super-url <postgresql://...> flag
 *   2. PG_SUPER_URL env var
 *   3. derived from DATABASE_URL: user swapped to `postgres`, password from
 *      PG_SUPER_PASSWORD env var (or the prompt-free --super-password flag)
 *
 * The app password (first match wins):
 *   1. --password <pw> flag
 *   2. LAKE_APP_PASSWORD env var
 *   3. generated, printed once (like create-user.js)
 *
 * Idempotent — safe to re-run. After this, point DATABASE_URL_RUNTIME at
 * lake_app in .env; keep DATABASE_URL on the migration owner.
 */
import 'dotenv/config';
import pg from 'pg';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { createDb } from '../src/db.js';

const { Pool } = pg;

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (['--super-url', '--super-password', '--password'].includes(key)) {
      args[key.slice(2)] = argv[i + 1];
      i += 1;
    } else if (key === '--help' || key === '-h') {
      args.help = true;
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  console.log(`
Provision the least-privilege runtime DB role (lake_app) + schema lockdown.

  node scripts/db-roles.js [--super-url <url>] [--password <app-pw>]

  --super-url       superuser connection (else PG_SUPER_URL, else DATABASE_URL
                    with user→postgres + PG_SUPER_PASSWORD)
  --password        lake_app password (else LAKE_APP_PASSWORD, else generated)
`);
  process.exit(0);
}

// Resolve the superuser connection.
let superUrl = args['super-url'] || process.env.PG_SUPER_URL;
if (!superUrl) {
  const base = process.env.DATABASE_URL;
  if (!base) {
    console.error('DATABASE_URL is required (or pass --super-url).');
    process.exit(1);
  }
  const u = new URL(base);
  u.username = 'postgres';
  u.password = args['super-password'] || process.env.PG_SUPER_PASSWORD || '';
  if (!u.password) {
    console.error('PG_SUPER_PASSWORD (or --super-password) is required to connect as postgres.');
    process.exit(1);
  }
  superUrl = u.toString();
}

// Resolve the app password.
const appPassword = args.password || process.env.LAKE_APP_PASSWORD || crypto.randomBytes(12).toString('base64url');

const sqlPath = fileURLToPath(new URL('./db-roles.sql', import.meta.url));
let sql = readFileSync(sqlPath, 'utf8');
// Safe interpolation: the password is a single quoted literal produced by
// psql-style substitution. Escape single quotes (random base64url never
// contains them, but a CLI-supplied password might).
sql = sql.replaceAll(":'app_password'", `'${appPassword.replaceAll("'", "''")}'`);

const pool = new Pool({ connectionString: superUrl });
try {
  await pool.query(sql);
  console.log('lake_app role ready (DML-only, no DDL, no superuser).');
  console.log('Public schema: CREATE revoked from PUBLIC.');
  if (!args.password && !process.env.LAKE_APP_PASSWORD) {
    console.log(`Generated lake_app password (shown once): ${appPassword}`);
    console.log('Set it in .env as DATABASE_URL_RUNTIME (keep DATABASE_URL on lake_user for migrations).');
  } else {
    console.log('lake_app password: provided via --password / LAKE_APP_PASSWORD.');
  }
} finally {
  await pool.end();
}

// Validate the runtime role can actually reach the database (DML path).
if (process.env.DATABASE_URL_RUNTIME) {
  const db = createDb(process.env.DATABASE_URL_RUNTIME);
  if (db) {
    try {
      await db.$queryRaw`SELECT 1`;
      console.log('Runtime connection (DATABASE_URL_RUNTIME) verified: SELECT 1 ok.');
    } catch (err) {
      console.error('Runtime connection check failed:', err.message);
    } finally {
      await db.$disconnect().catch(() => {});
    }
  }
}
