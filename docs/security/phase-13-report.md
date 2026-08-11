# SECURITY_ROADMAP Phase 13 — Command Injection

**Date:** 2026-08-11 · **Status:** ✅ COMPLETE

## Audit

Every process-execution path in the repository was inventoried:

- `child_process` usage exists in exactly two places:
  `backend/scripts/backup-db.js` and `backend/scripts/restore-db.js` — both
  use **`spawn` with the default `shell: false`** (verified by scan), and
  both pass every value (host, port, user, database, dump file) as a
  **separate literal argv element** — never a command string.
- The password is delivered via the `PGPASSWORD` environment variable,
  **never on the command line**.
- No `exec` / `execSync` / `spawnSync`, no `shell: true`, no `eval(`, no
  `new Function` anywhere in `src/` or `scripts/` (the one `.exec(` hit is
  a regex in `seed-content.js` — not process execution).
- No `.sh` scripts; `package.json` scripts are fixed literals (the only
  `&&` is `seed:all` with two static commands — no env interpolation).

## Implemented

Two latent issues found and fixed during the audit (both in the shared
`parseUrl` of the backup/restore CLIs):

1. **Undecoded database name** — Node's `URL` parser decodes username and
   password but returns the **pathname raw**, so `postgresql://u:p@h/db%3Bx`
   produced a `-d db%3Bx` argument (the literal encoded string) instead of
   `db;x`. Safe (still one argv element), but inconsistent with what
   Prisma/Postgres see; `parseUrl` now `decodeURIComponent`s the pathname.
2. **Option-shifted restore target** — `db:restore -- <file> [target]`
   read the target by raw index, so a leading option (never used by the
   script itself, which hardcodes its flags) would misparse. Positional
   extraction now filters option-looking args first.

Also: `backend/backups/` added to `.gitignore` — full DB dumps must never
be committable (a real 0.29 MB dump was produced during live verification;
it stays on disk as a working backup, invisible to git).

Regression guards (`backend/tests/phase13-command-injection.test.js`, 8):

- **Static tripwires** — `execSync`/`spawnSync`, `shell: true`,
  `child_process.exec`, `eval(`, `new Function` forbidden anywhere in
  `src/` + `scripts/`; `spawn(` call sites allowed ONLY in the two
  backup/restore scripts (a new execution surface fails the test).
- **Behavioral** — hostile connection strings (username `admin;rm -rf /`,
  database `db;drop`, password `p@ss;cat`) stay single argv elements at
  their fixed positions; the password appears only in `env.PGPASSWORD`,
  never in argv; restore filename/target with shell metacharacters stay
  literal elements; the CLI modules import with zero side effects
  (no spawn at import).

## Live verification (real Postgres)

- `npm run db:backup` — real `pg_dump` spawned through the script:
  `lakegroup-20260811145537.dump` (0.29 MB) written to `backend/backups/`.
- `npm run db:restore -- <missing file>` — usage guard, exit 1, nothing
  spawned.
- Backend suite **209/209**; backend on :4000 healthy (untouched by this
  phase — scripts only).

## Status

**COMPLETE** — no shell-enabled execution, no command-string
interpolation, no user input on any command line (password via env);
the absence is now regression-locked with static + behavioral guards, and
the two latent URL/CLI parsing issues are fixed.
