import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createPgRateLimitStore } from '../src/lib/pg-rate-limit-store.js';
import { loginRateLimiter } from '../src/middleware/rate-limit.js';
import { makeApp } from './helpers.js';

/**
 * In-memory pg Pool stand-in that records every query and returns canned
 * rows, so the store's SQL contract and row mapping can be tested without
 * a live PostgreSQL (the suite's hermetic convention).
 */
function makeFakePool({ onQuery } = {}) {
  const calls = [];
  return {
    calls,
    async query(text, params) {
      calls.push({ text, params });
      if (onQuery) return onQuery(text, params);
      return { rows: [] };
    },
  };
}

describe('createPgRateLimitStore', () => {
  const NOW = new Date('2026-08-14T12:00:00.000Z');

  it('increments with a prefixed key and the limiter window as interval', async () => {
    const pool = makeFakePool({
      onQuery: (text, params) => {
        expect(text).toContain('INSERT INTO "rate_limit"');
        expect(text).toContain('ON CONFLICT');
        expect(params[0]).toBe('login:203.0.113.7');
        expect(params[1]).toBe('86400 seconds'); // 24h
        return { rows: [{ hits: 1, reset_at: NOW }] };
      },
    });
    const store = createPgRateLimitStore({ pool, windowMs: 24 * 60 * 60 * 1000, prefix: 'login' });
    const out = await store.increment('203.0.113.7');
    expect(out.totalHits).toBe(1);
    expect(out.resetTime).toBeInstanceOf(Date);
  });

  it('returns the row totalHits on later increments (window not expired)', async () => {
    const pool = makeFakePool({
      onQuery: () => ({ rows: [{ hits: 4, reset_at: NOW }] }),
    });
    const store = createPgRateLimitStore({ pool, windowMs: 24 * 60 * 60 * 1000, prefix: 'login' });
    const out = await store.increment('203.0.113.7');
    expect(out.totalHits).toBe(4);
  });

  it('writes the expiry-reset branches into the upsert (fresh window once reset_at passes)', async () => {
    // INSERT ... RETURNING always yields a row in Postgres.
    const pool = makeFakePool({ onQuery: () => ({ rows: [{ hits: 1, reset_at: NOW }] }) });
    const store = createPgRateLimitStore({ pool, windowMs: 24 * 60 * 60 * 1000, prefix: 'login' });
    await store.increment('203.0.113.7');
    const sql = pool.calls[0].text;
    // The CASE resets hits/reset_at when the window has passed, else bumps.
    expect(sql).toContain('CASE WHEN "rate_limit".reset_at <= now() THEN 1');
    expect(sql).toContain('ELSE "rate_limit".hits + 1');
    // Both the insert and the reset branch extend the window by $2::interval.
    expect(sql.match(/now\(\) \+ \$2::interval/g)?.length).toBe(2);
  });

  it('decrements with a floor of zero (skipSuccessfulRequests)', async () => {
    const pool = makeFakePool({
      onQuery: (text, params) => {
        expect(text).toContain('UPDATE "rate_limit"');
        expect(text).toContain('GREATEST("hits" - 1, 0)');
        expect(params[0]).toBe('login:203.0.113.7');
        return { rows: [] };
      },
    });
    const store = createPgRateLimitStore({ pool, windowMs: 24 * 60 * 60 * 1000, prefix: 'login' });
    await expect(store.decrement('203.0.113.7')).resolves.toBeUndefined();
  });

  it('resetKey deletes the prefixed key', async () => {
    const pool = makeFakePool({
      onQuery: (text, params) => {
        expect(text).toContain('DELETE FROM "rate_limit"');
        expect(params[0]).toBe('login:203.0.113.7');
        return { rows: [] };
      },
    });
    const store = createPgRateLimitStore({ pool, windowMs: 24 * 60 * 60 * 1000, prefix: 'login' });
    await expect(store.resetKey('203.0.113.7')).resolves.toBeUndefined();
  });

  it('get returns undefined for an unknown key and the row when present', async () => {
    const pool = makeFakePool({
      onQuery: (text, params) => {
        expect(text).toContain('SELECT "hits", "reset_at" FROM "rate_limit"');
        expect(params[0]).toBe('login:203.0.113.7');
        return { rows: [{ hits: 7, reset_at: NOW }] };
      },
    });
    const store = createPgRateLimitStore({ pool, windowMs: 24 * 60 * 60 * 1000, prefix: 'login' });
    const out = await store.get('203.0.113.7');
    expect(out.totalHits).toBe(7);
    expect(out.resetTime).toBeInstanceOf(Date);
  });

  it('unknown keys return undefined from get', async () => {
    const pool = makeFakePool({ onQuery: () => ({ rows: [] }) });
    const store = createPgRateLimitStore({ pool, windowMs: 24 * 60 * 60 * 1000, prefix: 'login' });
    await expect(store.get('203.0.113.7')).resolves.toBeUndefined();
  });

  it('two store instances on the same pool address the same key (persistence across restarts)', async () => {
    // A backend restart constructs a brand-new store; both instances must
    // read/write the exact same row in the shared table.
    const pool = makeFakePool({ onQuery: () => ({ rows: [{ hits: 2, reset_at: NOW }] }) });
    const before = createPgRateLimitStore({ pool, windowMs: 24 * 60 * 60 * 1000, prefix: 'login' });
    const after = createPgRateLimitStore({ pool, windowMs: 24 * 60 * 60 * 1000, prefix: 'login' });
    await before.increment('203.0.113.7');
    await after.increment('203.0.113.7');
    await after.get('203.0.113.7');
    // Every query binds the identical prefixed key.
    for (const call of pool.calls) {
      expect(call.params[0]).toBe('login:203.0.113.7');
    }
    expect(pool.calls.length).toBe(3);
  });

  it('different limiters on the same pool never share keys (prefix isolation)', async () => {
    const pool = makeFakePool({ onQuery: () => ({ rows: [{ hits: 1, reset_at: NOW }] }) });
    const login = createPgRateLimitStore({ pool, windowMs: 24 * 60 * 60 * 1000, prefix: 'login' });
    const mfa = createPgRateLimitStore({ pool, windowMs: 15 * 60 * 1000, prefix: 'mfa' });
    await login.increment('203.0.113.7');
    await mfa.increment('203.0.113.7');
    expect(pool.calls[0].params[0]).toBe('login:203.0.113.7');
    expect(pool.calls[1].params[0]).toBe('mfa:203.0.113.7');
  });
});

describe('loginRateLimiter with a PostgreSQL pool', () => {
  it('fails open when the store errors (passOnStoreError): request reaches the handler, no 429/500', async () => {
    // A pool whose every query throws simulates the DB being unreachable
    // mid-flight — the limiter must pass the request, not lock the team out.
    const throwingPool = { query: async () => { throw new Error('db down'); } };
    const { app } = makeApp({
      users: [{
        email: 'admin@lake.test',
        password: 'Password123!',
        role: 'SUPER_ADMIN',
      }],
      options: {
        loginLimiter: loginRateLimiter({ pool: throwingPool }),
      },
    });
    const res = await request(app).post('/auth/login')
      .send({ email: 'admin@lake.test', password: 'wrong-password' })
      .expect(401);
    expect(res.body.error?.code).toBe('INVALID_CREDENTIALS');
  });

  it('still blocks past the limit with a healthy pool', async () => {
    // Simulate a store that counts up: the 11th failed attempt must 429.
    let hits = 0;
    const countingPool = {
      async query(text, params) {
        if (text.includes('INSERT')) {
          hits += 1;
          return { rows: [{ hits, reset_at: new Date(Date.now() + 86_400_000) }] };
        }
        return { rows: [] };
      },
    };
    const { app } = makeApp({
      users: [{
        email: 'admin@lake.test',
        password: 'Password123!',
        role: 'SUPER_ADMIN',
      }],
      options: {
        loginLimiter: loginRateLimiter({ pool: countingPool, limit: 10 }),
      },
    });
    for (let i = 0; i < 10; i += 1) {
      await request(app).post('/auth/login')
        .send({ email: 'admin@lake.test', password: 'wrong-password' })
        .expect(401);
    }
    const blocked = await request(app).post('/auth/login')
      .send({ email: 'admin@lake.test', password: 'wrong-password' })
      .expect(429);
    expect(blocked.body.error?.code).toBe('RATE_LIMITED');
  });
});
