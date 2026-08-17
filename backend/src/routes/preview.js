import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { findMetricByIdOrKey, publicMetric } from '../lib/metrics.js';
import { PUBLIC_ENTITIES, isPubliclyVisible, publicRow } from './public.js';

function notFound(res, message = 'Preview content not found') {
  return res.status(404).json({ error: { code: 'NOT_FOUND', message } });
}

function visibilityReason(route, row, publiclyVisible) {
  if (publiclyVisible) return 'Published and visible';
  if (row.status !== 'PUBLISHED') return `${row.status.replaceAll('_', ' ')} content is not public`;
  if (route === 'news' && row.publicationDate && new Date(row.publicationDate) > new Date()) {
    return 'Scheduled for future publication';
  }
  if (route === 'contacts' && row.publicDisplay !== true) return 'Not enabled for public display';
  if (route === 'career-listings' && row.listingStatus !== 'OPEN') return 'Career listing is closed';
  return 'Blocked by public visibility rules';
}

function publicPath(route, entry, row) {
  const identifier = entry.lookupField ? row[entry.lookupField] : row.id;
  return `/api/public/${route}/${encodeURIComponent(String(identifier))}`;
}

function governedPreview(route, entry, row) {
  const publiclyVisible = isPubliclyVisible(entry, row);
  return {
    route,
    entity: entry.model,
    status: row.status,
    publiclyVisible,
    visibilityReason: visibilityReason(route, row, publiclyVisible),
    publicPath: publicPath(route, entry, row),
    record: entry.format ? entry.format(row) : publicRow(row),
  };
}

/**
 * Authenticated content preview. This deliberately lives on `/admin`, never
 * the permissive public router: draft and review-state records require a live
 * CMS session, are marked private/no-store, and are returned in the exact
 * shape the public API will expose after publication.
 */
export function previewRouter({ db } = {}) {
  const router = Router();
  const auth = requireAuth(db);

  router.get('/:entity/:id', auth, async (req, res, next) => {
    try {
      const { entity: route, id } = req.params;
      res.set({
        'Cache-Control': 'private, no-store',
        'X-Robots-Tag': 'noindex, nofollow, noarchive',
      });

      if (route === 'metrics') {
        const metric = await findMetricByIdOrKey(db, id);
        if (!metric) return notFound(res, 'Metric not found');
        const publiclyVisible = metric.status === 'PUBLISHED';
        return res.json({
          preview: {
            route,
            entity: 'metric',
            status: metric.status,
            publiclyVisible,
            visibilityReason: visibilityReason(route, metric, publiclyVisible),
            publicPath: `/api/public/metrics/${encodeURIComponent(metric.key)}`,
            record: publicMetric(metric),
          },
        });
      }

      // Route lookup is constrained to the closed public-entity allowlist.
      // eslint-disable-next-line security/detect-object-injection
      const entry = PUBLIC_ENTITIES[route];
      if (!entry) return notFound(res, `Unknown preview entity: ${route}`);

      const row = await db[entry.model].findFirst({
        where: { id },
        include: entry.include,
      });
      if (!row) return notFound(res);

      return res.json({ preview: governedPreview(route, entry, row) });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
