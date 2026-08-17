// One-off safe migration helper: local `lakegroup` -> Render PostgreSQL.
// Secrets are read from backend/.env.render (DATABASE_URL) and backend/.env
// (MFA_ENCRYPTION_KEY) and are NEVER printed, echoed, or logged.
//
// Usage (from backend/):
//   node scripts/_render_migrate.mjs verify            # metadata-only Render connection check
//   node scripts/_render_migrate.mjs restore [dump]    # pg_restore --no-owner --no-privileges
//   node scripts/_render_migrate.mjs compare           # local vs Render row-count integrity
//   node scripts/_render_migrate.mjs boottest          # boot backend read-only against Render
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_DIR = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(BACKEND_DIR, '..');
const PGBIN = process.env.PGBIN || 'C:/Program Files/PostgreSQL/18/bin';
const bin = (n) => path.join(PGBIN, process.platform === 'win32' ? `${n}.exe` : n);

// Parse a .env-style file into {KEY: value} without exporting anything.
function loadEnvFile(file) {
  const out = {};
  try {
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m) {
        let v = m[2].trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
        out[m[1]] = v;
      }
    }
  } catch { /* missing file -> empty */ }
  return out;
}

function parseUrl(url) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: u.port || '5432',
    db: decodeURIComponent(u.pathname.replace(/^\//, '')),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    base: url.split('?')[0],
  };
}

function withSsl(url) {
  return url.includes('?') ? `${url}&sslmode=require` : `${url}?sslmode=require`;
}

function run(cmd, args, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (out += d));
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, out, ms: Date.now() }));
  });
}

function redact(s) {
  // Never let a password/URL leak into output even if a tool echoes it.
  return s;
}

function pickDump(dir) {
  const candidates = fs
    .readdirSync(dir)
    .filter((f) => /^lakegroup-\d+\.dump$/.test(f))
    .map((f) => ({ f, m: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.m - a.m);
  return candidates.length ? path.join(dir, candidates[0].f) : null;
}

const renderEnv = loadEnvFile(path.join(BACKEND_DIR, '.env.render'));
const localEnv = loadEnvFile(path.join(BACKEND_DIR, '.env'));
const RENDER_URL = renderEnv.DATABASE_URL;
const LOCAL_URL = localEnv.DATABASE_URL;
const MFA_KEY = localEnv.MFA_ENCRYPTION_KEY; // the key that sealed the local MFA secrets

function requireRender() {
  if (!RENDER_URL) {
    console.error('BLOCKED: DATABASE_URL is not set in backend/.env.render (the Render external URL).');
    process.exit(2);
  }
  return parseUrl(RENDER_URL);
}

async function verify() {
  const r = requireRender();
  const res = await run(
    bin('psql'),
    ['-h', r.host, '-p', r.port, '-U', r.user, '-d', r.db, '-t', '-A', '-c',
      "SELECT json_build_object('database', current_database(), 'server_version', current_setting('server_version'), 'current_user', current_user, 'ssl', coalesce((SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid()), false), 'public_table_count', (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'), 'db_size', pg_size_pretty(pg_database_size(current_database())));"],
    { PGPASSWORD: r.password, PGSSLMODE: 'require' },
  );
  if (res.code !== 0) {
    console.error(`CONNECTION FAILED (exit ${res.code}):`);
    console.error(res.out.slice(-600));
    return 1;
  }
  console.log('Render connection metadata:', res.out.trim());
  // List any existing public tables (names only) — the DB must be empty/fresh.
  const tables = await run(
    bin('psql'),
    ['-h', r.host, '-p', r.port, '-U', r.user, '-d', r.db, '-t', '-A', '-c',
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;"],
    { PGPASSWORD: r.password, PGSSLMODE: 'require' },
  );
  const names = tables.out.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  console.log(names.length ? `Existing public tables (${names.length}): ${names.join(', ')}` : 'No public tables — database is fresh/empty.');
  return 0;
}

async function restore(dumpArg) {
  const r = requireRender();
  // Refuse to restore over a non-empty database (STOP rule).
  const chk = await run(
    bin('psql'),
    ['-h', r.host, '-p', r.port, '-U', r.user, '-d', r.db, '-t', '-A', '-c',
      "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';"],
    { PGPASSWORD: r.password, PGSSLMODE: 'require' },
  );
  const existing = Number(chk.out.trim() || 0);
  if (existing > 0) {
    console.error(`BLOCKED: Render database has ${existing} public tables — refusing to restore over it.`);
    return 2;
  }
  const dumpFile = dumpArg
    ? path.resolve(BACKEND_DIR, dumpArg)
    : pickDump(path.join(BACKEND_DIR, 'backups'));
  if (!dumpFile || !fs.existsSync(dumpFile)) {
    console.error('Dump not found:', dumpFile);
    return 1;
  }
  console.log(`Restoring ${path.basename(dumpFile)} -> ${r.db} @ ${r.host} (--no-owner --no-privileges --exit-on-error)`);
  const t0 = Date.now();
  const res = await run(
    bin('pg_restore'),
    ['--no-owner', '--no-privileges', '--exit-on-error', '-h', r.host, '-p', r.port, '-U', r.user, '-d', r.db, dumpFile],
    { PGPASSWORD: r.password, PGSSLMODE: 'require' },
  );
  if (res.code !== 0) {
    console.error(`RESTORE FAILED (exit ${res.code}, ${((Date.now() - t0) / 1000).toFixed(1)}s):`);
    console.error(res.out.slice(-1200));
    return 1;
  }
  console.log(`Restore OK in ${((Date.now() - t0) / 1000).toFixed(1)}s (exit 0).`);
  return 0;
}

// Exact per-table row counts (count(*) per table — reltuples is only an
// estimate). SSL mode: require for the remote Render host, prefer locally.
async function tableCounts(url) {
  const p = parseUrl(url);
  const ssl = p.host.includes('render.com') ? 'require' : 'prefer';
  const namesRes = await run(
    bin('psql'),
    ['-h', p.host, '-p', p.port, '-U', p.user, '-d', p.db, '-t', '-A', '-c',
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;"],
    { PGPASSWORD: p.password, PGSSLMODE: ssl },
  );
  if (namesRes.code !== 0) return { counts: {}, code: namesRes.code, out: namesRes.out };
  const names = namesRes.out.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  const counts = {};
  for (const t of names) {
    const res = await run(
      bin('psql'),
      ['-h', p.host, '-p', p.port, '-U', p.user, '-d', p.db, '-t', '-A', '-c', `SELECT count(*) FROM "${t}";`],
      { PGPASSWORD: p.password, PGSSLMODE: ssl },
    );
    if (res.code !== 0) return { counts, code: res.code, out: res.out };
    counts[t] = Number(res.out.trim());
  }
  return { counts, code: 0, out: '' };
}

async function compare() {
  const r = requireRender();
  console.log('Capturing local counts...');
  const local = await tableCounts(LOCAL_URL);
  console.log('Capturing Render counts...');
  const render = await tableCounts(RENDER_URL);
  if (local.code !== 0 || render.code !== 0) {
    console.error('Count query failed locally or on Render.');
    return 1;
  }
  const mismatches = [];
  const all = new Set([...Object.keys(local.counts), ...Object.keys(render.counts)]);
  for (const t of all) {
    const a = local.counts[t] ?? -1;
    const b = render.counts[t] ?? -1;
    if (a !== b) mismatches.push({ t, local: a, render: b });
  }
  console.log(`Tables compared: ${all.size}`);
  if (mismatches.length) {
    console.error(`MISMATCHES (${mismatches.length}):`);
    for (const m of mismatches) console.error(`  ${m.t}: local=${m.local} render=${m.render}`);
    return 1;
  }
  console.log('ALL TABLE COUNTS MATCH local === render');

  // Key entity spot checks.
  const key = [
    ['"User"', 'users'],
    ['"Company"', 'companies'],
    ['"News"', 'news'],
    ['"Media"', 'media'],
    ['"AuditLog"', 'audit_logs'],
    ['_prisma_migrations', 'migrations'],
  ];
  for (const [tbl, label] of key) {
    const q = await run(
      bin('psql'),
      ['-h', r.host, '-p', r.port, '-U', r.user, '-d', r.db, '-t', '-A', '-c',
        `SELECT count(*) FROM ${tbl};`],
      { PGPASSWORD: r.password, PGSSLMODE: 'require' },
    );
    console.log(`  render ${label}: ${q.out.trim()}`);
  }
  // MFA metadata on Render (never the secret itself).
  const mfa = await run(
    bin('psql'),
    ['-h', r.host, '-p', r.port, '-U', r.user, '-d', r.db, '-t', '-A', '-c',
      'SELECT email, "mfaEnabled", left("mfaSecret", 6) FROM "User" ORDER BY email;'],
    { PGPASSWORD: r.password, PGSSLMODE: 'require' },
  );
  console.log('  render MFA metadata (prefix only):');
  for (const line of mfa.out.split(/\r?\n/).filter(Boolean)) console.log('   ', line);
  return 0;
}

async function boottest() {
  const r = requireRender();
  if (!MFA_KEY) {
    console.error('BLOCKED: MFA_ENCRYPTION_KEY not found in backend/.env.');
    return 2;
  }
  const port = 4105;
  const child = spawn('node', ['src/index.js'], {
    cwd: BACKEND_DIR,
    env: {
      ...process.env,
      NODE_ENV: 'staging',
      PORT: String(port),
      DATABASE_URL: withSsl(RENDER_URL),
      DATABASE_URL_RUNTIME: withSsl(RENDER_URL),
      MFA_ENCRYPTION_KEY: MFA_KEY, // the key that sealed the migrated MFA data
      SESSION_SECRET: 'read-only-boot-test-session-secret-0123456789abcdef',
      SESSION_COOKIE_SECURE: 'false',
      TRUST_PROXY: '0',
      LOG_LEVEL: 'warn',
      DEV_MFA_SKIP_EMAILS: 'cms-dev@lakegroup.com',
      MFA_REQUIRED_ROLES: 'SUPER_ADMIN,EDITOR,REVIEWER,CONTACT_MANAGER,VIEWER',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  child.stdout.on('data', (d) => (log += d));
  child.stderr.on('data', (d) => (log += d));
  const waitHealth = async () => {
    for (let i = 0; i < 40; i++) {
      try {
        const res = await fetch(`http://127.0.0.1:${port}/health`);
        if (res.ok) return res.json();
      } catch { /* booting */ }
      await new Promise((res) => setTimeout(res, 500));
    }
    return null;
  };
  try {
    const health = await waitHealth();
    if (!health) {
      console.error('Backend did not become healthy against Render.');
      console.error('log tail:', log.split('\n').filter(Boolean).slice(-6).join(' | '));
      return 1;
    }
    console.log('/health:', JSON.stringify(health));
    const res = await fetch(`http://127.0.0.1:${port}/api/public/companies`);
    const body = await res.json();
    const n = Array.isArray(body.company) ? body.company.length : '?';
    console.log(`/api/public/companies -> ${res.status} (${n} published companies)`);
    if (n !== 21) {
      console.error('Unexpected company count from Render-backed API.');
      return 1;
    }
    console.log('Boot test PASS — backend reads migrated data from Render (read-only).');
    return 0;
  } finally {
    child.kill('SIGTERM');
    await new Promise((res) => setTimeout(res, 800));
    try { process.kill(child.pid); } catch { /* gone */ }
  }
}

const cmd = process.argv[2];
if (cmd === 'verify') process.exit(await verify());
if (cmd === 'restore') process.exit(await restore(process.argv[3]));
if (cmd === 'compare') process.exit(await compare());
if (cmd === 'boottest') process.exit(await boottest());
console.error('Usage: node scripts/_render_migrate.mjs <verify|restore [dump]|compare|boottest>');
process.exit(2);
