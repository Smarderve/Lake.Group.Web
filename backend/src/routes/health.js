import { Router } from 'express';

/**
 * GET /health — liveness + database connectivity (Task 1.7).
 *
 * 200 { status: "ok", db: "up", ... }        database reachable
 * 503 { status: "degraded", db: "down", ... } database unreachable/unconfigured
 *
 * The `db` dependency is injected so tests can stub it.
 */
export function healthRouter({ db } = {}) {
  const router = Router();

  router.get('/', async (req, res) => {
    try {
      if (!db) throw new Error('DATABASE_URL not configured');
      await db.$queryRaw`SELECT 1`;
      res.status(200).json({
        status: 'ok',
        service: 'lake-group-backend',
        db: 'up',
        uptimeSeconds: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      req.log?.error?.({ err }, 'health check failed: database unreachable');
      res.status(503).json({
        status: 'degraded',
        service: 'lake-group-backend',
        db: 'down',
        error: db ? 'database unreachable' : 'database unreachable (DATABASE_URL not set)',
        timestamp: new Date().toISOString(),
      });
    }
  });

  return router;
}
