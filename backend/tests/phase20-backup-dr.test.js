// SECURITY_ROADMAP Phase 20 — Backup & Disaster Recovery.
// Regression guards for the backup/restore pipeline:
//   - optional AES-256-GCM encryption envelope (encrypt → decrypt round trip,
//     auth-tag tamper detection, wrong-key rejection, truncation rejection)
//   - retention policy selection (expired dumps pruned, fresh kept, 0 = keep all)
//   - encrypted-dump detection + restore invocation shape (streamed via stdin;
//     the pure invocation builder stays unchanged so phase13's argv guards hold)
// The full live drill (backup → encrypted restore into a scratch DB → row-count
// verification) runs against real Postgres, outside the unit suite.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  deriveKey,
  encryptDump,
  decryptDump,
  isEncryptedDump,
  selectExpiredDumps,
} from '../scripts/backup-db.js';
import { composeRestoreInvocation } from '../scripts/restore-db.js';

const KEY = 'phase20-test-passphrase-2fa8c1';

describe('Phase 20 — backup encryption envelope', () => {
  it('round-trips: decrypt(encrypt(data)) === data with a stable 256-bit key', () => {
    const plaintext = Buffer.from(JSON.stringify({ hello: 'lakegroup', n: 42 }));
    const blob = encryptDump(plaintext, KEY);
    // AES-256-GCM: 12-byte IV + 16-byte tag + ciphertext
    expect(blob.length).toBe(plaintext.length + 28);
    expect(deriveKey(KEY).length).toBe(32);
    expect(deriveKey(KEY).equals(deriveKey(KEY))).toBe(true);
    expect(decryptDump(blob, KEY).equals(plaintext)).toBe(true);
  });

  it('rejects a tampered blob (auth tag mismatch) — never returns garbage', () => {
    const plaintext = Buffer.from('sensitive rows');
    const blob = encryptDump(plaintext, KEY);
    const tampered = Buffer.from(blob);
    tampered[blob.length - 1] ^= 0xff; // flip a ciphertext byte
    expect(() => decryptDump(tampered, KEY)).toThrow(/wrong BACKUP_ENCRYPTION_KEY|corrupted/);
  });

  it('rejects the wrong key', () => {
    const blob = encryptDump(Buffer.from('rows'), KEY);
    expect(() => decryptDump(blob, 'a-different-passphrase')).toThrow(/wrong BACKUP_ENCRYPTION_KEY|corrupted/);
  });

  it('rejects a truncated blob', () => {
    const blob = encryptDump(Buffer.from('rows'), KEY);
    expect(() => decryptDump(blob.subarray(0, 10), KEY)).toThrow(/truncated/);
  });

  it('detects encrypted dumps by suffix', () => {
    expect(isEncryptedDump('C:/backups/lakegroup-20260812.dump.enc')).toBe(true);
    expect(isEncryptedDump('C:/backups/lakegroup-20260812.dump')).toBe(false);
    expect(isEncryptedDump('C:/backups/other.enc')).toBe(false); // not a lakegroup dump
  });
});

describe('Phase 20 — retention policy', () => {
  const day = 24 * 60 * 60 * 1000;
  const now = Date.UTC(2026, 7, 12, 12, 0, 0);
  const entry = (name, ageDays) => ({
    name,
    path: path.join('C:/backups', name),
    mtime: new Date(now - ageDays * day),
  });

  it('prunes dumps older than the retention window, keeps fresh and non-dump files', () => {
    const entries = [
      entry('lakegroup-20260725120000.dump', 18), // expired (18d > 14d)
      entry('lakegroup-20260801120000.dump.enc', 11), // fresh, encrypted form kept
      entry('lakegroup-20260810090000.dump', 2), // fresh
      entry('notes.txt', 30), // not a dump — untouched
      entry('lakegroup-junk.dump', 30), // name pattern mismatch — untouched
    ];
    const expired = selectExpiredDumps(entries, 14, now);
    expect(expired).toHaveLength(1);
    expect(expired[0]).toBe(path.join('C:/backups', 'lakegroup-20260725120000.dump'));
  });

  it('keeps everything when retention is 0 (or unset)', () => {
    const entries = [entry('lakegroup-20260101000000.dump', 200)];
    expect(selectExpiredDumps(entries, 0, now)).toEqual([]);
    expect(selectExpiredDumps(entries, undefined, now)).toEqual([]);
  });
});

describe('Phase 20 — restore invocation for encrypted dumps', () => {
  it('plain dump: file stays the last argv element (phase13 guards unchanged)', () => {
    const { args } = composeRestoreInvocation('postgresql://u:pw@localhost:5432/lakegroup', {
      dumpFile: 'C:/backups/lakegroup-20260812.dump',
    });
    expect(args[args.length - 1]).toBe('C:/backups/lakegroup-20260812.dump');
  });

  it('encrypted dump is detected and the real pipeline streams via stdin', () => {
    // The unit boundary: isEncryptedDump decides the decrypt path; the live
    // drill proves the end-to-end streamed restore into a scratch database.
    const dumpFile = 'C:/backups/lakegroup-20260812.dump.enc';
    expect(isEncryptedDump(dumpFile)).toBe(true);
    const { args } = composeRestoreInvocation('postgresql://u:pw@localhost:5432/lakegroup', { dumpFile });
    // run() replaces the last element with '-' when encrypted — assert the
    // builder still hands back the real path so the swap is the only change.
    expect(args[args.length - 1]).toBe(dumpFile);
  });

  it('encrypts a real file on disk and decrypts it back byte-for-byte', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p20-'));
    const file = path.join(dir, 'lakegroup-20260812.dump');
    const original = Buffer.from('PGDMP fake dump content '.repeat(100));
    fs.writeFileSync(file, original);
    fs.writeFileSync(`${file}.enc`, encryptDump(fs.readFileSync(file), KEY));
    const restored = decryptDump(fs.readFileSync(`${file}.enc`), KEY);
    expect(restored.equals(original)).toBe(true);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
