#!/usr/bin/env node
/**
 * SECURITY_ROADMAP Phase 21 — Automated Security Testing: the npm audit
 * gate. Runs `npm audit --json` in a target directory and fails on any
 * advisory id NOT in the monitored baseline (docs/security/audit-baseline.json).
 *
 *   node scripts/audit-gate.js <dir> --baseline <json> [--scope <name>]
 *
 * Behavior:
 *   - backend scope: baseline is empty → the runtime tree must stay at
 *     zero vulnerabilities (a new advisory breaks the gate = release blocker).
 *   - root scope: baseline lists the two documented dev-toolchain moderates
 *     → only NEW advisories break the gate.
 *   - If npm audit cannot run or its JSON cannot be parsed, the gate FAILS
 *     (a security gate that cannot verify must deny, not pass silently).
 *
 * SECURITY (Phase 13 pattern): spawn without a shell, literal argv.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const BACKEND_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// npm's bin is plain JS — run it with the current node binary so the gate
// works on every platform without a shell shim (spawning npm.cmd on Windows
// fails with EINVAL; shell mode would break the Phase 13 no-shell rule).
// Resolution order: npm_execpath (set when npm runs this script) → local
// node_modules → the npm bundled beside the current node binary.
function resolveNpmCli() {
  if (process.env.npm_execpath) return process.env.npm_execpath;
  const candidates = [
    path.join(BACKEND_ROOT, 'node_modules', 'npm', 'bin', 'npm-cli.js'),
    path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

const npmCli = resolveNpmCli();

/** Extract the advisory id (GHSA-xxxx-xxxx-xxxx) from an npm advisory URL. */
function advisoryIdFromUrl(url) {
  const m = /GHSA-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}/.exec(url || '');
  return m ? m[0] : null;
}

/**
 * Collect every advisory id present in an npm audit --json document.
 * `via` entries that are plain strings name upstream packages which appear
 * as their own `vulnerabilities` keys (their object `via` carries the
 * advisory), so collecting object entries is complete.
 */
export function collectAdvisoryIds(auditJson) {
  const ids = new Set();
  const vulns = auditJson.vulnerabilities || {};
  for (const entry of Object.values(vulns)) {
    for (const via of entry.via || []) {
      if (typeof via === 'object' && via.url) {
        const id = advisoryIdFromUrl(via.url);
        if (id) ids.add(id);
      }
    }
  }
  return ids;
}

export function parseCli(argv) {
  const dir = argv[0] || '.';
  let baselinePath = null;
  let scope = 'audit';
  for (let i = 1; i < argv.length; i++) {
    if (argv[i] === '--baseline') baselinePath = argv[++i];
    if (argv[i] === '--scope') scope = argv[++i];
  }
  return { dir, baselinePath, scope };
}

function runNpmAudit(dir) {
  return new Promise((resolve, reject) => {
    if (!npmCli || !fs.existsSync(npmCli)) {
      reject(new Error(`npm-cli.js not found (npm_execpath/local/global) — run npm ci first`));
      return;
    }
    const child = spawn(process.execPath, [npmCli, 'audit', '--json'], {
      cwd: dir,
      env: { ...process.env, NO_COLOR: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    let err = '';
    child.stdout.on('data', (c) => (out += c));
    child.stderr.on('data', (c) => (err += c));
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, out, err }));
  });
}

async function run() {
  const { dir, baselinePath, scope } = parseCli(process.argv.slice(2));
  const absDir = path.resolve(dir);
  if (!baselinePath) {
    console.error('Usage: node scripts/audit-gate.js <dir> --baseline <baseline.json> [--scope <name>]');
    process.exit(2);
  }
  const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
  const expected = new Set(baseline.audits[scope]?.advisories || []);

  console.log(`[audit-gate] ${scope}: npm audit --json in ${absDir}`);
  const { out, err } = await runNpmAudit(absDir);

  let json;
  try {
    json = JSON.parse(out);
  } catch {
    console.error(`[audit-gate] FAIL — could not parse npm audit output for ${scope}.`);
    if (err.trim()) console.error(err.trim().slice(0, 800));
    process.exit(1);
  }

  const found = collectAdvisoryIds(json);
  const newIds = [...found].filter((id) => !expected.has(id));

  const byName = Object.entries(json.vulnerabilities || {}).map(
    ([name, v]) => `${name} (${v.severity})`,
  );

  if (newIds.length) {
    console.error(
      `[audit-gate] FAIL — ${newIds.length} NEW advisory(ies) not in the ${scope} baseline:`,
    );
    for (const id of newIds) console.error(`  - ${id}`);
    console.error(
      `[audit-gate] Affected: ${byName.join(', ') || '(unknown)'}. ` +
        `Fix them, or review + document before adding to the baseline (` +
        `docs/security/audit-baseline.json, process in automated-testing.md).`,
    );
    process.exit(1);
  }

  const total = json.metadata?.vulnerabilities?.total ?? byName.length;
  console.log(
    `[audit-gate] PASS — ${scope} clean: ${total} known, all within the monitored baseline ` +
      `(${expected.size} advisory id(s) allowed).`,
  );
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  run().catch((e) => {
    console.error('[audit-gate] FAIL —', e.message);
    process.exit(1);
  });
}
