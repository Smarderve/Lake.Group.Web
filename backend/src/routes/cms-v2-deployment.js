import { timingSafeEqual } from 'node:crypto';
import { Router } from 'express';

function authorized(header, expected) {
  if (!expected || typeof header !== 'string' || !header.startsWith('Bearer ')) return false;
  const provided = Buffer.from(header.slice(7)); const wanted = Buffer.from(expected);
  return provided.length === wanted.length && timingSafeEqual(provided, wanted);
}

export function cmsV2DeploymentRouter({ service, token }) {
  const router = Router();
  router.get('/', async (req, res, next) => {
    if (!authorized(req.get('authorization'), token)) return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Deployment credentials are required.' } });
    try { res.set('Cache-Control', 'no-store').json(await service.readDeploymentBundle()); }
    catch (error) { if (error?.code === 'ENOENT') return res.status(404).json({ error: { code: 'CMS_V2_RELEASE_NOT_FOUND', message: 'No CMS V2 release exists yet.' } }); next(error); }
  });
  return router;
}
