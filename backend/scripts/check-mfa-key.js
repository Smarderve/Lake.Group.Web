// Deployment diagnostic — validates MFA_ENCRYPTION_KEY WITHOUT revealing it.
//
// Usage:
//   node scripts/check-mfa-key.js                 # reads process.env.MFA_ENCRYPTION_KEY
//   node scripts/check-mfa-key.js .env.render     # reads a local key file (gitignored)
//
// Prints only metadata: variable present yes/no, decoded byte length, and
// whether the format is valid. Never prints the key or its decoded bytes.

import fs from 'node:fs';

function valueFromArg(path) {
  const line = fs
    .readFileSync(path, 'utf8')
    .split(/\r?\n/)
    .find((l) => l.startsWith('MFA_ENCRYPTION_KEY'));
  if (!line) return null;
  return line.split('=').slice(1).join('=').trim();
}

const path = process.argv[2];
let raw = path ? valueFromArg(path) : (process.env.MFA_ENCRYPTION_KEY ?? '');

if (path && raw === null) {
  console.log('MFA_ENCRYPTION_KEY: MISSING (no key line in ' + path + ')');
  process.exit(1);
}

if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
  console.log('MFA_ENCRYPTION_KEY: INVALID — value is wrapped in quotes (paste the raw value without quotes)');
  process.exit(1);
}

if (!raw.trim()) {
  console.log('MFA_ENCRYPTION_KEY: MISSING (empty)');
  process.exit(1);
}

const decoded = Buffer.from(raw, 'base64');
const canonical = decoded.toString('base64').replace(/=+$/, '') === raw.replace(/=+$/, '');
const ok = decoded.length === 32 && canonical;

console.log('MFA_ENCRYPTION_KEY: ' + (ok ? 'VALID' : 'INVALID') + ' — decoded byte length: ' + decoded.length + ' — canonical base64: ' + (canonical ? 'yes' : 'no'));
console.log('Required: exactly 32 bytes, canonical Base64 (e.g. openssl rand -base64 32).');
if (!ok) {
  console.log('If you pasted a hex string, plaintext password, template placeholder, or value with quotes/whitespace, replace it with a fresh generated value.');
  process.exit(1);
}
process.exit(0);
