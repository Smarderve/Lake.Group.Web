// Phase 22 — live disaster-recovery restore drill (one-shot).
//
// Usage (run from backend/):
//   PGPASSWORD=<postgres-superuser-password> node scripts/_p22_drill.mjs [dumpFile]
//
// Defaults dumpFile to the newest backups/lakegroup-*.dump(.enc)?.
//
// SAFETY: never touches the live `lakegroup` database. Creates an isolated
// scratch DB (lakegroup_restore_test_*), restores the dump into it, verifies
// schema + row counts + media references, boots the backend against the
// scratch DB for a read test, then DROPs only the scratch DB.
// The scratch DB name is asserted before any DROP.
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { parseUrl } from './backup-db.js';
import { createDb } from '../src/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const PGBIN = process.env.PGBIN || 'C:/Program Files/PostgreSQL/18/bin';
const bin = (name) => path.join(PGBIN, process.platform === 'win32' ? `${name}.exe` : name);
const PGPASSWORD = process.env.PGPASSWORD;

function runSync(cmd, args, env = {}) {
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    const child = spawn(cmd, args, { env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (out += d));
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, out, ms: Date.now() - t0 }));
  });
}

async function captureState(databaseUrl) {
  const db = createDb(databaseUrl);
  const tables = await db.$queryRawUnsafe(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
  );
  const counts = {};
  for (const t of tables) {
    const [c] = await db.$queryRawUnsafe(`SELECT count(*)::int AS n FROM "${t.tablename}"`);
    counts[t.tablename] = c.n;
  }
  const [mig] = await db.$queryRawUnsafe(
    `SELECT count(*)::int AS applied FROM _prisma_migrations`,
  );
  await db.$disconnect();
  return { table_count: tables.length, row_counts: counts, migrations_applied: mig.applied };
}

function pickDump(dir) {
  const candidates = fs
    .readdirSync(dir)
    .filter((f) => /^lakegroup-\d+\.dump$/.test(f))
    .map((f) => ({ f, m: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.m - a.m);
  return candidates.length ? path.join(dir, candidates[0].f) : null;
}

async function main() {
  if (!PGPASSWORD) {
    console.error('BLOCKED: PGPASSWORD (postgres superuser) is required to create the scratch database.');
    console.error('Usage: PGPASSWORD=<postgres-password> node scripts/_p22_drill.mjs [dumpFile]');
    process.exit(2);
  }
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) { console.error('DATABASE_URL not configured.'); process.exit(1); }
  const { host, port, db: liveDb } = parseUrl(databaseUrl);

  const dumpArg = process.argv[2];
  const dumpFile = dumpArg ? path.resolve(__dirname, '..', dumpArg) : pickDump(path.join(__dirname, '..', 'backups'));
  if (!dumpFile || !fs.existsSync(dumpFile)) { console.error('Dump not found:', dumpFile); process.exit(1); }
  const dumpStat = fs.statSync(dumpFile);

  const scratch = `lakegroup_restore_test_${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)}`;
  let created = false;
  const pgEnv = { PGPASSWORD };

  console.log('=== PHASE 22 — LIVE DR RESTORE DRILL ===');
  console.log(`live db:      ${liveDb} @ ${host}:${port}`);
  console.log(`dump:         ${path.basename(dumpFile)} (${(dumpStat.size / 1024).toFixed(1)} KB, ${dumpStat.mtime.toISOString()})`);
  console.log(`scratch:      ${scratch}`);

  // 1. Baseline (live lakegroup).
  console.log('\n[1/7] Capturing live baseline...');
  const baseline = await captureState(databaseUrl);

  try {
    // 2. Create scratch DB (superuser only).
    console.log('[2/7] Creating scratch database...');
    const mk = await runSync(bin('psql'), ['-h', host, '-p', port, '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c', `CREATE DATABASE "${scratch}"`], pgEnv);
    if (mk.code !== 0) throw new Error(`CREATE DATABASE failed (${mk.code}):\n${mk.out.slice(0, 800)}`);
    created = true;

    // 3. Restore (timed).
    console.log('[3/7] Restoring dump into scratch...');
    const rs = await runSync(
      bin('pg_restore'),
      ['--clean', '--if-exists', '--no-owner', '-h', host, '-p', port, '-U', 'postgres', '-d', scratch, dumpFile],
      pgEnv,
    );
    if (rs.code !== 0) throw new Error(`pg_restore exited ${rs.code}:\n${rs.out.slice(0, 1500)}`);
    console.log(`      restore OK in ${(rs.ms / 1000).toFixed(1)}s (exit 0)`);

    // 4. Verify restored structure + data.
    console.log('[4/7] Verifying restored schema + row counts...');
    const scratchUrl = `postgresql://postgres:${encodeURIComponent(PGPASSWORD)}@${host}:${port}/${scratch}`;
    const restored = await captureState(scratchUrl);

    const diffs = [];
    if (baseline.table_count !== restored.table_count) diffs.push(`table_count ${baseline.table_count} -> ${restored.table_count}`);
    if (baseline.migrations_applied !== restored.migrations_applied) diffs.push(`migrations ${baseline.migrations_applied} -> ${restored.migrations_applied}`);
    for (const t of Object.keys({ ...baseline.row_counts, ...restored.row_counts })) {
      const a = baseline.row_counts[t] ?? 'ABSENT';
      const b = restored.row_counts[t] ?? 'ABSENT';
      if (a !== b) diffs.push(`${t}: ${a} -> ${b}`);
    }
    const compared = Object.keys(restored.row_counts).length;
    console.log(`      tables: ${restored.table_count} (live ${baseline.table_count}) | ${compared} tables row-compared | migrations: ${restored.migrations_applied}`);
    if (diffs.length) {
      console.error('      MISMATCHES:');
      for (const d of diffs.slice(0, 40)) console.error(`        - ${d}`);
    } else {
      console.log('      row counts + schema: IDENTICAL to live');
    }

    // 5. Media reference check: restored Media.url -> repo-relative file exists.
    console.log('[5/7] Verifying media references (url -> repo file)...');
    const db = createDb(scratchUrl);
    const media = await db.$queryRawUnsafe(`SELECT "url" FROM "Media"`);
    await db.$disconnect();
    let missing = 0;
    for (const m of media) {
      const rel = String(m.url).split('?')[0];
      if (!rel) continue;
      if (!fs.existsSync(path.join(REPO_ROOT, rel))) missing++;
    }
    console.log(`      ${media.length} media records -> ${media.length - missing} files present, ${missing} missing`);

    // 6. App connection + read test against scratch.
    console.log('[6/7] Booting backend against scratch DB (port 4099)...');
    const child = spawn('node', ['src/index.js'], {
      cwd: path.resolve(__dirname, '..'),
      env: {
        ...process.env,
        DATABASE_URL: scratchUrl,
        PORT: '4099',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let bootOut = '';
    child.stdout.on('data', (d) => (bootOut += d));
    child.stderr.on('data', (d) => (bootOut += d));
    const waitHealth = async () => {
      for (let i = 0; i < 30; i++) {
        try {
          const r = await fetch('http://127.0.0.1:4099/health');
          if (r.ok) return r.json();
        } catch { /* booting */ }
        await new Promise((r) => setTimeout(r, 500));
      }
      throw new Error('backend did not become healthy on 4099');
    };
    let health;
    try {
      health = await waitHealth();
      console.log('      /health:', JSON.stringify(health));
      const probes = [
        '/api/public/metrics', '/api/public/companies', '/api/public/news',
        '/api/public/leadership', '/api/public/projects', '/api/public/pages',
        '/api/public/career-listings', '/api/public/csr-entries', '/api/public/contacts',
      ];
      let ok = 0;
      for (const p of probes) {
        const r = await fetch(`http://127.0.0.1:4099${p}`);
        const body = await r.json();
        const key = Object.keys(body)[0];
        const n = key ? (Array.isArray(body[key]) ? body[key].length : 'obj') : '-';
        console.log(`      ${r.status}  ${p}  (${n})`);
        if (r.ok) ok++;
      }
      console.log(`      read test: ${ok}/${probes.length} endpoints OK`);
    } finally {
      child.kill('SIGTERM');
      await new Promise((r) => setTimeout(r, 1000));
      try { process.kill(child.pid); } catch { /* already gone */ }
      const excerpt = bootOut.split('\n').filter((l) => l.includes('error') || l.includes('Error')).slice(0, 5);
      if (excerpt.length) console.log('      backend log errors:', excerpt.join(' | '));
    }

    // 7. Cleanup — assert scratch name, then drop.
    console.log('[7/7] Cleanup — dropping scratch database...');
    if (!scratch.startsWith('lakegroup_restore_test_')) throw new Error('refusing to drop non-scratch database');
    const drop = await runSync(
      bin('psql'), ['-h', host, '-p', port, '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c', `DROP DATABASE "${scratch}" WITH (FORCE)`], pgEnv,
    );
    created = false;
    if (drop.code !== 0) throw new Error(`DROP failed (${drop.code}):\n${drop.out.slice(0, 800)}`);
    console.log('      scratch database dropped.');

    const pass = diffs.length === 0 && missing === 0 && health?.db === 'up';
    console.log('\n=== RESULT ===');
    if (pass) {
      console.log('PHASE 22: PASS — backup restores, schema/data/media verified identical, backend reads restored data.');
    } else {
      console.log('PHASE 22: FAIL — see mismatches above.');
      process.exit(1);
    }
  } finally {
    if (created) {
      console.warn('Cleanup: dropping scratch DB after failure...');
      await runSync(bin('psql'), ['-h', host, '-p', port, '-U', 'postgres', '-d', 'postgres', '-c', `DROP DATABASE IF EXISTS "${scratch}" WITH (FORCE)`], pgEnv);
    }
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main().catch((e) => {
    console.error('DRILL FAILED:', e.message);
    process.exit(1);
  });
}
