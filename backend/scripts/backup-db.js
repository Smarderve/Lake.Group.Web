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
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { config } from '../src/config.js';
import { createObjectStorage } from '../src/lib/object-storage.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKUP_DIR = path.join(__dirname, '..', 'backups');
const PGBIN = process.env.PGBIN || 'C:/Program Files/PostgreSQL/18/bin';
const pgDumpPath = (pgBin) => path.join(pgBin, process.platform === 'win32' ? 'pg_dump.exe' : 'pg_dump');

// SECURITY_ROADMAP Phase 20 — optional AES-256-GCM envelope for backup
// storage. Enabled by setting BACKUP_ENCRYPTION_KEY (any passphrase; the
// 256-bit key is derived via SHA-256). Without a key, dumps stay plaintext
// and a warning is printed so the operator makes the choice deliberately.
// Format: [12-byte IV][16-byte GCM auth tag][ciphertext]. Pure helpers are
// exported for the regression suite.
const IV_LEN = 12;
const TAG_LEN = 16;

export function deriveKey(passphrase) {
  return crypto.createHash('sha256').update(passphrase).digest(); // 32 bytes
}

export function encryptDump(plaintext, passphrase) {
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv('aes-256-gcm', deriveKey(passphrase), iv);
  const body = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]);
}

export function decryptDump(blob, passphrase) {
  if (blob.length < IV_LEN + TAG_LEN) throw new Error('encrypted dump is truncated');
  const iv = blob.subarray(0, IV_LEN);
  const tag = blob.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const body = blob.subarray(IV_LEN + TAG_LEN);
  const decipher = crypto.createDecipheriv('aes-256-gcm', deriveKey(passphrase), iv);
  decipher.setAuthTag(tag);
  try {
    return Buffer.concat([decipher.update(body), decipher.final()]);
  } catch {
    // GCM authentication failure — wrong key or tampered blob.
    throw new Error('decryption failed: wrong BACKUP_ENCRYPTION_KEY or corrupted dump');
  }
}

export function isEncryptedDump(filePath) {
  return filePath.toLowerCase().endsWith('.dump.enc');
}

// SECURITY_ROADMAP Phase 20 — retention policy. After a successful backup,
// dumps older than BACKUP_RETENTION_DAYS (default 14, 0 = keep everything)
// are pruned. Pure: given the backup dir entries and a cutoff, return the
// absolute paths to delete — no fs access (testable).
export function selectExpiredDumps(entries, retentionDays, now = Date.now()) {
  if (!retentionDays || retentionDays <= 0) return [];
  const cutoff = now - retentionDays * 24 * 60 * 60 * 1000;
  return entries
    .filter((e) => /^lakegroup-\d+\.dump(\.enc)?$/.test(e.name))
    .filter((e) => e.mtime.getTime() < cutoff)
    .map((e) => e.path);
}

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

export async function storeOffsiteBackup(storage, filePath, prefix) {
  const normalizedPrefix = prefix.replace(/^\/+|\/+$/g, '');
  const key = `${normalizedPrefix}/${path.basename(filePath)}`;
  return storage.put({
    key,
    body: fs.readFileSync(filePath),
    contentType: 'application/octet-stream',
    cacheControl: 'private, no-store',
  });
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

  // Phase 20 — optional encryption-at-rest. Encrypt the completed dump and
  // remove the plaintext so a stolen backup file yields nothing.
  const encKey = process.env.BACKUP_ENCRYPTION_KEY;
  let finalFile = outFile;
  if (encKey) {
    const blob = encryptDump(fs.readFileSync(outFile), encKey);
    const encFile = `${outFile}.enc`;
    fs.writeFileSync(encFile, blob);
    fs.unlinkSync(outFile);
    finalFile = encFile;
  } else {
    console.warn('BACKUP_ENCRYPTION_KEY is not set — backup stored UNENCRYPTED. Set it to enable AES-256-GCM at rest.');
  }

  if (process.env.BACKUP_STORAGE_PREFIX) {
    const stored = await storeOffsiteBackup(
      createObjectStorage(config),
      finalFile,
      process.env.BACKUP_STORAGE_PREFIX,
    );
    console.log(`Offsite backup complete: ${stored.key}`);
  } else {
    console.warn('BACKUP_STORAGE_PREFIX is not set — no offsite backup copy was written.');
  }

  // Phase 20 — retention. Prune dumps older than BACKUP_RETENTION_DAYS.
  const retentionDays = process.env.BACKUP_RETENTION_DAYS === undefined
    ? 14
    : Number(process.env.BACKUP_RETENTION_DAYS);
  if (!Number.isFinite(retentionDays) || retentionDays < 0) {
    throw new Error('BACKUP_RETENTION_DAYS must be a non-negative number');
  }
  const expired = selectExpiredDumps(
    fs.readdirSync(BACKUP_DIR, { withFileTypes: true }).map((d) => ({
      name: d.name,
      path: path.join(BACKUP_DIR, d.name),
      mtime: fs.statSync(path.join(BACKUP_DIR, d.name)).mtime,
    })),
    retentionDays,
  );
  for (const p of expired) fs.unlinkSync(p);
  if (expired.length) console.log(`Retention: pruned ${expired.length} backup(s) older than ${retentionDays} day(s).`);

  const size = (fs.statSync(finalFile).size / 1024 / 1024).toFixed(2);
  console.log(`Backup complete: ${finalFile} (${size} MB${encKey ? ', AES-256-GCM encrypted' : ', unencrypted'})`);
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  run().catch((e) => {
    console.error('Backup failed:', e.message);
    process.exit(1);
  });
}
