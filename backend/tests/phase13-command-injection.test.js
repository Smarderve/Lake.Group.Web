import { describe, it, expect, vi } from 'vitest';
import { readdirSync, readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

// SECURITY_ROADMAP Phase 13 — Command Injection.
//
// Audit: the process-execution surface is limited to reviewed scripts — the
// backup/restore CLIs (scripts/backup-db.js, scripts/restore-db.js) and,
// since Phase 21, the audit gate (scripts/audit-gate.js, which runs
// `npm audit --json` via the current node binary on npm-cli.js). All use
// child_process `spawn` WITHOUT a shell, every value is a separate literal
// argv element (never interpolated into a command string), and secrets
// travel via environment variables — never on the command line. These
// tests regression-lock that: a static tripwire keeps `exec` / shell-enabled
// spawns / eval out of the codebase, and behavioral tests prove hostile
// URL/database/filename input stays inside single argv elements at their
// fixed positions.

vi.mock('node:child_process', () => ({ spawn: vi.fn() }));

import { spawn } from 'node:child_process';
import { composeBackupInvocation, parseUrl } from '../scripts/backup-db.js';
import { parseRestoreCli, composeRestoreInvocation } from '../scripts/restore-db.js';

const SRC_DIR = fileURLToPath(new URL('../src', import.meta.url));
const SCRIPTS_DIR = fileURLToPath(new URL('../scripts', import.meta.url));

function allJsFiles(dir) {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.js'))
    .map((f) => `${dir}/${f}`);
}

const FORBIDDEN = [
  ['execSync / spawnSync', /\b(execSync|spawnSync)\s*\(/],
  ['shell:true spawn option', /\bshell\s*:\s*true\b/],
  ['child_process.exec / execFile', /\bchild_process\.(exec|execFile)\b/],
  ['eval(', /\beval\s*\(/],
  ['new Function', /\bnew\s+Function\b/],
];

describe('SECURITY_ROADMAP Phase 13 — command injection', () => {
  it('static tripwire: no shell-execution primitives anywhere in src/ or scripts/', () => {
    const files = [...allJsFiles(SRC_DIR), ...allJsFiles(SCRIPTS_DIR)];
    expect(files.length).toBeGreaterThan(10);
    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      for (const [label, re] of FORBIDDEN) {
        expect(src.match(re), `${file} contains ${label}`).toBeNull();
      }
    }
  });

  it('static tripwire: spawn() call sites live ONLY in the reviewed scripts (backup/restore + the Phase 21 audit gate)', () => {
    const files = [...allJsFiles(SRC_DIR), ...allJsFiles(SCRIPTS_DIR)];
    const withSpawn = files.filter((f) => /\bspawn\s*\(/.test(readFileSync(f, 'utf8')));
    // REVIEWED ALLOWLIST (Phase 21): audit-gate.js runs `npm audit --json`
    // via the CURRENT node binary on npm-cli.js — spawn WITHOUT a shell,
    // literal argv ['audit','--json'] (no user input reaches the command
    // line), exactly the backup/restore guarantee. Adding a NEW spawn site
    // here requires the same properties + a review note.
    expect(withSpawn.sort()).toEqual([
      `${SCRIPTS_DIR}/audit-gate.js`,
      `${SCRIPTS_DIR}/backup-db.js`,
      `${SCRIPTS_DIR}/restore-db.js`,
    ]);
  });

  it('backup: hostile connection-string values stay single argv elements at fixed positions', () => {
    // Username "admin;rm -rf /", db "db;drop" — all shell-hostile content.
    const url = 'postgresql://admin%3Brm%20-rf%20%2F:p%40ss%3Bcat@pwned.example:5433/db%3Bdrop';
    const { args, env } = composeBackupInvocation(url, { outFile: 'C:/backups/x.dump' });

    // Fixed positional shape: -Fc -h <host> -p <port> -U <user> -d <db> -f <file>
    expect(args[0]).toBe('-Fc');
    expect(args[args.indexOf('-h') + 1]).toBe('pwned.example');
    expect(args[args.indexOf('-p') + 1]).toBe('5433');
    expect(args[args.indexOf('-U') + 1]).toBe('admin;rm -rf /');
    expect(args[args.indexOf('-d') + 1]).toBe('db;drop');
    expect(args[args.indexOf('-f') + 1]).toBe('C:/backups/x.dump');
    expect(args.every((a) => typeof a === 'string')).toBe(true);

    // The password is the same hostile character class and must appear
    // ONLY in the environment — never on the command line.
    expect(args.some((a) => a.includes('p@ss;cat'))).toBe(false);
    expect(env.PGPASSWORD).toBe('p@ss;cat');
  });

  it('backup: URL decoding is the only transformation — no shell expansion occurs', () => {
    expect(parseUrl('postgresql://u%3Bevil:pw@10.0.0.9/db%3Bx')).toMatchObject({
      host: '10.0.0.9',
      port: '5432',
      user: 'u;evil',
      db: 'db;x',
    });
    const { command, env } = composeBackupInvocation('postgresql://u:pw@10.0.0.9/lakegroup', {
      outFile: 'C:/backups/x.dump',
    });
    expect(command.endsWith('pg_dump.exe') || command.endsWith('pg_dump')).toBe(true);
    expect(env).toEqual({ PGPASSWORD: 'pw' });
  });

  it('restore: hostile dump filename and target database stay single argv elements', () => {
    const { args, env, target } = composeRestoreInvocation('postgresql://user:secret@localhost:5432/lakegroup', {
      dumpFile: 'C:/backups/evil; rm -rf / .dump',
      target: 'db;drop',
    });
    expect(target).toBe('db;drop');
    expect(args[args.indexOf('-d') + 1]).toBe('db;drop');
    expect(args[args.length - 1]).toBe('C:/backups/evil; rm -rf / .dump');
    expect(args.every((a) => typeof a === 'string')).toBe(true);
    expect(args.some((a) => a.includes('secret'))).toBe(false);
    expect(env.PGPASSWORD).toBe('secret');
  });

  it('restore: target defaults to the connection-string database', () => {
    const { target } = composeRestoreInvocation('postgresql://u:p@h/lakegroup', {
      dumpFile: 'C:/backups/x.dump',
    });
    expect(target).toBe('lakegroup');
  });

  it('restore CLI: option-looking args cannot shift parsing; missing file → usage path', () => {
    const dir = mkdtempSync(join(tmpdir(), 'p13-'));
    writeFileSync(join(dir, 'x.dump'), 'dummy');
    try {
      const cli = parseRestoreCli(['--clean', 'x.dump', 'drill'], dir);
      expect(cli).not.toBeNull();
      expect(cli.dumpFile).toBe(join(dir, 'x.dump'));
      expect(cli.target).toBe('drill');
      expect(parseRestoreCli(['--clean', '--if-exists'], dir)).toBeNull();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('importing the CLI modules is side-effect free (no spawn at import time)', () => {
    expect(spawn).not.toHaveBeenCalled();
  });
});
