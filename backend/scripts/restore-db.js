#!/usr/bin/env node
/**
 * Phase 11 — backup & DR: restore a pg_dump backup.
 *
 *   npm run db:restore -- backups/lakegroup-20260811-151500.dump
 *   npm run db:restore -- backups/<file> lakegroup_restore_test   ← DR drill
 *
 * DANGER: restoring into an existing database drops its contents
 * (--clean --if-exists). Point at a scratch database for drills.
 *
 * SECURITY (Phase 13 — command injection): spawn is used WITHOUT a shell
 * and every value (host/port/user/db/dump-file) is passed as a separate
 * argv element — never interpolated into a command string. The password
 * travels via the PGPASSWORD environment variable, never on the command
 * line. `parseRestoreCli` / `composeRestoreInvocation` are exported so the
 * arg construction is regression-tested (phase13-command-injection.test.js).
 */
import 'dotenv/config';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { decryptDump, isEncryptedDump } from './backup-db.js';

const PGBIN = process.env.PGBIN || 'C:/Program Files/PostgreSQL/18/bin';
const pgRestorePath = (pgBin) => path.join(pgBin, process.platform === 'win32' ? 'pg_restore.exe' : 'pg_restore');

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

function fsExists(p) {
  try { return fs.statSync(p).isFile(); } catch { return false; }
}

/**
 * Parse the CLI args into { dumpFile, target } — or null when the dump
 * file argument is missing/not a file (the caller prints usage). Pure
 * except for the existence check; `cwd` is injectable for tests.
 */
export function parseRestoreCli(argv, cwd = process.cwd()) {
  // Positionals only — option-looking args cannot shift the file/target
  // positions. Usage: <backup-file> [target-database].
  const positionals = argv.filter((a) => !a.startsWith('-'));
  const fileArg = positionals[0] || '';
  const dumpFile = fileArg ? path.resolve(cwd, fileArg) : '';
  if (!dumpFile || !fsExists(dumpFile)) return null;
  return { dumpFile, target: positionals[1] || null };
}

/**
 * Build the full pg_restore invocation: `command`, literal `args` array,
 * and the environment delta (PGPASSWORD only — never an argv element).
 * `target` defaults to the connection-string database when not given.
 * Pure and deterministic — no process/fs access.
 */
export function composeRestoreInvocation(databaseUrl, { dumpFile, target = null, pgBin = PGBIN } = {}) {
  const { host, port, db, user, password } = parseUrl(databaseUrl);
  const dbName = target || db;
  const args = ['--clean', '--if-exists', '--no-owner', '-h', host, '-p', port, '-U', user, '-d', dbName, dumpFile];
  return { command: pgRestorePath(pgBin), args, env: { PGPASSWORD: password }, target: dbName };
}

async function run() {
  const cli = parseRestoreCli(process.argv.slice(2));
  if (!cli) {
    console.error('Usage: npm run db:restore -- <backup-file> [target-database]');
    console.error('Example: npm run db:restore -- backups/lakegroup-20260811-151500.dump lakegroup_restore_test');
    process.exit(1);
  }
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }
  const { db } = parseUrl(databaseUrl);
  const { command, args, env, target } = composeRestoreInvocation(databaseUrl, cli);

  // SECURITY_ROADMAP Phase 20 — encrypted backups (BACKUP_ENCRYPTION_KEY
  // set at backup time) restore by streaming the decrypted dump to
  // pg_restore's stdin (`-` as the dump file) — no plaintext ever touches
  // disk. Auth-tag verification means a wrong key or corrupted dump aborts
  // before any SQL runs.
  const encrypted = isEncryptedDump(cli.dumpFile);
  let decrypt;
  if (encrypted) {
    const key = process.env.BACKUP_ENCRYPTION_KEY;
    if (!key) {
      console.error('This backup is encrypted — set BACKUP_ENCRYPTION_KEY to restore it.');
      process.exit(1);
    }
    decrypt = () => decryptDump(fs.readFileSync(cli.dumpFile), key);
    // pg_restore reads the dump from stdin only when the filename argument
    // is OMITTED (a literal '-' is treated as a file path). Drop the final
    // argument and pipe the decrypted bytes to stdin — no plaintext on disk.
    args.pop();
  }

  console.log(`pg_restore ${path.basename(cli.dumpFile)} → ${target} (${target === db ? 'MAIN DATABASE — will drop contents!' : 'scratch drill'})${encrypted ? ' [decrypting in-memory, streamed via stdin]' : ''}`);

  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: { ...process.env, ...env },
      // stdin is piped so an encrypted dump can be streamed in (no
      // plaintext on disk); stdout/stderr stay inherited.
      stdio: ['pipe', 'inherit', 'inherit'],
    });
    if (decrypt) {
      child.stdin.on('error', () => {});
      child.stdin.write(decrypt());
    }
    child.stdin.end();
    child.on('error', reject);
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`pg_restore exited ${code}`))));
  });
  console.log('Restore complete.');
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  run().catch((e) => {
    console.error('Restore failed:', e.message);
    process.exit(1);
  });
}
