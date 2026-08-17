import session from 'express-session';
import { createApp } from '../src/app.js';
import { createLogger } from '../src/logger.js';

export const silentLogger = createLogger('silent');

/**
 * Hash a test password with bcrypt (fast cost from vitest env).
 */
export async function makeUser({ email, password, role = 'VIEWER', active = true, mfaEnabled = false, mfaSecret = null, id }) {
  const bcrypt = await import('bcrypt');
  const passwordHash = await bcrypt.hash(password, Number(process.env.BCRYPT_COST) || 4);
  return {
    id: id || `u_${email.replace(/[^a-z0-9]/gi, '')}`,
    email,
    passwordHash,
    role,
    active,
    mfaEnabled,
    mfaSecret,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };
}

/**
 * Tiny matcher for the subset of Prisma `where` clauses the code uses:
 * equality, OR, not, date comparisons (lt/lte/gt), contains, null checks.
 */
function matches(record, where) {
  if (!where) return true;
  return Object.entries(where).every(([field, cond]) => {
    if (field === 'OR') return cond.some((sub) => matches(record, sub));
    if (cond && typeof cond === 'object') {
      if ('not' in cond) return record[field] !== cond.not;
      if ('in' in cond) return cond.in.includes(record[field]);
      if ('lt' in cond) return new Date(record[field]) < new Date(cond.lt);
      if ('lte' in cond) return new Date(record[field]) <= new Date(cond.lte);
      if ('gte' in cond) return new Date(record[field]) >= new Date(cond.gte);
      if ('gt' in cond) return new Date(record[field]) > new Date(cond.gt);
      if ('contains' in cond) return String(record[field] ?? '').includes(cond.contains);
      return record[field] === cond;
    }
    return record[field] === cond;
  });
}

function orderByFn(orderBy) {
  // Prisma accepts a single clause or an array of clauses.
  const clauses = Array.isArray(orderBy) ? orderBy : [orderBy];
  return (a, b) => {
    for (const clause of clauses) {
      for (const [field, dir] of Object.entries(clause ?? {})) {
        const av = a[field];
        const bv = b[field];
        const cmp = av < bv ? -1 : av > bv ? 1 : 0;
        if (cmp !== 0) return dir === 'desc' ? -cmp : cmp;
      }
    }
    return 0;
  };
}

/**
 * Generic in-memory delegate for a plain row collection (registry/CMS
 * entities, their version tables, and child tables) — findFirst/findMany/
 * findUnique/create/update/delete with the same `matches`/`orderByFn`
 * helpers used elsewhere. `withStatus: false` for non-governed children
 * (Milestone, LeadershipEvent, Media) that have no status column.
 */
function makeRowsDelegate(rows, { uniqueField = null, withStatus = true, defaults = {} } = {}) {
  return {
    findFirst: async ({ where, orderBy } = {}) =>
      rows.filter((r) => matches(r, where)).sort(orderByFn(orderBy))[0] ?? null,
    findMany: async ({ where, orderBy, take, skip } = {}) => {
      let out = rows.filter((r) => matches(r, where)).sort(orderByFn(orderBy));
      if (skip) out = out.slice(skip);
      if (take) out = out.slice(0, take);
      return out;
    },
    findUnique: async ({ where }) => rows.find((r) => r[uniqueField] === where[uniqueField]) ?? null,
    // Phase 23 — the paginated unanswered-questions admin read uses count().
    count: async ({ where } = {}) => rows.filter((r) => matches(r, where)).length,
    create: async ({ data }) => {
      // Apply the schema defaults the real Prisma client would set.
      const row = {
        id: `r_${rows.length + 1}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...(withStatus ? { status: 'DRAFT' } : {}),
        ...defaults,
        ...data,
      };
      rows.push(row);
      return { ...row };
    },
    update: async ({ where, data }) => {
      const target = rows.find((r) => r.id === where.id);
      if (!target) throw new Error('Record not found');
      Object.assign(target, data, { updatedAt: new Date() });
      return { ...target };
    },
    delete: async ({ where }) => {
      const idx = rows.findIndex((r) => r.id === where.id);
      if (idx === -1) throw new Error('Record not found');
      const [removed] = rows.splice(idx, 1);
      return { ...removed };
    },
  };
}

/** In-memory join-table delegate (PageContentBlock, HistoryEventCompany). */
function makeJoinDelegate(rows) {
  return {
    create: async ({ data }) => {
      const row = { id: `j_${rows.length + 1}`, ...data };
      rows.push(row);
      return { ...row };
    },
    findMany: async ({ where, orderBy } = {}) =>
      rows.filter((r) => matches(r, where)).sort(orderByFn(orderBy)),
    findFirst: async ({ where, orderBy } = {}) =>
      rows.filter((r) => matches(r, where)).sort(orderByFn(orderBy))[0] ?? null,
    deleteMany: async ({ where } = {}) => {
      const before = rows.length;
      for (let i = rows.length - 1; i >= 0; i -= 1) {
        if (matches(rows[i], where)) rows.splice(i, 1);
      }
      return { count: before - rows.length };
    },
  };
}

/**
 * In-memory stand-in for the Prisma client — implements exactly the
 * methods the routes use (user.*, auditLog.create, metric.*,
 * metricVersion.*, the 8 registry entities + their version tables,
 * $queryRaw) so the auth/RBAC/MFA/metrics/registry logic can be tested
 * without a live PostgreSQL.
 */
export function createFakeDb(users = []) {
  const byEmail = new Map(users.map((u) => [u.email, { ...u }]));
  const byId = new Map(users.map((u) => [u.id, { ...u }]));
  const auditRows = [];
  const metrics = [];
  const versions = [];

  // Phase 4 registry collections: entity name → { rows, uniqueField }
  const registry = {
    country: { uniqueField: 'isoCode' },
    region: { uniqueField: 'name' },
    location: {},
    facility: {},
    category: { uniqueField: 'name' },
    company: { uniqueField: 'slug' },
    productService: {},
    companyRelationship: {},
  };

  // Phase 5 CMS core collections (9 governed entities) + children (no
  // status) + join tables.
  const cms = {
    contentBlock: { uniqueField: 'key' },
    page: { uniqueField: 'slug' },
    news: { uniqueField: 'slug' },
    project: {},
    leadership: { defaults: { currentStatus: 'ACTIVE' } },
    contact: {},
    historyEvent: {},
    careerListing: {},
    cSREntry: {}, // Prisma delegate name for model CSREntry
  };
  const cmsDefaults = (name) => cms[name]?.defaults ?? {};
  // Phase 6: media becomes a governed entity; map categories are governed too.
  cms.media = { defaults: { uploadedBy: null } };
  cms.mapCategory = { uniqueField: 'slug' };
  const cmsChildren = ['milestone', 'leadershipEvent', 'mediaFolder'];
  const joins = {
    pageContentBlock: makeJoinDelegate([]),
    historyEventCompany: makeJoinDelegate([]),
    mediaUsage: makeJoinDelegate([]), // needs deleteMany (rewritten on edit)
  };
  // Phase 7 — governance: publish schedules, publication events, notifications.
  const p7 = {
    publishSchedule: makeRowsDelegate([], { withStatus: false, defaults: { status: 'PENDING' } }),
    publicationEvent: makeRowsDelegate([], { withStatus: false }),
    notification: makeRowsDelegate([], { withStatus: false, defaults: { read: false } }),
  };

  // Phase 9 — AI knowledge: unanswered-question tracking (no status column).
  const p9 = {
    unansweredQuestion: makeRowsDelegate([], { withStatus: false, defaults: { language: 'en', answered: false } }),
  };

  // Phase 10 — analytics: event capture (no status column).
  const p10 = {
    analyticsEvent: makeRowsDelegate([], { withStatus: false }),
  };

  const withOwner = (row) => {
    if (!row) return null;
    const owner = row.ownerId ? byId.get(row.ownerId) : null;
    return { ...row, owner: owner ? { email: owner.email } : null };
  };

  const db = {
    auditRows,
    $queryRaw: async () => {},
    metric: {
      findFirst: async ({ where } = {}) => withOwner(metrics.find((m) => matches(m, where)) ?? null),
      findMany: async ({ where, orderBy } = {}) =>
        metrics.filter((m) => matches(m, where)).sort(orderByFn(orderBy)).map(withOwner),
      findUnique: async ({ where }) => metrics.find((m) => m.key === where.key) ?? null,
      create: async ({ data }) => {
        const row = { id: `m_${metrics.length + 1}`, createdAt: new Date(), updatedAt: new Date(), ...data };
        metrics.push(row);
        return row;
      },
      update: async ({ where, data }) => {
        const target = metrics.find((m) => m.id === where.id);
        if (!target) throw new Error('Metric not found');
        Object.assign(target, data, { updatedAt: new Date() });
        return { ...target };
      },
    },
    metricVersion: {
      create: async ({ data }) => {
        const row = { id: `mv_${versions.length + 1}`, createdAt: new Date(), ...data };
        versions.push(row);
        return row;
      },
      findMany: async ({ where, orderBy } = {}) =>
        versions.filter((v) => matches(v, where)).sort(orderByFn(orderBy)),
      findFirst: async ({ where, orderBy } = {}) =>
        versions.filter((v) => matches(v, where)).sort(orderByFn(orderBy))[0] ?? null,
    },
    // Phase 4 registry entities + their version tables.
    ...Object.fromEntries(
      Object.entries(registry).map(([name, { uniqueField }]) => [name, makeRowsDelegate([], { uniqueField })]),
    ),
    ...Object.fromEntries(
      Object.entries(registry).map(([name]) => [
        `${name}Version`,
        makeRowsDelegate([]),
      ]),
    ),
    // Phase 5 CMS governed entities + their version tables.
    ...Object.fromEntries(
      Object.entries(cms).map(([name, { uniqueField }]) => [name, makeRowsDelegate([], { uniqueField, defaults: cmsDefaults(name) })]),
    ),
    ...Object.fromEntries(
      Object.entries(cms).map(([name]) => [
        `${name}Version`,
        makeRowsDelegate([]),
      ]),
    ),
    // Phase 5 children + media (no governed status) and join tables.
    ...Object.fromEntries(cmsChildren.map((name) => [name, makeRowsDelegate([], { withStatus: false })])),
    ...joins,
    ...p7,
    ...p9,
    ...p10,
    user: {
      findUnique: async ({ where }) => {
        if (where.email) return byEmail.get(where.email) ?? null;
        if (where.id) return [...byEmail.values()].find((u) => u.id === where.id) ?? null;
        return null;
      },
      findMany: async () => [...byEmail.values()],
      // Phase 23 — the admin role-change guard counts remaining SUPER_ADMINs
      // (last-admin lockout check); support the Prisma count interface.
      count: async ({ where } = {}) => [...byEmail.values()].filter((u) => matches(u, where)).length,
      update: async ({ where, data }) => {
        const target = [...byEmail.values()].find((u) => u.id === where.id || u.email === where.email);
        if (!target) throw new Error('User not found');
        const next = { ...target, ...data, updatedAt: new Date() };
        byEmail.set(target.email, next);
        return next;
      },
      upsert: async ({ where, update, create }) => {
        const existing = byEmail.get(where.email);
        if (existing) {
          const next = { ...existing, ...update, updatedAt: new Date() };
          byEmail.set(where.email, next);
          return next;
        }
        const next = { id: `u_${Math.random().toString(36).slice(2)}`, createdAt: new Date(), updatedAt: new Date(), ...create };
        byEmail.set(next.email, next);
        return next;
      },
    },
    auditLog: {
      create: async ({ data }) => {
        const row = { id: `a_${auditRows.length + 1}`, createdAt: new Date(), ...data };
        auditRows.push(row);
        return row;
      },
      // SECURITY_ROADMAP Phase 19 — the admin audit-log review surface
      // (GET /admin/audit-log) reads the trail; support findMany + count.
      findMany: async ({ where, orderBy, take, skip } = {}) => {
        let out = auditRows.filter((r) => matches(r, where)).sort(orderByFn(orderBy));
        if (skip) out = out.slice(skip);
        if (take) out = out.slice(0, take);
        return out.map((r) => ({ ...r }));
      },
      count: async ({ where } = {}) => auditRows.filter((r) => matches(r, where)).length,
    },
  };
  return db;
}

/**
 * In-memory session store matching express-session's store interface,
 * plus revokeAllForUser (mirrors the connect-pg-simple setup).
 *
 * Extends express-session's base Store so regenerate / createSession / the
 * EventEmitter `on` (which express-session 1.19 calls unconditionally) all
 * behave exactly like the real connect-pg-simple store.
 */
export function createFakeSessionStore() {
  const sessions = new Map();
  const store = new session.Store();
  store.sessions = sessions;
  store.revokedFor = [];
  store.get = (sid, cb) => cb(null, sessions.get(sid) ?? null);
  store.set = (sid, sess, cb) => {
    sessions.set(sid, sess);
    if (cb) cb(null);
  };
  store.destroy = (sid, cb) => {
    sessions.delete(sid);
    if (cb) cb(null);
  };
  store.touch = (sid, sess, cb) => {
    sessions.set(sid, sess);
    if (cb) cb(null);
  };
  store.revokeAllForUser = async (userId) => {
    let count = 0;
    for (const [sid, sess] of [...sessions.entries()]) {
      if (sess?.userId === userId) {
        sessions.delete(sid);
        count += 1;
      }
    }
    store.revokedFor.push({ userId, count });
    return count;
  };
  store.revokeAllForUserExcept = async (userId, keepSid) => {
    let count = 0;
    for (const [sid, sess] of [...sessions.entries()]) {
      if (sess?.userId === userId && sid !== keepSid) {
        sessions.delete(sid);
        count += 1;
      }
    }
    store.revokedFor.push({ userId, count, keepSid });
    return count;
  };
  store.listSessionsForUser = async (userId) => {
    const rows = [];
    for (const [sid, sess] of [...sessions.entries()]) {
      if (sess?.userId === userId) {
        rows.push({
          sid,
          ip: sess?.device?.ip ?? null,
          userAgent: sess?.device?.userAgent ?? null,
          since: sess?.device?.since ?? null,
          expire: null,
        });
      }
    }
    return rows;
  };
  store.revokeSession = async (userId, sid) => {
    const sess = sessions.get(sid);
    if (sess?.userId !== userId) return 0;
    sessions.delete(sid);
    store.revokedFor.push({ userId, sid });
    return 1;
  };
  return store;
}

export function makeApp({ users = [], db, sessionStore, options = {} } = {}) {
  const fakeDb = db || createFakeDb(users);
  const store = sessionStore || createFakeSessionStore();
  const app = createApp({
    logger: silentLogger,
    db: fakeDb,
    sessionSecret: 'test-secret',
    sessionStore: store,
    cookieSecure: false,
    trustProxy: 0,
    sessionName: 'lakegroup.sid',
    ...options,
  });
  return { app, db: fakeDb, store };
}
