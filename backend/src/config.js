import 'dotenv/config';
import { isIP } from 'node:net';

// Central configuration. All values come from .env (see .env.example) —
// nothing is hardcoded, and no secret ever lives in source.

const DEFAULT_PORT = 4000;

// SECURITY_ROADMAP Phase 1 — environment separation. NODE_ENV is normalized
// to one of: development | testing | staging | production. Production turns
// off development endpoints and requires hardened defaults (secure cookies,
// HSTS, fail-fast boot checks in src/index.js).
const APP_ENVS = ['development', 'testing', 'staging', 'production'];
const CMS_ROLES = ['SUPER_ADMIN', 'EDITOR', 'REVIEWER', 'CONTACT_MANAGER', 'VIEWER'];

function commaSeparated(value) {
  return (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function isExactHttpsOrigin(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.origin === value && url.username === '' && url.password === '';
  } catch {
    return false;
  }
}

function finiteNumber(value, fallback) {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function is32ByteBase64(value) {
  try {
    const decoded = Buffer.from(String(value || ''), 'base64');
    return decoded.length === 32
      && decoded.toString('base64').replace(/=+$/, '') === String(value || '').replace(/=+$/, '');
  } catch {
    return false;
  }
}

function isIpOrCidr(value) {
  const slash = value.lastIndexOf('/');
  if (slash === -1) return isIP(value) !== 0;
  const address = value.slice(0, slash);
  const prefix = value.slice(slash + 1);
  const family = isIP(address);
  const maxPrefix = family === 4 ? 32 : family === 6 ? 128 : -1;
  return /^\d+$/.test(prefix) && Number(prefix) <= maxPrefix;
}

export function parseTrustProxy(value) {
  const raw = String(value ?? '').trim();
  if (!raw || raw === '0') return { value: 0, valid: true };
  if (raw === '1') return { value: 1, valid: true };
  const entries = raw.split(',').map((entry) => entry.trim()).filter(Boolean);
  if (!entries.length || !entries.every(isIpOrCidr)) return { value: 0, valid: false };
  return { value: entries.length === 1 ? entries[0] : entries, valid: true };
}

// Time windows / security defaults.
export const DEFAULT_SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours
export const DEFAULT_RECENT_AUTH_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
export const DEFAULT_BCRYPT_COST = 12;
export const DEFAULT_LOGIN_RATE_LIMIT = { windowMs: 24 * 60 * 60 * 1000, limit: 10 }; // 10 failed/24h per IP (successes never count) since MFA is mandatory
export const DEFAULT_MFA_RATE_LIMIT = { windowMs: 15 * 60 * 1000, limit: 5 };
export const DEFAULT_METRIC_STALE_DAYS = 180; // Phase 3 — stale-data window

/**
 * Compute the full configuration from an environment object. Pure and
 * deterministic — unit-testable without mutating process.env (Phase 1).
 */
export function resolveConfig(env) {
  const appEnv = APP_ENVS.includes(env.NODE_ENV) ? env.NODE_ENV : 'development';
  const trustProxy = parseTrustProxy(env.TRUST_PROXY);
  const configuredMfaRoles = commaSeparated(env.MFA_REQUIRED_ROLES);
  const mfaRequiredRoles = configuredMfaRoles.length
    ? configuredMfaRoles
    : (appEnv === 'production' ? CMS_ROLES : []);
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
    csrfAllowedOrigins: commaSeparated(env.CSRF_ALLOWED_ORIGINS),
    // Specification Phase 18 — exact origins that may read credentialed CMS
    // API responses. Kept separate from CSRF so each security boundary is
    // explicit and independently testable.
    cmsAllowedOrigins: commaSeparated(env.CMS_ALLOWED_ORIGINS),
    recentAuthWindowMs: Number(env.RECENT_AUTH_WINDOW_MS) || DEFAULT_RECENT_AUTH_WINDOW_MS,
    bcryptCost: Number(env.BCRYPT_COST) || DEFAULT_BCRYPT_COST,
    mfaRequiredRoles,
    mfaRequiredRolesValid: mfaRequiredRoles.every((role) => CMS_ROLES.includes(role)),
    mfaEncryptionKey: env.MFA_ENCRYPTION_KEY || '',
    // DEVELOPMENT-ONLY: comma-separated emails that skip the TOTP step at
    // login (the password is still required and verified). This exists so a
    // local demo account with MFA enrolled can be used without an
    // authenticator app. Setting it in production is a boot failure (see
    // productionConfigProblems) — it can never be accidentally enabled
    // against real users.
    devMfaSkipEmails: commaSeparated(env.DEV_MFA_SKIP_EMAILS),
    // Metrics (Phase 3): flags metrics not re-verified within this window.
    metricStaleDays: Number(env.METRIC_STALE_DAYS) || DEFAULT_METRIC_STALE_DAYS,
    // Secure cookies in production (HTTPS); override explicitly if needed.
    cookieSecure: env.SESSION_COOKIE_SECURE
      ? env.SESSION_COOKIE_SECURE === 'true'
      : appEnv === 'production',
    // 0 for direct TLS, 1 for an ingress-only one-hop topology, or an exact
    // comma-separated IP/CIDR allowlist. Broad booleans and hop counts >1
    // are rejected because they make forwarding headers attacker-controlled.
    trustProxy: trustProxy.value,
    trustProxyValid: trustProxy.valid,
    backupEncryptionKey: env.BACKUP_ENCRYPTION_KEY || '',
    backupRetentionDays: finiteNumber(env.BACKUP_RETENTION_DAYS, 14),
    backupStoragePrefix: env.BACKUP_STORAGE_PREFIX || '',
    mediaStorageDriver: env.MEDIA_STORAGE_DRIVER || 'local',
    mediaStorageLocalDir: env.MEDIA_STORAGE_LOCAL_DIR || './uploads',
    mediaPublicBaseUrl: (env.MEDIA_PUBLIC_BASE_URL || '').replace(/\/+$/, ''),
    mediaUploadMaxBytes: finiteNumber(env.MEDIA_UPLOAD_MAX_BYTES, 10 * 1024 * 1024),
    s3Region: env.S3_REGION || '',
    s3Bucket: env.S3_BUCKET || '',
    s3Endpoint: env.S3_ENDPOINT || '',
    s3ForcePathStyle: env.S3_FORCE_PATH_STYLE === 'true',
    publicReleaseEnabled: env.PUBLIC_RELEASE_ENABLED === 'true',
    publicReleaseGithubRepository: env.PUBLIC_RELEASE_GITHUB_REPOSITORY || '',
    publicReleaseGithubToken: env.PUBLIC_RELEASE_GITHUB_TOKEN || '',
    publicReleaseApiBaseUrl: (env.PUBLIC_RELEASE_API_BASE_URL || '').replace(/\/+$/, ''),
    publicReleasePollMs: finiteNumber(env.PUBLIC_RELEASE_POLL_MS, 15_000),
    publicReleaseMaxAttempts: finiteNumber(env.PUBLIC_RELEASE_MAX_ATTEMPTS, 8),
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
  const cmsAllowedOrigins = cfg.cmsAllowedOrigins || [];
  const csrfAllowedOrigins = cfg.csrfAllowedOrigins || [];
  if (!cfg.databaseUrl) problems.push('DATABASE_URL is required in production');
  if (!cfg.databaseUrlRuntime || cfg.databaseUrlRuntime === cfg.databaseUrl) {
    problems.push('DATABASE_URL_RUNTIME must use a distinct least-privilege runtime role in production');
  }
  if (!cfg.sessionSecret || cfg.sessionSecret.length < 32) {
    problems.push('SESSION_SECRET must be set to a strong value (>= 32 chars) in production');
  }
  if (cfg.cookieSecure !== true) {
    problems.push('SESSION_COOKIE_SECURE must be true in production (HTTPS)');
  }
  const requiredMfaRoles = cfg.mfaRequiredRoles ?? CMS_ROLES;
  const mfaRequiredRolesValid = cfg.mfaRequiredRolesValid ?? true;
  if (
    mfaRequiredRolesValid !== true ||
    !CMS_ROLES.every((role) => requiredMfaRoles.includes(role))
  ) {
    problems.push('MFA_REQUIRED_ROLES must include every CMS role in production');
  }
  if (!is32ByteBase64(cfg.mfaEncryptionKey)) {
    problems.push('MFA_ENCRYPTION_KEY must contain exactly 32 base64-encoded bytes in production');
  }
  // DEV_MFA_SKIP_EMAILS is a development-only convenience. In production it
  // is a hard boot failure: silently honoring it would let a listed account
  // skip its second factor.
  if (cfg.devMfaSkipEmails?.length) {
    problems.push('DEV_MFA_SKIP_EMAILS must not be set in production — it disables the TOTP step for listed accounts');
  }
  if (cfg.trustProxyValid !== true) {
    problems.push('TRUST_PROXY must be 0, 1, or an explicit IP/CIDR allowlist in production');
  }
  if (!cmsAllowedOrigins.length) {
    problems.push('CMS_ALLOWED_ORIGINS must include at least one HTTPS origin in production');
  } else if (!cmsAllowedOrigins.every(isExactHttpsOrigin)) {
    problems.push('CMS_ALLOWED_ORIGINS entries must be valid HTTPS origins in production');
  }
  if (!cmsAllowedOrigins.every((origin) => csrfAllowedOrigins.includes(origin))) {
    problems.push('Every CMS_ALLOWED_ORIGINS entry must also appear in CSRF_ALLOWED_ORIGINS');
  }
  if (!cfg.backupEncryptionKey || cfg.backupEncryptionKey.length < 32) {
    problems.push('BACKUP_ENCRYPTION_KEY must be at least 32 characters in production');
  }
  if (!cfg.backupStoragePrefix) {
    problems.push('BACKUP_STORAGE_PREFIX is required for offsite production backups');
  }
  if (!Number.isInteger(cfg.backupRetentionDays) || cfg.backupRetentionDays < 1) {
    problems.push('BACKUP_RETENTION_DAYS must be a positive integer in production');
  }
  if (cfg.mediaStorageDriver !== 's3') {
    problems.push('MEDIA_STORAGE_DRIVER must be s3 in production');
  }
  if (!isExactHttpsOrigin(cfg.mediaPublicBaseUrl)) {
    problems.push('MEDIA_PUBLIC_BASE_URL must be an HTTPS origin in production');
  }
  if (!cfg.s3Region) problems.push('S3_REGION is required in production');
  if (!cfg.s3Bucket) problems.push('S3_BUCKET is required in production');
  if (!Number.isInteger(cfg.mediaUploadMaxBytes) || cfg.mediaUploadMaxBytes < 1 || cfg.mediaUploadMaxBytes > 50 * 1024 * 1024) {
    problems.push('MEDIA_UPLOAD_MAX_BYTES must be between 1 and 52428800 in production');
  }
  if (!cfg.publicReleaseEnabled) {
    problems.push('PUBLIC_RELEASE_ENABLED must be true in production');
  }
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(cfg.publicReleaseGithubRepository)) {
    problems.push('PUBLIC_RELEASE_GITHUB_REPOSITORY must be owner/repository in production');
  }
  if (!cfg.publicReleaseGithubToken || cfg.publicReleaseGithubToken.length < 40) {
    problems.push('PUBLIC_RELEASE_GITHUB_TOKEN must be configured securely in production');
  } else if (!/^(?:github_pat_[A-Za-z0-9_]{40,}|gh[pousr]_[A-Za-z0-9]{36,})$/.test(cfg.publicReleaseGithubToken)) {
    problems.push(
      'PUBLIC_RELEASE_GITHUB_TOKEN must be a supported fine-grained, classic, or GitHub App token',
    );
  }
  if (!isExactHttpsOrigin(cfg.publicReleaseApiBaseUrl)) {
    problems.push('PUBLIC_RELEASE_API_BASE_URL must be an HTTPS origin in production');
  }
  return problems;
}
