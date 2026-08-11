import { Router } from 'express';
import { requireAuth, requireRole, requireRecentAuth } from '../middleware/auth.js';
import { writeAudit } from '../lib/audit.js';
import { mediaFolderCreateSchema, mediaFolderUpdateSchema } from '../validators/map-media.js';
import { validationErrorBody } from '../validators/registry.js';

// MediaFolder (Phase 6) — organizational structure for the media library.
// NOT a governed entity (folders organize media, they are never published):
// simple audited CRUD, slug immutable, nested via parentId.
export function mediaFolderRouter({ db, recentAuthWindowMs }) {
  const router = Router();
  const auth = requireAuth(db);
  const recent = requireRecentAuth(recentAuthWindowMs);
  const editor = requireRole('EDITOR', 'SUPER_ADMIN');

  const recordAudit = async (req, action, folder) => {
    await writeAudit(db, {
      actorId: req.user?.id ?? null,
      action: `MEDIA_FOLDER_${action}`,
      resource: `admin/media-folders/${folder.id}`,
      ip: req.ip ?? null,
      metadata: { folderId: folder.id, name: folder.name },
    }, req.log);
  };

  router.get('/', auth, async (req, res, next) => {
    try {
      const rows = await db.mediaFolder.findMany({ orderBy: { sortOrder: 'asc' } });
      res.json({ mediaFolders: rows });
    } catch (err) {
      next(err);
    }
  });

  router.post('/', auth, editor, recent, async (req, res, next) => {
    try {
      const parsed = mediaFolderCreateSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json(validationErrorBody(parsed.error.issues));
      const row = await db.mediaFolder.create({ data: parsed.data });
      await recordAudit(req, 'CREATED', row);
      res.status(201).json({ mediaFolder: row });
    } catch (err) {
      next(err);
    }
  });

  router.patch('/:id', auth, editor, recent, async (req, res, next) => {
    try {
      const parsed = mediaFolderUpdateSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json(validationErrorBody(parsed.error.issues));
      const existing = await db.mediaFolder.findFirst({ where: { id: req.params.id } });
      if (!existing) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Media folder not found' } });
      }
      const row = await db.mediaFolder.update({ where: { id: existing.id }, data: parsed.data });
      await recordAudit(req, 'UPDATED', row);
      res.json({ mediaFolder: row });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
