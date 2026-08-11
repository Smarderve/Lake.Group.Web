import 'dotenv/config';

// Central configuration. All values come from .env (see .env.example) —
// nothing is hardcoded, and no secret ever lives in source.

const DEFAULT_PORT = 4000;

const env = process.env;

// SECURITY_ROADMAP Phase 1 — environment separation. NODE_ENV is normalized
// to one of: development | testing | staging | production. Production turns
// off development endpoints and requires hardened defaults (secure cookies,
// HSTS, fail-fast boot checks in src/index.js).
const APP_ENVS = ['development', 'testing', 'staging', 'production'];

// Time windows / security defaults.
export const DEFAULT_SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours
export const DEFAULT_RECENT_AUTH_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
export const DEFAULT_BCRYPT_COST = 12;
export const DEFAULT_LOGIN_RATE_LIMIT = { windowMs: 15 * 60 * 1000, limit: 5 };
export const DEFAULT_MFA_RATE_LIMIT = { windowMs: 15 * 60 * 1000, limit: 5 };
export const DEFAULT_METRIC_STALE_DAYS = 180; // Phase 3 — stale-data window

/**
 * Compute the full configuration from an environment object. Pure and
 * deterministic — unit-testable without mutating process.env (Phase 1).
 */
export function resolveConfig(env) {
  const appEnv = APP_ENVS.includes(env.NODE_ENV) ? env.NODE_ENV : 'development';
  return {
    env: appEnv,
    isProduction: appEnv === 'production',
    // Development-only validation-pattern routes (/example) mount only outside
    // production — a dev endpoint must never ship live.
    devEndpointsEnabled: appEnv !== 'production',
    port: Number(env.PORT) || DEFAULT_PORT,
    logLevel: env.LOG_LEVEL || 'info',
    databaseUrl: env.DATABASE_URL || '',
    // SECURITY_ROADMAP Phase 6 — least privilege: the app RUNTIME connects
    // as a DML-only role (lake_app) when DATABASE_URL_RUNTIME is set; the
    // owner (DATABASE_URL) is reserved for Prisma Migrate / seeds / backup.
    // Falls back to DATABASE_URL so local dev without the split still works.
    databaseUrlRuntime: env.DATABASE_URL_RUNTIME || env.DATABASE_URL || '',

    // Auth & sessions (Phase 2).
    sessionSecret: env.SESSION_SECRET || '',
    sessionName: env.SESSION_NAME || 'lakegroup.sid',
    sessionTtlMs: Number(env.SESSION_TTL_MS) || DEFAULT_SESSION_TTL_MS,
    // Idle expiry (Phase 3): rolling sessions re-set the cookie on activity,
    // so sessionTtlMs becomes an inactivity timeout rather than a fixed
    // lifetime. Secure by default.
    sessionRolling: env.SESSION_ROLLING ? env.SESSION_ROLLING === 'true' : true,
    // SECURITY_ROADMAP Phase 8 — CSRF: extra origins allowed to send
    // state-changing requests to /admin and /auth (the static admin UI
    // lives on another origin in dev/test/prod). Same-host is always
    // allowed. Comma-separated, e.g. "http://127.0.0.1:8796,https://cms.example.com".
    csrfAllowedOrigins: (env.CSRF_ALLOWED_ORIGINS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    recentAuthWindowMs: Number(env.RECENT_AUTH_WINDOW_MS) || DEFAULT_RECENT_AUTH_WINDOW_MS,
    bcryptCost: Number(env.BCRYPT_COST) || DEFAULT_BCRYPT_COST,
    // Metrics (Phase 3): flags metrics not re-verified within this window.
    metricStaleDays: Number(env.METRIC_STALE_DAYS) || DEFAULT_METRIC_STALE_DAYS,
    // Secure cookies in production (HTTPS); override explicitly if needed.
    cookieSecure: env.SESSION_COOKIE_SECURE
      ? env.SESSION_COOKIE_SECURE === 'true'
      : appEnv === 'production',
    // 1 when the server sits behind a reverse proxy (nginx/caddy) so
    // client IPs are read from X-Forwarded-For (rate limiting + audit).
    trustProxy: Number(env.TRUST_PROXY) || 0,
  };
}

export const config = resolveConfig(process.env);

/**
 * SECURITY_ROADMAP Phase 1 — production fail-fast boot check. An insecure
 * configuration must refuse to start rather than serve traffic on defaults
 * (deny-by-default; secure-by-default). Returns a list of problems (empty =
 * safe to boot); `src/index.js` exits non-zero when it's non-empty.
 */
export function productionConfigProblems(cfg = config) {
  const problems = [];
  if (!cfg.isProduction) return problems;
  if (!cfg.databaseUrl) problems.push('DATABASE_URL is required in production');
  if (!cfg.sessionSecret || cfg.sessionSecret.length < 32) {
    problems.push('SESSION_SECRET must be set to a strong value (>= 32 chars) in production');
  }
  if (cfg.cookieSecure !== true) {
    problems.push('SESSION_COOKIE_SECURE must be true in production (HTTPS)');
  }
  return problems;
}
