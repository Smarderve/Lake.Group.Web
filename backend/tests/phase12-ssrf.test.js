import { describe, it, expect } from 'vitest';
import { createUrlGuard, isPrivateIp, isAllowedDestination } from '../src/lib/ssrf-guard.js';
import { checkLinks } from '../src/lib/content-health.js';

// SECURITY_ROADMAP Phase 12 — SSRF Protection.
//
// The only outbound-fetch surface is the admin broken-link checker
// (content-health.js checkLinks with checkExternal). These tests prove the
// guard fails closed: private/special-use destinations (incl. the cloud
// metadata address), DNS-rebinding-style mixed results, redirect chains
// into internal networks, and timeouts are all denials. DNS lookup and the
// fetch implementation are injected so the suite stays hermetic.

const res = (status, location) => ({
  status,
  ok: status >= 200 && status < 400,
  headers: { get: (name) => (name === 'location' ? location : null) },
});

const PUBLIC_IPS = [
  '8.8.8.8',
  '1.1.1.1',
  '93.184.216.34',
  '2001:4860:4860::8888',
];

const PRIVATE_IPS = [
  '0.0.0.0',
  '10.0.0.1',           // RFC 1918
  '100.64.0.1',         // CGNAT
  '127.0.0.1',          // loopback
  '169.254.169.254',    // cloud metadata
  '172.16.0.1',         // RFC 1918
  '192.168.1.1',        // RFC 1918
  '198.18.0.1',         // benchmarking
  '224.0.0.1',          // multicast
  '240.0.0.1',          // reserved
  '::1',                // IPv6 loopback
  '::ffff:127.0.0.1',   // IPv4-mapped loopback
  '::ffff:10.1.2.3',    // IPv4-mapped RFC 1918
  'fc00::1',            // IPv6 ULA
  'fe80::1',            // IPv6 link-local
];

describe('SECURITY_ROADMAP Phase 12 — SSRF guard', () => {
  it('isPrivateIp denies private/special-use addresses, allows public ones', () => {
    for (const ip of PRIVATE_IPS) expect(isPrivateIp(ip), `${ip} must be private`).toBe(true);
    for (const ip of PUBLIC_IPS) expect(isPrivateIp(ip), `${ip} must be public`).toBe(false);
    expect(isPrivateIp('not-an-ip')).toBe(true); // unparseable → deny
  });

  it('isAllowedDestination rejects private literals and junk, accepts public and hostnames', () => {
    expect(isAllowedDestination('127.0.0.1')).toBe(false);
    expect(isAllowedDestination('[::1]')).toBe(false);
    expect(isAllowedDestination('10.0.0.5')).toBe(false);
    expect(isAllowedDestination('8.8.8.8')).toBe(true);
    expect(isAllowedDestination('example.com')).toBe(true); // caller must resolve
    expect(isAllowedDestination('')).toBe(false);
    expect(isAllowedDestination(null)).toBe(false);
  });

  it('assertSafeUrl restricts the protocol and fails closed on invalid URLs', async () => {
    const guard = createUrlGuard({ lookup: async () => [] });
    expect((await guard.assertSafeUrl('ftp://example.com/x')).reason).toBe('protocol not allowed');
    expect((await guard.assertSafeUrl('file:///etc/passwd')).reason).toBe('protocol not allowed');
    expect((await guard.assertSafeUrl('javascript:alert(1)')).reason).toBe('protocol not allowed');
    expect((await guard.assertSafeUrl('not a url')).reason).toBe('invalid URL');
  });

  it('assertSafeUrl blocks private literal destinations before any DNS work', async () => {
    let lookups = 0;
    const guard = createUrlGuard({ lookup: async () => { lookups += 1; return [{ address: '8.8.8.8' }]; } });
    const r = await guard.assertSafeUrl('http://127.0.0.1:4000/health');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('private/internal host');
    expect(lookups).toBe(0); // never even resolved — no internal DNS query
  });

  it('assertSafeUrl requires EVERY resolved address to be public (DNS-rebinding defense)', async () => {
    const guard = createUrlGuard({
      lookup: async () => [{ address: '93.184.216.34' }, { address: '192.168.1.1' }],
    });
    const r = await guard.assertSafeUrl('http://mixed.example/x');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('host resolves to a private/internal address');
  });

  it('assertSafeUrl passes when every resolved address is public', async () => {
    const guard = createUrlGuard({ lookup: async () => [{ address: '93.184.216.34' }] });
    const r = await guard.assertSafeUrl('http://public.example/x');
    expect(r.ok).toBe(true);
  });

  it('DNS failure denies (fail closed — never fetch on uncertainty)', async () => {
    const guard = createUrlGuard({
      lookup: async () => { throw new Error('ENOTFOUND'); },
      fetchImpl: async () => { throw new Error('must not be called'); },
    });
    expect((await guard.assertSafeUrl('http://nope.example/x')).ok).toBe(false);
  });

  it('safeFetch never issues a fetch for a blocked destination', async () => {
    let fetches = 0;
    const guard = createUrlGuard({
      lookup: async () => [{ address: '8.8.8.8' }],
      fetchImpl: async () => { fetches += 1; return res(200); },
    });
    const r = await guard.safeFetch('http://10.0.0.9/internal');
    expect(r).toEqual({ status: 0, blocked: 'private/internal host' });
    expect(fetches).toBe(0);
  });

  it('safeFetch re-validates redirect hops — a redirect into the internal network is blocked', async () => {
    const guard = createUrlGuard({
      lookup: async () => [{ address: '93.184.216.34' }],
      fetchImpl: async (url) => {
        if (url === 'http://public.example/start') return res(302, 'http://127.0.0.1:5432/pg');
        throw new Error('second hop must never be fetched');
      },
    });
    const r = await guard.safeFetch('http://public.example/start');
    expect(r.status).toBe(0);
    expect(r.blocked).toBe('private/internal host');
  });

  it('safeFetch caps redirect chains', async () => {
    const guard = createUrlGuard({
      lookup: async () => [{ address: '93.184.216.34' }],
      fetchImpl: async () => res(302, 'http://public.example/loop'),
    });
    const r = await guard.safeFetch('http://public.example/a', 2); // extra arg ignored; default cap 3
    expect(r.status).toBe(0);
    expect(r.blocked).toBe('too many redirects');
  });

  it('safeFetch reports timeouts', async () => {
    const guard = createUrlGuard({
      lookup: async () => [{ address: '93.184.216.34' }],
      // A real fetch rejects with a TimeoutError when the abort signal fires;
      // the fake honors the signal the same way.
      fetchImpl: async (_url, opts) => new Promise((_, reject) => {
        opts.signal.addEventListener('abort', () =>
          reject(Object.assign(new Error('aborted'), { name: 'TimeoutError' })));
      }),
    });
    const fetch = guard.createSafeFetcher({ timeoutMs: 50 });
    const r = await fetch('http://public.example/slow');
    expect(r.status).toBe(0);
    expect(r.blocked).toBe('timeout');
  });

  it('safeFetch returns the final status for an allowed destination', async () => {
    const guard = createUrlGuard({
      lookup: async () => [{ address: '93.184.216.34' }],
      fetchImpl: async () => res(200),
    });
    const r = await guard.safeFetch('http://public.example/ok');
    expect(r).toEqual({ status: 200 });
  });

  it('checkLinks flags SSRF-blocked URLs with the reason (default guard, hermetic)', async () => {
    // The default guard resolves real DNS but the literal 127.0.0.1 is
    // rejected before any fetch — no network needed.
    const db = {
      company: { findMany: async () => [{ slug: 'internal-probe', website: 'http://127.0.0.1:4000/health', logo: null }] },
      leadership: { findMany: async () => [] },
      media: { findMany: async () => [] },
    };
    const res = await checkLinks(db, { checkExternal: true });
    expect(res.external.checked).toBe(1);
    expect(res.external.unreachable.length).toBe(1);
    expect(res.external.unreachable[0]).toMatchObject({
      kind: 'company.website',
      status: null,
      blocked: 'private/internal host',
    });
  });

  it('checkLinks accepts an injected fetcher and keeps the blocked reason', async () => {
    const db = {
      company: { findMany: async () => [{ slug: 'acme', website: 'https://acme.example', logo: null }] },
      leadership: { findMany: async () => [] },
      media: { findMany: async () => [] },
    };
    const res = await checkLinks(db, {
      checkExternal: true,
      fetcher: async () => ({ status: 0, blocked: 'unreachable' }),
    });
    expect(res.external.unreachable[0].blocked).toBe('unreachable');
  });
});
