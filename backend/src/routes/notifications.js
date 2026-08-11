import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';

/**
 * Phase 7 — in-app notifications (self-hosted, no email/SMS).
 *
 *   GET  /admin/notifications        — my notifications, unread first
 *   POST /admin/notifications/:id/read — mark one read (owner only)
 *   POST /admin/notifications/read-all — mark all of mine read
 *
 * Rows are written server-side by the governed workflow (lib/notify.js):
 * submit → reviewers; approve/reject/publish → the submitter.
 */
export function notificationsRouter({ db }) {
  const router = Router();
  const auth = requireAuth(db);

  router.get('/', auth, async (req, res, next) => {
    try {
      const rows = await db.notification.findMany({
        where: { userId: req.user.id },
        orderBy: [{ read: 'asc' }, { createdAt: 'desc' }],
      });
      const unread = rows.filter((n) => !n.read).length;
      res.json({ notifications: rows, unreadCount: unread });
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/read', auth, async (req, res, next) => {
    try {
      const notification = await db.notification.findFirst({
        where: { id: req.params.id, userId: req.user.id },
      });
      if (!notification) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Notification not found' } });
      }
      const updated = await db.notification.update({ where: { id: notification.id }, data: { read: true } });
      res.json({ notification: updated });
    } catch (err) {
      next(err);
    }
  });

  router.post('/read-all', auth, async (req, res, next) => {
    try {
      const mine = await db.notification.findMany({ where: { userId: req.user.id, read: false } });
      for (const n of mine) {
        await db.notification.update({ where: { id: n.id }, data: { read: true } });
      }
      res.json({ markedRead: mine.length });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
