#!/usr/bin/env node
/**
 * SECURITY_ROADMAP Phase 21 — Automated Security Testing: runs the security
 * regression suites. Portability wrapper: `npm run` on Windows passes glob
 * arguments through cmd unexpanded, and vitest treats a literal glob as a
 * filename filter that matches nothing. This script expands the file list
 * itself (fs, no shell globbing) and drives vitest through its programmatic
 * API (startVitest) — deliberately NOT a child process, so the Phase 13
 * tripwire (process execution lives only in the reviewed scripts) stays
 * intact.
 *
 * Runs: tests/hardening.test.js + every tests/phase*.test.js
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startVitest } from 'vitest/node';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const testsDir = path.join(backendRoot, 'tests');

const phaseFiles = fs
  .readdirSync(testsDir)
  .filter((f) => f.startsWith('phase') && f.endsWith('.test.js'))
  .sort()
  .map((f) => path.join(testsDir, f));

const files = [path.join(testsDir, 'hardening.test.js'), ...phaseFiles];

if (phaseFiles.length === 0) {
  console.error('[run-security-tests] FAIL — no tests/phase*.test.js files found.');
  process.exit(1);
}

console.log(`[run-security-tests] ${files.length} security suite file(s):`);
for (const f of files) console.log(`  - ${path.relative(backendRoot, f)}`);

const vitest = await startVitest('run', files, {
  root: backendRoot,
  passWithNoTests: false,
});

// startVitest returns false when the run failed; it also never resolves on
// watch mode, so a resolved promise means the run finished.
process.exit(vitest ? 0 : 1);
