# SECURITY_ROADMAP Phase 12 — SSRF Protection

**Date:** 2026-08-11 · **Status:** ✅ COMPLETE

## Audit

The only outbound-fetch surface in the entire backend is the **admin
broken-link checker** (`src/lib/content-health.js` `checkLinks` with
`checkExternal: true`, driven by `LAKE_CHECK_EXTERNAL_LINKS=true` in
`src/routes/admin.js` — a SUPER_ADMIN-only route). Before this phase it
fetched arbitrary content URLs with:

- **no destination restriction** — `http://127.0.0.1:5432`, `169.254.169.254`
  (cloud metadata), any RFC-1918 address would have been fetched,
- **no DNS safety** — a hostname resolving to a private address was fetched,
- **redirects followed by the runtime** (`fetch` default) — a public URL
  redirecting into the internal network was followed,
- **no hop cap**.

That is the classic SSRF profile: the checker itself is admin-gated and off
by default, but the moment an admin enables it (or a compromised admin
session exists), the server becomes an internal-network scanner / metadata
exfiltrator.

## Implemented — `src/lib/ssrf-guard.js` (fail-closed)

1. **Protocol allowlist** — http/https only (`file:`, `ftp:`, `javascript:`
   and anything else → denied).
2. **Destination restriction** — private / loopback / link-local / CGNAT /
   benchmarking / multicast / reserved IPv4 and IPv6 (incl. `::1`, `fc00::/7`
   ULA, `fe80::/10` link-local, and IPv4-mapped `::ffff:a.b.c.d`) → denied
   before any network work.
3. **DNS safety (DNS-rebinding defense)** — hostnames are resolved and
   **every** resolved address must be public; a mixed public/private result
   is a denial. DNS failure → denial (never fetch on uncertainty).
4. **Redirect handling** — redirects are followed manually, **each hop
   re-validated** through the same checks, with a 3-hop cap.
5. **Timeouts** — every hop has its own timeout (4s default).
6. **Fail closed** — unparseable addresses, missing hosts, DNS errors and
   protocol violations are all denials.

`checkLinks` now sends external HEAD requests through the guard
(`fetcher` injectable for tests); blocked destinations are reported as
`{ status: null, blocked: <reason> }` so the dashboard explains *why* a
link is unreachable instead of hiding it.

## Tests — `backend/tests/phase12-ssrf.test.js` (14, hermetic)

- Private/special-use address sweep (15 addresses incl. cloud metadata,
  IPv6 loopback, IPv4-mapped, ULA, link-local) denied; public addresses pass.
- Literal private destinations blocked **before any DNS query is issued**.
- DNS-rebinding defense: a hostname resolving to a mix of public + private
  addresses is denied; all-public passes; DNS failure denies.
- Protocol restrictions (ftp/file/javascript) and malformed URLs denied.
- No fetch is ever issued for a blocked destination (counter-injected).
- Redirect into the internal network blocked on the second hop; infinite
  redirect chains capped; timeouts reported.
- `checkLinks` integration: blocked URLs carry the reason, with both the
  default guard (hermetic — a literal loopback needs no network) and an
  injected fetcher.

## Live verification (real Postgres + running backend)

- Created a probe company whose `website` was `http://127.0.0.1:4000/health`
  (the backend itself), enabled `LAKE_CHECK_EXTERNAL_LINKS=true`, restarted.
- `GET /admin/content-health` (SUPER_ADMIN): the probe URL was reported as
  `{ status: null, blocked: "private/internal host" }` — the guard blocked
  it **without fetching**, while the 18 real seed URLs were HEAD-checked
  through the guard as normal.
- Probe cleaned up (company + admin user deleted), flag removed from `.env`
  (default is off), backend restarted clean and healthy.

## Modified / created

- `backend/src/lib/ssrf-guard.js` (new — guard + `createUrlGuard` factory
  with injectable DNS/fetch for hermetic tests)
- `backend/src/lib/content-health.js` (external checks through the guard;
  injectable `fetcher`)
- `backend/tests/phase12-ssrf.test.js` (new — 14 tests)
- `docs/security/phase-12-report.md` (this file)

## Status

**COMPLETE** — the one outbound-fetch surface is now fail-closed against
internal-network access, DNS rebinding, redirect-based pivots and hangs;
14 regression tests + live proof on the real backend. Backend suite:
**201/201**.
