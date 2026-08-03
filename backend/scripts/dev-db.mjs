/**
 * dev-db.mjs — local PostgreSQL via the self-contained `embedded-postgres`
 * package (no Docker, no admin rights, nothing installed system-wide).
 *
 *   npm run db:start   → init cluster (if needed), start, create DB, keep alive
 *   npm run db:stop    → stop the cluster (kills the recorded server process)
 *
 * The cluster lives in backend/.pgdata (gitignored) on port 5432 with the
 * credentials from .env.example. Usage matches:
 *   DATABASE_URI=postgres://lake:lake_change_me@localhost:5432/lakegroup_cms
 */
import EmbeddedPostgres from 'embedded-postgres'
import { execSync } from 'child_process'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.resolve(__dirname, '..', '.pgdata')
const PID_FILE = path.join(DATA_DIR, 'server.pid')

const PORT = 5432
const USER = 'lake'
const PASSWORD = 'lake_change_me'
const DB = 'lakegroup_cms'

const pg = new EmbeddedPostgres({
  databaseDir: DATA_DIR,
  user: USER,
  password: PASSWORD,
  port: PORT,
  persistent: true,
  // Force UTF-8: the site content (em-dashes, é, etc.) cannot be stored in
  // the Windows-default WIN1252 cluster encoding.
  initdbFlags: ['-E', 'UTF8', '--locale=C'],
})

async function start() {
  // initialise() runs initdb only when the cluster is not initialised yet.
  try {
    await pg.initialise()
  } catch (err) {
    // Already-initialised is fine (initdb refuses to overwrite existing data).
    if (!/already exists|initialised/i.test(String(err))) throw err
  }
  await pg.start()
  // Create the target database if missing (idempotent).
  try {
    await pg.createDatabase(DB)
    console.log(`Database "${DB}" ready.`)
  } catch (err) {
    if (!/already exists|42P04|duplicate/i.test(String(err))) throw err
  }

  writeFileSync(PID_FILE, String(process.pid))
  console.log(`Postgres ready → postgres://${USER}:${PASSWORD}@localhost:${PORT}/${DB} (server pid ${process.pid})`)
  console.log('Press Ctrl+C to stop (or run `npm run db:stop`).')

  const stop = async () => {
    try {
      await pg.stop()
    } catch {
      /* already stopped */
    }
    rmSync(PID_FILE, { force: true })
    process.exit(0)
  }
  process.on('SIGINT', stop)
  process.on('SIGTERM', stop)
  // Keep the event loop alive so the postgres child process stays up.
  setInterval(() => {}, 1 << 30)
}

function stop() {
  if (!existsSync(PID_FILE)) {
    console.log('No server.pid found — nothing to stop.')
    process.exit(0)
  }
  const pid = Number(readFileSync(PID_FILE, 'utf8'))
  try {
    if (process.platform === 'win32') {
      // Gentle kill first so the start() SIGTERM handler can run pg.stop()
      // (clean shutdown); fall back to force if the handler is unresponsive.
      try {
        execSync(`taskkill /PID ${pid} /T`, { stdio: 'ignore' })
      } catch {
        execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' })
      }
    } else {
      process.kill(pid, 'SIGTERM')
    }
    console.log(`Stopped server pid ${pid}.`)
  } catch (err) {
    // Stale pidfile (server already crashed) — nothing left to kill.
    console.error('Stop failed (server may already be down):', err.message)
  }
  rmSync(PID_FILE, { force: true })
  process.exit(0)
}

const cmd = process.argv[2] || 'start'
if (cmd === 'start') {
  start().catch((err) => {
    console.error('Failed to start Postgres:', err)
    process.exit(1)
  })
} else if (cmd === 'stop') {
  stop()
} else {
  console.error('usage: node scripts/dev-db.mjs start|stop')
  process.exit(1)
}
