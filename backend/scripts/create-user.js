#!/usr/bin/env node
/**
 * Create a backend user manually (no signup UI exists yet).
 *
 * Usage:
 *   npm run create-user -- --email admin@lakegroup.test --role SUPER_ADMIN
 *
 * Password source (first match wins):
 *   1. --password flag
 *   2. CREATE_USER_PASSWORD env var
 *   3. auto-generated — printed once to stdout
 *
 * Role is optional (defaults to VIEWER). Requires DATABASE_URL (and the
 * migrations applied) — see README.
 */
import 'dotenv/config';
import crypto from 'node:crypto';
import { createDb } from '../src/db.js';
import { hashPassword } from '../src/lib/passwords.js';
import { validatePasswordPolicy } from '../src/lib/password-policy.js';
import { ROLES } from '../src/validators/auth.js';

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (key === '--email' || key === '--role' || key === '--password') {
      args[key.slice(2)] = argv[i + 1];
      i += 1;
    } else if (key === '--help' || key === '-h') {
      args.help = true;
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));

if (args.help || !args.email) {
  console.log(`
Create a backend user manually.

  npm run create-user -- --email <email> [--role <role>] [--password <pw>]

  --email     required — the user's login email
  --role      one of: ${ROLES.join(', ')} (default: VIEWER)
  --password  optional — else CREATE_USER_PASSWORD env, else a random one is generated

Requires DATABASE_URL to be set (copy .env.example to .env first) and the
migrations applied (npm run db:migrate).
`);
  process.exit(args.help ? 0 : 1);
}

const email = args.email.toLowerCase().trim();
const role = (args.role || 'VIEWER').toUpperCase();

if (!ROLES.includes(role)) {
  console.error(`Invalid role "${args.role}". Must be one of: ${ROLES.join(', ')}`);
  process.exit(1);
}

const password = args.password || process.env.CREATE_USER_PASSWORD || crypto.randomBytes(9).toString('base64url');

const policy = validatePasswordPolicy({ password, email });
if (!policy.ok) {
  console.error(`Password rejected: ${policy.message}`);
  process.exit(1);
}

const db = createDb(process.env.DATABASE_URL);
if (!db) {
  console.error('DATABASE_URL is not set. Copy .env.example to .env and fill in your connection string.');
  process.exit(1);
}

try {
  const passwordHash = await hashPassword(password);
  const user = await db.user.upsert({
    where: { email },
    update: { role, passwordHash, active: true },
    create: { email, role, passwordHash },
  });
  console.log(`User ready: ${user.email} (${user.role}) id=${user.id}`);
  if (!args.password && !process.env.CREATE_USER_PASSWORD) {
    console.log(`Generated password (shown once): ${password}`);
    console.log('Change it after first login via the admin password reset, or keep a copy now.');
  } else {
    console.log('Password: provided via --password / CREATE_USER_PASSWORD.');
  }
} finally {
  await db.$disconnect();
}
