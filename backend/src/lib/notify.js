/**
 * Phase 7 — in-app notifications (self-hosted; no email/SMS service).
 *
 * Written server-side by the governed workflow:
 *   submit  → every REVIEWER / SUPER_ADMIN except the actor
 *   approve / reject / publish / scheduled-publish → the submitter
 *
 * Read via GET /admin/notifications. A failed notification write must never
 * break the workflow action it reports on, so failures are logged + swallowed
 * (same discipline as the audit log).
 */

async function createNotification(db, { userId, type, message, entityType, entityId }) {
  if (!db || !userId) return null;
  try {
    return await db.notification.create({
      data: { userId, type, message, entityType: entityType ?? null, entityId: entityId ?? null, read: false },
    });
  } catch {
    return null;
  }
}

/** Notify specific users. */
export async function notifyUsers(db, { userIds, type, message, entityType, entityId }, logger) {
  for (const userId of userIds ?? []) {
    try {
      await createNotification(db, { userId, type, message, entityType, entityId });
    } catch (err) {
      logger?.error?.({ err }, 'notification write failed');
    }
  }
}

/**
 * Notify every user holding one of `roles`, excluding `excludeUserId`.
 * The user base is small, so a full fetch + JS filter keeps the fake DB and
 * real Prisma behavior identical.
 */
export async function notifyRole(db, { roles, type, message, entityType, entityId, excludeUserId }, logger) {
  if (!db) return;
  let users;
  try {
    users = await db.user.findMany({});
  } catch (err) {
    logger?.error?.({ err }, 'notification role lookup failed');
    return;
  }
  const targets = users
    .filter((u) => roles.includes(u.role) && u.id !== excludeUserId)
    .map((u) => u.id);
  await notifyUsers(db, { userIds: targets, type, message, entityType, entityId }, logger);
}

/** Notify one user (e.g. the submitter of an approved/rejected item). */
export async function notifyUser(db, userId, { type, message, entityType, entityId }, logger) {
  if (!userId) return;
  try {
    await createNotification(db, { userId, type, message, entityType, entityId });
  } catch (err) {
    logger?.error?.({ err }, 'notification write failed');
  }
}
