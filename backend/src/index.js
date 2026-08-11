import { config, productionConfigProblems } from './config.js';
import { createLogger } from './logger.js';
import { createDb, createSessionStore } from './db.js';
import { createApp } from './app.js';

const logger = createLogger(config.logLevel);
// Phase 6 — the runtime connects with the least-privilege role when the
// split is configured; migrations/seeds keep using DATABASE_URL (owner).
const db = createDb(config.databaseUrlRuntime);
const sessionStore = createSessionStore(config.databaseUrlRuntime);

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

const productionProblems = productionConfigProblems(config);
if (productionProblems.length) {
  logger.fatal({ problems: productionProblems }, 'refusing to start: insecure production configuration');
  process.exit(1);
}

// Phase 15 — proxy awareness is operationally required behind a reverse
// proxy (real client IPs for rate limiting/audit, trusted X-Forwarded-* for
// the CSRF origin check). Warn, don't fail: direct deployments are valid.
if (config.isProduction && config.trustProxy <= 0) {
  logger.warn(
    'TRUST_PROXY is not set — client IPs and X-Forwarded-* are NOT trusted, so rate limiting/audit ' +
      'see the proxy and the CSRF origin check ignores forwarded headers. Set TRUST_PROXY=1 (or the ' +
      'proxy IP) when deploying behind a reverse proxy.',
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
  devEndpointsEnabled: config.devEndpointsEnabled,
});

const server = app.listen(config.port, () => {
  logger.info({ port: config.port }, 'Lake Group backend listening');
});

function shutdown(signal) {
  logger.info({ signal }, 'shutting down');
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
