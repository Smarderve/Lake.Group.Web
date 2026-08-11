#!/usr/bin/env node
/**
 * Phase 11 — backup & DR: pg_dump the database to backups/.
 *
 *   npm run db:backup              → backups/lakegroup-YYYYMMDD-HHMMSS.dump
 *   PGBIN="..." npm run db:backup  → custom PostgreSQL bin directory
 *
 * Produces a custom-format (-Fc) dump with blobs, restorable with
 * `npm run db:restore -- backups/<file>` or pg_restore directly.
 *
 * SECURITY (Phase 13 — command injection): spawn is used WITHOUT a shell
 * and every value (host/port/user/db/file) is passed as a separate argv
 * element — never interpolated into a command string. The password travels
 * via the PGPASSWORD environment variable, never on the command line.
 * `composeBackupInvocation` is exported so the arg construction is
 * regression-tested (phase13-command-injection.test.js).
 */
import 'dotenv/config';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKUP_DIR = path.join(__dirname, '..', 'backups');
const PGBIN = process.env.PGBIN || 'C:/Program Files/PostgreSQL/18/bin';
const pgDumpPath = (pgBin) => path.join(pgBin, process.platform === 'win32' ? 'pg_dump.exe' : 'pg_dump');

export function parseUrl(url) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: u.port || '5432',
    // Node's URL parser does NOT decode the pathname (unlike username/
    // password) — decode it the same way so the db name matches what
    // Prisma/Postgres see. All values stay single argv elements.
    db: decodeURIComponent(u.pathname.replace(/^\//, '')),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
  };
}

/**
 * Build the full pg_dump invocation: `command`, literal `args` array, and
 * the environment delta (PGPASSWORD only — never an argv element).
 * Pure and deterministic — no process/fs access.
 */
export function composeBackupInvocation(databaseUrl, { outFile, pgBin = PGBIN } = {}) {
  const { host, port, db, user, password } = parseUrl(databaseUrl);
  const args = ['-Fc', '-h', host, '-p', port, '-U', user, '-d', db, '-f', outFile];
  return { command: pgDumpPath(pgBin), args, env: { PGPASSWORD: password } };
}

async function run() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is not set — copy .env.example to .env first.');
    process.exit(1);
  }
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const outFile = path.join(BACKUP_DIR, `lakegroup-${stamp}.dump`);

  const { command, args, env } = composeBackupInvocation(databaseUrl, { outFile });
  console.log(`pg_dump ${args[args.indexOf('-d') + 1]} → ${outFile}`);

  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: { ...process.env, ...env },
      stdio: ['ignore', 'inherit', 'inherit'],
    });
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`pg_dump exited ${code}`))));
  });

  const size = (fs.statSync(outFile).size / 1024 / 1024).toFixed(2);
  console.log(`Backup complete: ${outFile} (${size} MB)`);
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  run().catch((e) => {
    console.error('Backup failed:', e.message);
    process.exit(1);
  });
}
