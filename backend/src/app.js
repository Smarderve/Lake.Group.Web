import express from 'express';
import session from 'express-session';
import { pinoHttp } from 'pino-http';
import { pinoHttpOptions } from './logger.js';
import { healthRouter } from './routes/health.js';
import { exampleRouter } from './routes/example.js';
import { authRouter } from './routes/auth.js';
import { adminRouter } from './routes/admin.js';
import { metricsRouter } from './routes/metrics.js';
import { governedRouter } from './routes/governed.js';
import { publicRouter } from './routes/public.js';
import { mediaUsageRouter } from './routes/media-usage.js';
import { mediaFolderRouter } from './routes/media-folders.js';
import { milestoneRouter, leadershipEventRouter } from './routes/children.js';
import { reviewQueueRouter } from './routes/review-queue.js';
import { publishSchedulesRouter } from './routes/publish-schedules.js';
import { notificationsRouter } from './routes/notifications.js';
import { REGISTRY_ENTITIES } from './lib/registry-config.js';
import { CMS_ENTITIES } from './lib/cms-config.js';
import { MAP_ENTITIES } from './lib/map-config.js';
import { notFoundHandler, errorHandler } from './middleware/error-handler.js';
import { loginRateLimiter, mfaRateLimiter, publicWriteLimiter as publicWriteLimiterFactory, adminRateLimiter as adminRateLimiterFactory } from './middleware/rate-limit.js';
import { securityHeaders } from './middleware/security-headers.js';
import { csrfGuard } from './middleware/csrf-guard.js';
import { DEFAULT_SESSION_TTL_MS, DEFAULT_RECENT_AUTH_WINDOW_MS } from './config.js';

/**
 * Express app factory.
 *
 * Dependencies (logger, db, session store/secret, ...) are injected so
 * tests can pass stubs and src/index.js wires the real ones.
 *
 * Session middleware is only mounted when a secret AND store are provided;
 * without them, auth endpoints safely reject everything (401).
 */
export function createApp({
  logger,
  db,
  sessionSecret,
  sessionStore,
  cookieSecure = false,
  trustProxy = 0,
  sessionName = 'lakegroup.sid',
  sessionTtlMs = DEFAULT_SESSION_TTL_MS,
  // Idle expiry (Phase 3): re-set the session cookie on activity so the TTL
  // acts as an inactivity timeout. Secure by default.
  sessionRolling = true,
  recentAuthWindowMs = DEFAULT_RECENT_AUTH_WINDOW_MS,
  loginLimiter = loginRateLimiter(),
  mfaLimiter = mfaRateLimiter(),
  publicWriteLimiter = publicWriteLimiterFactory(),
  // SECURITY_ROADMAP Phase 10 — throttle the authenticated surface
  // (admin + auth) per IP; generous so legit team use is never blocked.
  adminLimiter = adminRateLimiterFactory(),
  // SECURITY_ROADMAP Phase 8 — CSRF origin/site validation on the
  // cookie-authenticated surfaces (belt-and-suspenders over SameSite=Lax).
  csrfAllowedOrigins = [],
  // SECURITY_ROADMAP Phase 1 — dev endpoints never mount in production.
  devEndpointsEnabled = true,
} = {}) {
  const app = express();

  app.disable('x-powered-by');
  // Read real client IPs when behind a reverse proxy (rate limiting + audit).
  app.set('trust proxy', trustProxy);
  // Explicit body-size cap (SECURITY_ROADMAP Phase 5/10) — rejects oversized
  // payloads with 413 before any handler runs. Public write endpoints are
  // rate limited separately.
  app.use(express.json({ limit: '100kb' }));
  // Phase 11 — security headers on every response (HSTS only over HTTPS).
  app.use(securityHeaders({ hsts: cookieSecure }));

  if (logger) {
    // Phase 18 — header allowlist serializer: cookies/authorization are
    // NEVER logged (pino-http's default copied every header).
    app.use(pinoHttp(pinoHttpOptions(logger)));
  }

  if (sessionSecret && sessionStore) {
    app.use(
      session({
        name: sessionName,
        secret: sessionSecret,
        store: sessionStore,
        resave: false,
        saveUninitialized: false,
        rolling: sessionRolling,
        cookie: {
          httpOnly: true, // not readable from JS
          sameSite: 'lax', // CSRF mitigation for cookie-based sessions
          secure: cookieSecure, // HTTPS-only in production
          maxAge: sessionTtlMs,
        },
      }),
    );
  }

  app.use('/health', healthRouter({ db }));
  // Validation-pattern demo (Task 1.4) — development/testing/staging only.
  if (devEndpointsEnabled) {
    app.use('/example', exampleRouter());
  }
  // Phase 15 — X-Forwarded-* (host/proto) feed the Origin match ONLY when
  // a reverse proxy is configured; direct clients cannot spoof them.
  const csrf = csrfGuard({ allowedOrigins: csrfAllowedOrigins, trustProxy });
  app.use('/auth', csrf);
  app.use('/admin', csrf);
  app.use('/auth', adminLimiter);
  app.use('/admin', adminLimiter);
  app.use('/auth', authRouter({ db, loginLimiter, mfaLimiter, sessionName }));
  // /admin/* workflow routers mount before /admin so their routes win over
  // the generic admin router (Phases 3-4).
  app.use('/admin/metrics', metricsRouter({ db, recentAuthWindowMs }));
  for (const [route, config] of Object.entries(REGISTRY_ENTITIES)) {
    app.use(`/admin/${route}`, governedRouter({ db, config, recentAuthWindowMs }));
  }
  // Phase 5 — CMS core (same governed pattern, 9 more entities).
  for (const [route, config] of Object.entries(CMS_ENTITIES)) {
    app.use(`/admin/${route}`, governedRouter({ db, config, recentAuthWindowMs }));
  }
  // Phase 6 — map & media (2 more governed entities: media, map-categories).
  for (const [route, config] of Object.entries(MAP_ENTITIES)) {
    app.use(`/admin/${route}`, governedRouter({ db, config, recentAuthWindowMs }));
  }
  // Child timelines mount after their parent's governed router (deeper
  // paths, so no route shadowing): /admin/projects/:id/milestones and
  // /admin/leadership/:id/events.
  app.use('/admin/projects', milestoneRouter({ db, recentAuthWindowMs }));
  app.use('/admin/leadership', leadershipEventRouter({ db, recentAuthWindowMs }));
  // Media usage introspection (deeper path under the governed /admin/media)
  // and organizational folders (not governed).
  app.use('/admin/media', mediaUsageRouter({ db }));
  app.use('/admin/media-folders', mediaFolderRouter({ db, recentAuthWindowMs }));
  // Phase 7 — governance & publishing: review queue, schedules, notifications.
  app.use('/admin/review-queue', reviewQueueRouter({ db }));
  app.use('/admin/publish-schedules', publishSchedulesRouter({ db, recentAuthWindowMs }));
  app.use('/admin/notifications', notificationsRouter({ db }));
  app.use('/admin', adminRouter({ db, recentAuthWindowMs }));
  app.use('/api/public', publicRouter({ db }, publicWriteLimiter));

  app.use(notFoundHandler);
  app.use(errorHandler({ logger }));

  return app;
}
