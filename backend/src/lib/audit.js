/**
 * Audit log writer (Task 2.8).
 *
 * Every entry's `actorId`, `action`, `resource` and `ip` are set here from
 * server-side context — client-supplied values are never trusted. A failed
 * audit write must never break the request it is reporting on, so failures
 * are logged and swallowed.
 */
export async function writeAudit(db, { actorId = null, action, resource, ip = null, metadata = {} }, logger) {
  if (!db) return null;
  try {
    return await db.auditLog.create({
      data: { actorId, action, resource, ip, metadata },
    });
  } catch (err) {
    logger?.error?.({ err, action }, 'audit log write failed');
    return null;
  }
}
