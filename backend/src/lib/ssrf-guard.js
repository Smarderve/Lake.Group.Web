/**
 * SECURITY_ROADMAP Phase 12 — SSRF protection for server-side fetches.
 *
 * The only outbound-fetch surface is the admin broken-link checker
 * (content-health.js, `LAKE_CHECK_EXTERNAL_LINKS=true`). This guard makes
 * it fail closed:
 *
 *   1. Protocol allowlist — http/https only.
 *   2. Destination restriction — private / loopback / link-local / CGNAT /
 *      reserved IPv4 + IPv6 (incl. IPv4-mapped) are rejected.
 *   3. DNS safety — hostnames are resolved and EVERY resolved address must
 *      be public (never just the first, never just the literal hostname).
 *   4. Redirect handling — redirects are followed manually, each hop
 *      re-validated through the same checks, with a hop cap.
 *   5. Timeouts — every hop has its own timeout.
 *   6. Fail closed — DNS errors, unparseable addresses, and protocol
 *      violations are all denials.
 *
 * `createUrlGuard` exposes the same API with injectable `lookup` (node's
 * `dns.lookup`) and `fetchImpl` (global fetch) so tests stay hermetic. The
 * module-level exports are the default guard used by the application.
 */
import dns from 'node:dns/promises';
import net from 'node:net';

// Private / special-use IPv4 ranges (RFC 1918 + loopback + link-local +
// CGNAT + benchmark + multicast + reserved + "this network").
const PRIVATE_V4_RANGES = [
  ['0.0.0.0', 8],        // "this network"
  ['10.0.0.0', 8],       // RFC 1918
  ['100.64.0.0', 10],    // CGNAT (100.64.0.0/10)
  ['127.0.0.0', 8],      // loopback
  ['169.254.0.0', 16],   // link-local — includes cloud metadata 169.254.169.254
  ['172.16.0.0', 12],    // RFC 1918
  ['192.168.0.0', 16],   // RFC 1918
  ['198.18.0.0', 15],    // benchmarking
  ['224.0.0.0', 4],      // multicast
  ['240.0.0.0', 4],      // reserved
];

function v4toInt(ip) {
  return ip.split('.').reduce((acc, oct) => ((acc << 8) >>> 0) + Number(oct), 0) >>> 0;
}

function inV4Range(ip, [base, bits]) {
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (v4toInt(ip) & mask) === (v4toInt(base) & mask);
}

/** True when the address is private/special-use or unparseable (deny). */
export function isPrivateIp(address) {
  if (net.isIPv4(address)) {
    return PRIVATE_V4_RANGES.some((range) => inV4Range(address, range));
  }
  if (net.isIPv6(address)) {
    const lower = address.toLowerCase();
    if (lower === '::' || lower === '::1' || lower === '::0') return true; // unspecified + loopback
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true;    // fc00::/7 ULA
    if (lower.startsWith('fe8') || lower.startsWith('fe9')
      || lower.startsWith('fea') || lower.startsWith('feb')) return true; // fe80::/10 link-local
    const mapped = lower.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
    if (mapped) return isPrivateIp(mapped[1]);                            // IPv4-mapped
    return false;
  }
  return true; // not a parseable IP → deny
}

/** True when a destination host (IP literal or hostname) is allowed. */
export function isAllowedDestination(host) {
  if (!host || typeof host !== 'string') return false;
  const trimmed = host.trim();
  const bracketed = trimmed.match(/^\[(.+)\]$/); // [::1]
  if (bracketed) return !isPrivateIp(bracketed[1]);
  if (net.isIP(trimmed)) return !isPrivateIp(trimmed);
  return true; // hostname — the caller must resolve-and-check addresses
}

/** Build a guard with injectable DNS lookup + fetch (defaults = real ones). */
export function createUrlGuard({ lookup = dns.lookup, fetchImpl = globalThis.fetch } = {}) {
  /**
   * Resolve a hostname and require EVERY resolved address to be public.
   * DNS failure → false (fail closed).
   */
  async function resolveAndCheck(host) {
    try {
      const records = await lookup(host, { all: true });
      if (!Array.isArray(records) || records.length === 0) return false;
      return records.every((r) => !isPrivateIp(r.address));
    } catch {
      return false;
    }
  }

  /** Validate a URL end to end (protocol + literal host + resolved addresses). */
  async function assertSafeUrl(rawUrl) {
    let parsed;
    try {
      parsed = new URL(rawUrl);
    } catch {
      return { ok: false, reason: 'invalid URL' };
    }
    if (!/^https?:$/.test(parsed.protocol)) return { ok: false, reason: 'protocol not allowed' };
    const host = parsed.hostname;
    if (!host) return { ok: false, reason: 'missing host' };
    if (!isAllowedDestination(host)) return { ok: false, reason: 'private/internal host' };
    const resolvedOk = await resolveAndCheck(host);
    if (!resolvedOk) return { ok: false, reason: 'host resolves to a private/internal address' };
    return { ok: true, url: rawUrl };
  }

  /**
   * HEAD-fetch a URL with SSRF protection: manual redirects, every hop
   * re-validated, hop cap, per-hop timeout. Returns { status } or
   * { status: 0, blocked: reason }.
   */
  function createSafeFetcher({ fetchImpl: hopFetch = fetchImpl, maxRedirects = 3, timeoutMs = 4000 } = {}) {
    return async function safeFetch(rawUrl) {
      let current = rawUrl;
      for (let hop = 0; hop <= maxRedirects; hop += 1) {
        const check = await assertSafeUrl(current);
        if (!check.ok) return { status: 0, blocked: check.reason };
        let res;
        try {
          res = await hopFetch(current, { method: 'HEAD', redirect: 'manual', signal: AbortSignal.timeout(timeoutMs) });
        } catch (err) {
          return { status: 0, blocked: err?.name === 'TimeoutError' ? 'timeout' : 'unreachable' };
        }
        if (res.status >= 300 && res.status < 400) {
          const location = res.headers.get('location');
          if (!location) return { status: res.status };
          current = new URL(location, current).toString(); // next hop re-validated
          continue;
        }
        return { status: res.status };
      }
      return { status: 0, blocked: 'too many redirects' };
    };
  }

  return {
    isPrivateIp,
    isAllowedDestination,
    resolveAndCheck,
    assertSafeUrl,
    createSafeFetcher,
    safeFetch: createSafeFetcher(),
  };
}

// Default guard used by the application. (isPrivateIp / isAllowedDestination
// are already exported above; they are pure helpers shared by every guard.)
export const { resolveAndCheck, assertSafeUrl, createSafeFetcher, safeFetch } = createUrlGuard();
