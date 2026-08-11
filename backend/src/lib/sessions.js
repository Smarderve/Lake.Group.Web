/**
 * Session helpers.
 *
 * Sessions live in PostgreSQL (connect-pg-simple `session` table, created
 * automatically by the store). The session JSON carries the authenticated
 * `userId`, which is how we can revoke every session for one account.
 */

/**
 * Attach `revokeAllForUser` to a connect-pg-simple store instance so any
 * code with the store can kill every session for a user (compromised
 * account / password reset / role demotion).
 */
export function enableSessionRevocation(store, pool) {
  store.revokeAllForUser = async function revokeAllForUser(userId) {
    if (!pool) return 0;
    const result = await pool.query(
      `DELETE FROM "session" WHERE sess::jsonb ->> 'userId' = $1`,
      [userId],
    );
    return result.rowCount ?? 0;
  };
  // Self-service password change keeps the current session alive while
  // killing every other one (attacker-held sessions must die).
  store.revokeAllForUserExcept = async function revokeAllForUserExcept(userId, keepSid) {
    if (!pool) return 0;
    const result = await pool.query(
      `DELETE FROM "session" WHERE sess::jsonb ->> 'userId' = $1 AND sid <> $2`,
      [userId, keepSid],
    );
    return result.rowCount ?? 0;
  };
  // SECURITY_ROADMAP Phase 3 — active-session visibility: every session for a
  // user, with the device metadata captured at login (ip / user-agent) and
  // the store-side expiry, newest first.
  store.listSessionsForUser = async function listSessionsForUser(userId) {
    if (!pool) return [];
    const result = await pool.query(
      `SELECT sid, sess, expire FROM "session" WHERE sess::jsonb ->> 'userId' = $1 ORDER BY expire DESC`,
      [userId],
    );
    return result.rows.map((r) => {
      const sess = typeof r.sess === 'string' ? JSON.parse(r.sess) : r.sess;
      return {
        sid: r.sid,
        ip: sess?.device?.ip ?? null,
        userAgent: sess?.device?.userAgent ?? null,
        since: sess?.device?.since ?? null,
        expire: r.expire,
      };
    });
  };
  // Per-session revocation with an ownership check — a user can only ever
  // kill one of their own sessions (sid + userId both constrained).
  store.revokeSession = async function revokeSession(userId, sid) {
    if (!pool) return 0;
    const result = await pool.query(
      `DELETE FROM "session" WHERE sid = $1 AND sess::jsonb ->> 'userId' = $2`,
      [sid, userId],
    );
    return result.rowCount ?? 0;
  };
  return store;
}
