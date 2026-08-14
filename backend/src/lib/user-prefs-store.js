import pg from 'pg';

/**
 * Per-user CMS preferences storage (Settings Center redesign).
 *
 * Backed by the migration-owned `user_preferences` table (0014) through a
 * small pg pool — same pattern as the persistent rate-limit store. The
 * runtime role only issues DML; the schema is migration-owned.
 */

export const PREF_DEFAULTS = Object.freeze({
  theme: 'system', // light | dark | system
  language: 'en', // CMS interface language (localization reserves sw/ar/fr/pt/es)
  timezone: 'UTC', // IANA zone name, e.g. "Africa/Nairobi"
  dateFormat: 'en-GB',
  numberFormat: 'en-US',
  compactMode: false,
  sidebarCollapsed: false,
  density: 'comfortable', // comfortable | compact
  notificationSettings: Object.freeze({}),
  dashboardSettings: Object.freeze({}),
  accessibilitySettings: Object.freeze({}),
});

/** camelCase field -> column name. */
const COLUMNS = {
  userId: 'user_id',
  theme: 'theme',
  language: 'language',
  timezone: 'timezone',
  dateFormat: 'date_format',
  numberFormat: 'number_format',
  compactMode: 'compact_mode',
  sidebarCollapsed: 'sidebar_collapsed',
  density: 'density',
  notificationSettings: 'notification_settings',
  dashboardSettings: 'dashboard_settings',
  accessibilitySettings: 'accessibility_settings',
};

function toRow(data) {
  const row = {};
  for (const [key, column] of Object.entries(COLUMNS)) {
    if (key in data) row[column] = data[key];
  }
  return row;
}

function fromRow(row) {
  if (!row) return null;
  const out = { userId: row.user_id };
  for (const [key, column] of Object.entries(COLUMNS)) {
    if (key !== 'userId' && row[column] !== undefined) out[key] = row[column];
  }
  return out;
}

/**
 * PostgreSQL-backed store. Returns null when there is no database URL so the
 * server can still boot; callers fall back to createMemoryPrefsStore().
 */
export function createUserPrefsStore(databaseUrl) {
  if (!databaseUrl) return null;
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 5 });

  async function get(userId) {
    const { rows } = await pool.query(
      'SELECT * FROM "user_preferences" WHERE "user_id" = $1',
      [userId],
    );
    return fromRow(rows[0]);
  }

  async function upsert(userId, data) {
    const row = toRow({ userId, ...data });
    const columns = Object.keys(row);
    const values = columns.map((col) => row[col]);
    const updateColumns = columns.filter((col) => col !== 'user_id');
    // With no update columns (e.g. a bare first-read insert), `ON CONFLICT ...
    // DO UPDATE SET , ...` would be invalid SQL — use DO NOTHING instead.
    const conflictClause =
      updateColumns.length === 0
        ? 'ON CONFLICT ("user_id") DO NOTHING'
        : `ON CONFLICT ("user_id") DO UPDATE SET ${updateColumns
            .map((col) => `"${col}" = EXCLUDED."${col}"`)
            .join(', ')}, "updated_at" = now()`;
    const { rows } = await pool.query(
      `INSERT INTO "user_preferences" ("${columns.join('", "')}") VALUES (${columns
        .map((_, i) => `$${i + 1}`)
        .join(', ')})
       ${conflictClause}
       RETURNING *`,
      values,
    );
    return fromRow(rows[0]);
  }

  return {
    get,
    upsert,
    async close() {
      await pool.end();
    },
  };
}

/**
 * In-memory store used when no database is configured (boot without DATABASE_URL)
 * and by tests. Same interface as the PostgreSQL store.
 */
export function createMemoryPrefsStore() {
  const rows = new Map();
  return {
    async get(userId) {
      const row = rows.get(userId);
      return row ? { ...row, notificationSettings: { ...row.notificationSettings }, dashboardSettings: { ...row.dashboardSettings }, accessibilitySettings: { ...row.accessibilitySettings } } : null;
    },
    async upsert(userId, data) {
      const existing = rows.get(userId) ?? { userId, ...PREF_DEFAULTS };
      const next = {
        ...existing,
        ...data,
        notificationSettings: { ...existing.notificationSettings, ...(data.notificationSettings ?? {}) },
        dashboardSettings: { ...existing.dashboardSettings, ...(data.dashboardSettings ?? {}) },
        accessibilitySettings: { ...existing.accessibilitySettings, ...(data.accessibilitySettings ?? {}) },
      };
      rows.set(userId, next);
      return this.get(userId);
    },
    async close() {},
  };
}
