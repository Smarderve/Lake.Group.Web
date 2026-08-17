import crypto from 'node:crypto';
import { Router } from 'express';
import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp';
import { z } from 'zod';
import { requireAuth, requireRecentAuth, requireRole } from '../middleware/auth.js';
import { createGoverned, httpError } from '../lib/governed.js';
import { writeAudit } from '../lib/audit.js';
import { MAP_ENTITIES } from '../lib/map-config.js';

const ALLOWED = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/gif', 'gif'],
  ['application/pdf', 'pdf'],
]);

const fieldsSchema = z.object({
  reason: z.string().trim().min(1).max(500),
  altText: z.string().trim().max(300).optional(),
  caption: z.string().trim().max(500).optional(),
  copyright: z.string().trim().max(200).optional(),
  license: z.string().trim().max(200).optional(),
  folderId: z.string().uuid().optional(),
  tags: z.string().max(500).optional(),
});

function uploadMiddleware(maxBytes) {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxBytes, files: 1, fields: 10, fieldSize: 2_000 },
  }).single('file');
  return (req, res, next) => upload(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(httpError(413, 'PAYLOAD_TOO_LARGE', `File exceeds the ${maxBytes}-byte upload limit`));
    }
    return next(httpError(400, 'INVALID_MULTIPART', 'Invalid multipart upload'));
  });
}

async function inspectFile(file) {
  if (!file) throw httpError(400, 'FILE_REQUIRED', 'A file is required');
  const detected = await fileTypeFromBuffer(file.buffer);
  if (!detected || !ALLOWED.has(detected.mime)) {
    throw httpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Only JPEG, PNG, WebP, GIF, and PDF files are supported');
  }
  if (file.mimetype !== 'application/octet-stream' && file.mimetype !== detected.mime) {
    throw httpError(415, 'MIME_MISMATCH', 'Declared file type does not match the uploaded bytes');
  }
  let width = null;
  let height = null;
  if (detected.mime.startsWith('image/')) {
    const metadata = await sharp(file.buffer, { animated: false }).metadata();
    width = metadata.width ?? null;
    height = metadata.height ?? null;
  }
  return { mimeType: detected.mime, extension: ALLOWED.get(detected.mime), width, height };
}

function parseTags(value) {
  if (!value) return null;
  const tags = [...new Set(value.split(',').map((tag) => tag.trim()).filter(Boolean))].slice(0, 30);
  return tags.length ? tags : null;
}

export function mediaUploadRouter({ db, storage, maxBytes = 10 * 1024 * 1024, recentAuthWindowMs }) {
  const router = Router();
  const auth = requireAuth(db);
  const upload = uploadMiddleware(maxBytes);

  router.post(
    '/uploads',
    auth,
    requireRole('EDITOR', 'REVIEWER', 'SUPER_ADMIN'),
    upload,
    async (req, res, next) => {
      let stored = null;
      try {
        if (!storage) throw httpError(503, 'STORAGE_UNAVAILABLE', 'Media storage is not configured');
        const parsed = fieldsSchema.safeParse(req.body);
        if (!parsed.success) throw httpError(400, 'VALIDATION_ERROR', 'Upload metadata is invalid');
        const inspected = await inspectFile(req.file);
        const now = new Date();
        const key = `media/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${crypto.randomUUID()}.${inspected.extension}`;
        stored = await storage.put({
          key,
          body: req.file.buffer,
          contentType: inspected.mimeType,
          ...(inspected.mimeType === 'application/pdf'
            ? { contentDisposition: `attachment; filename="${key.split('/').at(-1)}"` }
            : {}),
        });
        const data = {
          url: stored.url,
          altText: parsed.data.altText || null,
          caption: parsed.data.caption || null,
          mimeType: inspected.mimeType,
          sizeBytes: req.file.size,
          width: inspected.width,
          height: inspected.height,
          copyright: parsed.data.copyright || null,
          license: parsed.data.license || null,
          tags: parseTags(parsed.data.tags),
          folderId: parsed.data.folderId || null,
          uploadedBy: req.user.id,
          storageProvider: storage.provider,
          storageKey: stored.key,
        };
        const media = await createGoverned(
          db,
          { user: req.user, ip: req.ip, logger: req.log },
          MAP_ENTITIES.media,
          data,
          parsed.data.reason,
        );
        res.status(201).json({ media });
      } catch (err) {
        if (stored) await storage.delete(stored.key).catch(() => {});
        next(err);
      }
    },
  );

  router.delete(
    '/:id/upload',
    auth,
    requireRole('SUPER_ADMIN'),
    requireRecentAuth(recentAuthWindowMs),
    async (req, res, next) => {
      try {
        if (!storage) throw httpError(503, 'STORAGE_UNAVAILABLE', 'Media storage is not configured');
        const media = await db.media.findFirst({ where: { id: req.params.id } });
        if (!media) throw httpError(404, 'NOT_FOUND', 'Media item not found');
        if (media.status !== 'DRAFT') {
          throw httpError(409, 'INVALID_STATE', 'Only unused draft uploads can be deleted');
        }
        if (!media.storageKey || media.storageProvider !== storage.provider) {
          throw httpError(409, 'EXTERNAL_MEDIA', 'This media item is not managed by the configured storage provider');
        }
        const usages = await db.mediaUsage.findMany({ where: { mediaId: media.id } });
        if (usages.length) throw httpError(409, 'MEDIA_IN_USE', 'Remove every media usage before deleting this upload');
        await storage.delete(media.storageKey);
        await db.media.delete({ where: { id: media.id } });
        await writeAudit(db, {
          actorId: req.user.id,
          action: 'MEDIA_UPLOAD_DELETED',
          resource: `admin/media/${media.id}/upload`,
          ip: req.ip,
          metadata: { entityId: media.id, storageProvider: media.storageProvider, storageKey: media.storageKey },
        }, req.log);
        res.status(204).end();
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
