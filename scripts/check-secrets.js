/**
 * SECURITY_ROADMAP Phase 1 — repeatable secret-exposure check.
 *
 *   node scripts/check-secrets.js
 *
 * 1. Asserts that .env files are excluded from source control (gitignore).
 * 2. Scans the working tree (excluding .git, node_modules, generated code,
 *    backup dumps and the live .env) for credential-shaped secrets:
 *    private keys, cloud keys, API tokens.
 *
 * Exit 0 = clean, 1 = a finding (for CI). Test-only password fixtures are not
 * flagged — the patterns target real credential formats, not any string
 * containing the word "password".
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SKIP_DIRS = new Set(['node_modules', '.git', 'generated', 'backups', '.freebuff']);
const SKIP_FILES = new Set(['.env', 'package-lock.json']);

// Credential-shaped patterns (deliberately specific to avoid false positives).
const PATTERNS = [
  [/-----BEGIN (RSA |OPENSSH |EC |DSA |PGP )?PRIVATE KEY-----/, 'private key block'],
  [/\bAKIA[0-9A-Z]{16}\b/, 'AWS access key'],
  [/\bASIA[0-9A-Z]{16}\b/, 'AWS temporary key'],
  [/\bghp_[A-Za-z0-9]{36}\b/, 'GitHub personal access token'],
  [/\bgho_[A-Za-z0-9]{36}\b/, 'GitHub OAuth token'],
  [/\bxox[baprs]-[A-Za-z0-9-]{10,}\b/, 'Slack token'],
  [/\bsk-[A-Za-z0-9]{20,}\b/, 'OpenAI-style API key'],
  [/\bAIza[0-9A-Za-z_-]{35}\b/, 'Google API key'],
  [/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, 'JWT (likely secret)'],
];

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile() && !SKIP_FILES.has(entry.name)) out.push(full);
  }
}

function checkGitignore() {
  const gi = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');
  const backendGi = path.join(ROOT, 'backend', '.gitignore');
  const giB = fs.existsSync(backendGi) ? fs.readFileSync(backendGi, 'utf8') : '';
  const rules = gi + '\n' + giB;
  const hasEnv = /(^|\n)\s*\.env(\*|$)/m.test(rules) || /(^|\n)\s*\.env\.\*/m.test(rules);
  return { hasEnv, rules };
}

let fail = 0;
const findings = [];

const gitignore = checkGitignore();
if (!gitignore.hasEnv) {
  fail = 1;
  findings.push('.env is NOT excluded by .gitignore');
}

const files = [];
walk(ROOT, files);
for (const file of files) {
  if (!/\.(js|mjs|json|md|html|env|example|yml|yaml|conf|txt|sh|ts|css)$/i.test(file)) continue;
  const content = fs.readFileSync(file, 'utf8');
  for (const [re, label] of PATTERNS) {
    const m = content.match(re);
    if (m) {
      fail = 1;
      findings.push(`${path.relative(ROOT, file)}: ${label}`);
    }
  }
}

if (findings.length) {
  console.log('SECRET SCAN FINDINGS:');
  findings.forEach((f) => console.log('  ✗ ' + f));
} else {
  console.log(`Secret scan clean: ${files.length} files checked, .env gitignored ✓`);
}
console.log(fail ? 'RESULT: FAIL' : 'RESULT: PASS');
process.exit(fail);
