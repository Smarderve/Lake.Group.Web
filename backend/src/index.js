import { config, productionConfigProblems } from './config.js';
import { createLogger } from './logger.js';
import { createDb, createSessionStore, createRateLimitPool } from './db.js';
import { createUserPrefsStore, createMemoryPrefsStore } from './lib/user-prefs-store.js';
import { createApp } from './app.js';
import { loginRateLimiter } from './middleware/rate-limit.js';
import { createObjectStorage } from './lib/object-storage.js';
import { startPublicReleaseWorker } from './lib/public-release.js';
import { createSecretBox, inspectMfaKey } from './lib/secret-box.js';

const logger = createLogger(config.logLevel);
// Phase 6 — the runtime connects with the least-privilege role when the
// split is configured; migrations/seeds keep using DATABASE_URL (owner).
const db = createDb(config.databaseUrlRuntime);
const sessionStore = createSessionStore(config.databaseUrlRuntime);
// Persistent login limiter: the 24h per-IP budget lives in the PostgreSQL
// `rate_limit` table (migration 0013) instead of memory, so restarts never
// reset it. Falls back to MemoryStore when there is no database.
const rateLimitPool = createRateLimitPool(config.databaseUrlRuntime);
// Settings Center — per-user preferences persisted in PostgreSQL (migration
// 0014), falling back to an in-memory store when there is no database.
const prefsStore = createUserPrefsStore(config.databaseUrlRuntime) ?? createMemoryPrefsStore();
const mediaStorage = createObjectStorage(config);

if (!db) {
  logger.warn(
    'DATABASE_URL is not set — copy .env.example to .env and fill in your local PostgreSQL connection string. ' +
      'GET /health will report the database as down until then.',
  );
} else if (!config.sessionSecret) {
  logger.warn(
    'SESSION_SECRET is not set — sessions are disabled and every auth request will be rejected. ' +
      'Generate one with: openssl rand -hex 32  (then set it in .env)',
  );
}

// Safe startup diagnostic — metadata only (present/valid/byte length), never
// the key itself. Runs before validation so an operator can tell "missing"
// from "malformed" in the startup log.
logger.info(
  { mfaKey: inspectMfaKey(config.mfaEncryptionKey) },
  'MFA encryption key diagnostic',
);

// Tier diagnostic — printed BEFORE the production gate so the Render log shows
// exactly which mode is active (staging vs production) and why the gate ran.
logger.info({ env: config.env, isProduction: config.isProduction }, 'boot environment');

const productionProblems = productionConfigProblems(config);
if (productionProblems.length) {
  logger.fatal({ problems: productionProblems }, 'refusing to start: insecure production configuration');
  process.exit(1);
}
const secretBox = config.mfaEncryptionKey ? createSecretBox(config.mfaEncryptionKey) : null;

// Phase 15 — proxy awareness is operationally required behind a reverse
// proxy (real client IPs for rate limiting/audit, trusted X-Forwarded-* for
// the CSRF origin check). Warn, don't fail: direct deployments are valid.
if (config.isProduction && config.trustProxy <= 0) {
  logger.warn(
    'TRUST_PROXY is disabled — correct for direct TLS only. Behind an ingress, rate limiting/audit ' +
      'would see the proxy and CSRF would ignore forwarded headers. Set TRUST_PROXY=1 only for an ' +
      'ingress-only one-hop topology, or configure exact proxy IP/CIDR entries.',
  );
}

const app = createApp({
  logger,
  db,
  sessionSecret: config.sessionSecret,
  sessionStore,
  cookieSecure: config.cookieSecure,
  trustProxy: config.trustProxy,
  sessionName: config.sessionName,
  sessionTtlMs: config.sessionTtlMs,
  sessionRolling: config.sessionRolling,
  recentAuthWindowMs: config.recentAuthWindowMs,
  csrfAllowedOrigins: config.csrfAllowedOrigins,
  cmsAllowedOrigins: config.cmsAllowedOrigins,
  mfaRequiredRoles: config.mfaRequiredRoles,
  secretBox,
  devEndpointsEnabled: config.devEndpointsEnabled,
  devMfaSkipEmails: config.devMfaSkipEmails,
  isProduction: config.isProduction,
  loginLimiter: loginRateLimiter({ pool: rateLimitPool }),
  prefsStore,
  mediaStorage,
  mediaUploadMaxBytes: config.mediaUploadMaxBytes,
});

const server = app.listen(config.port, () => {
  logger.info({ env: config.env, port: config.port }, 'Lake Group backend listening');
});
const publicReleaseWorker = startPublicReleaseWorker({ db, config, logger });

function shutdown(signal) {
  logger.info({ signal }, 'shutting down');
  publicReleaseWorker.stop();
  server.close(async () => {
    try {
      await db?.$disconnect();
    } catch (err) {
      logger.error({ err }, 'error during shutdown');
    }
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
