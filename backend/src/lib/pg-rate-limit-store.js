/**
 * PostgreSQL-backed express-rate-limit store (v8 Store interface).
 *
 * Replaces the default in-memory MemoryStore for the credential limiters so
 * the 24h login budget survives backend restarts and is shared by every
 * backend instance pointing at the same database.
 *
 * The table is migration-owned (0013) — the runtime role has no DDL rights,
 * mirroring the `session` table pattern. This store only issues DML, and the
 * pool is injected so callers control lifecycle (same pattern as the
 * session store in db.js).
 *
 * Semantics match express-rate-limit's MemoryStore:
 *   - fixed window per key starting at the first hit: reset_at = now + windowMs
 *   - once reset_at passes, the next increment starts a fresh window (hits = 1)
 *   - decrement (skipSuccessfulRequests) clamps at 0 and never extends the
 *     window; express-rate-limit itself skips the decrement once resetTime
 *     has passed, so a stale row can never go negative from the middleware.
 *
 * The ON CONFLICT upsert serializes concurrent increments on the same key
 * (row lock), so the count cannot be lost to a race.
 */
export function createPgRateLimitStore({ pool, windowMs, prefix = 'rl', tableName = 'rate_limit' }) {
  const keyOf = (key) => `${prefix}:${key}`;
  const interval = `${Math.max(1, Math.round(windowMs / 1000))} seconds`;

  return {
    // Express-rate-limit v8 requires increment/decrement/resetKey.
    // `localKeys` stays falsy: a DB store's keys affect other instances.

    /** Increments the counter, resetting to 1 once the window has expired. */
    async increment(key) {
      const { rows } = await pool.query(
        `INSERT INTO "${tableName}" ("key", "hits", "reset_at", "updated_at")
         VALUES ($1, 1, now() + $2::interval, now())
         ON CONFLICT ("key") DO UPDATE SET
           "hits" = CASE WHEN "${tableName}".reset_at <= now() THEN 1 ELSE "${tableName}".hits + 1 END,
           "reset_at" = CASE WHEN "${tableName}".reset_at <= now() THEN now() + $2::interval ELSE "${tableName}".reset_at END,
           "updated_at" = now()
         RETURNING "hits", "reset_at"`,
        [keyOf(key), interval],
      );
      return { totalHits: rows[0].hits, resetTime: rows[0].reset_at };
    },

    /** Counts a successful request back out (skipSuccessfulRequests). */
    async decrement(key) {
      await pool.query(
        `UPDATE "${tableName}" SET "hits" = GREATEST("hits" - 1, 0), "updated_at" = now() WHERE "key" = $1`,
        [keyOf(key)],
      );
    },

    /** Drops a key's counter entirely (admin reset, tests, cleanup). */
    async resetKey(key) {
      await pool.query(`DELETE FROM "${tableName}" WHERE "key" = $1`, [keyOf(key)]);
    },

    /** Reads the current counter without mutating it. */
    async get(key) {
      const { rows } = await pool.query(
        `SELECT "hits", "reset_at" FROM "${tableName}" WHERE "key" = $1`,
        [keyOf(key)],
      );
      if (!rows[0]) return undefined;
      return { totalHits: rows[0].hits, resetTime: rows[0].reset_at };
    },
  };
}
