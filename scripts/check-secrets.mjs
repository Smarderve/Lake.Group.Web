/**
 * SECURITY_ROADMAP Phase 1 + Phase 22 — repeatable secret-exposure check.
 *
 *   node scripts/check-secrets.mjs
 *
 * 1. Asserts that .env files are excluded from source control (gitignore).
 * 2. Scans the working tree (excluding .git, node_modules, generated code,
 *    backup dumps and the live .env) for credential-shaped secrets:
 *    private keys, cloud keys, API tokens.
 *
 * Exit 0 = clean, 1 = a finding (for CI). Test-only password fixtures are not
 * flagged — the patterns target real credential formats, not any string
 * containing the word "password".
 *
 * Pure helpers are exported (scanGitignoreRules / scanContent / collectFiles)
 * so the patterns are regression-locked by
 * backend/tests/phase22-secret-scan.test.js (Phase 22).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKIP_DIRS = new Set(['node_modules', '.git', 'generated', 'backups', '.freebuff', 'coverage', 'playwright-report', 'test-results']);
const SKIP_FILES = new Set(['.env', 'package-lock.json', 'package-lock.json.old']);

// Credential-shaped patterns (deliberately specific to avoid false positives).
export const PATTERNS = [
  [/-----BEGIN (RSA |OPENSSH |EC |DSA |PGP )?PRIVATE KEY-----/, 'private key block'],
  [/\bAKIA[0-9A-Z]{16}\b/, 'AWS access key'],
  [/\bASIA[0-9A-Z]{16}\b/, 'AWS temporary key'],
  [/\bghp_[A-Za-z0-9]{36}\b/, 'GitHub personal access token'],
  [/\bgho_[A-Za-z0-9]{36}\b/, 'GitHub OAuth token'],
  [/\bxox[baprs]-[A-Za-z0-9-]{10,}\b/, 'Slack token'],
  [/\bsk-proj-[A-Za-z0-9]{20,}\b/, 'OpenAI-style API key'],
  [/\bsk_live_[0-9a-zA-Z]{16,}\b/, 'Stripe live secret key'],
  [/\brk_live_[0-9a-zA-Z]{16,}\b/, 'Stripe live restricted key'],
  [/\bAIza[0-9A-Za-z_-]{35}\b/, 'Google API key'],
  [/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, 'JWT (likely secret)'],
];

export function collectFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectFiles(full, out);
    else if (entry.isFile() && !SKIP_FILES.has(entry.name)) out.push(full);
  }
  return out;
}

export function scanGitignoreRules() {
  const gi = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');
  const backendGi = path.join(ROOT, 'backend', '.gitignore');
  const giB = fs.existsSync(backendGi) ? fs.readFileSync(backendGi, 'utf8') : '';
  const rules = `${gi}\n${giB}`;
  const hasEnv = /(^|\n)\s*\.env(\*|$)/m.test(rules) || /(^|\n)\s*\.env\.\*/m.test(rules);
  return { hasEnv, rules };
}

/** Scan one file's content; returns [{ label, index }] matches. */
export function scanContent(content) {
  const hits = [];
  for (const [re, label] of PATTERNS) {
    const m = content.match(re);
    if (m) hits.push({ label, index: m.index });
  }
  return hits;
}

const INTERESTING_EXT = /\.(js|mjs|json|md|html|env|example|yml|yaml|conf|txt|sh|ts|css|prisma)$/i;

export function runScan() {
  const gitignore = scanGitignoreRules();
  const findings = [];
  if (!gitignore.hasEnv) findings.push('.env is NOT excluded by .gitignore');

  const files = collectFiles(ROOT).filter((f) => INTERESTING_EXT.test(f));
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    for (const { label } of scanContent(content)) {
      findings.push(`${path.relative(ROOT, file)}: ${label}`);
    }
  }
  return { findings, fileCount: files.length };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const { findings, fileCount } = runScan();
  if (findings.length) {
    console.log('SECRET SCAN FINDINGS:');
    findings.forEach((f) => console.log(`  ✗ ${f}`));
    console.log('RESULT: FAIL');
    process.exit(1);
  }
  console.log(`Secret scan clean: ${fileCount} files checked, .env gitignored ✓`);
  console.log('RESULT: PASS');
  process.exit(0);
}
