# SECURITY_ROADMAP Phase 14 — Path Traversal

**Date:** 2026-08-11 · **Status:** ✅ COMPLETE

## Audit

Every file-read / file-serve path was inventoried:

- **Backend serves no static files** (verified: no static middleware; the
  only backend reads are operator-configured paths — `repoRoot` for
  content-health, fixed seed/backup files, the i18n dictionary path).
- **Sitemap builder** (`scripts/build-sitemap.js`): reads `readdirSync(ROOT)`
  and filters to `.html` — readdir names are single segments (`.`/`..` are
  never returned), and the `.html` suffix makes traversal impossible. Safe
  by construction.
- **Real gap #1 — backend content-health checker** (`src/lib/content-health.js`
  `checkLinks`): DB-controlled asset URLs (media.url, company.logo,
  leadership.photo) were joined against `repoRoot` with `path.join`, so an
  asset value like `/../../Downloads/anything` escaped the root and probed
  arbitrary files via `existsSync` — a file-existence oracle.
- **Real gap #2 — the localhost verification static servers**: 23
  `http.createServer` harnesses in `scripts/`. Six used the classic
  separator-less `startsWith(ROOT)` prefix check (escapable through a
  sibling directory whose name merely shares the root's prefix, e.g.
  `ROOT2`), and **four had no containment guard at all**
  (`_dark_mode_regression.js`, `_audit_mobile_text.js`, `_audit_overflow.js`,
  `_accessibility_audit.js` — `path.join(ROOT, req.url)` straight into
  `readFileSync`). The roadmap's claim that these "guard startsWith(ROOT)"
  was only true for a subset.

## Implemented

- **`scripts/_safe_static.js`** — shared `resolveStatic(root, urlPath)`
  used by every static server:
  - decodes percent-encoding safely (malformed URI → null),
  - resolves `..` and requires **separator-aware containment**
    (`resolved === root || resolved.startsWith(root + path.sep)`) — closes
    both the `..` escape and the sibling-prefix escape,
  - rejects null bytes, treats requests as relative to root (a leading
    `/` cannot reset resolution), strips query strings.
- **All 23 static servers** now route every file request through
  `resolveStatic` (403 on escape, otherwise serve as before).
- **`content-health.js`** — internal asset checks now resolve against
  `repoRoot` and require containment before `existsSync`; escaping paths
  are reported missing without ever touching the filesystem outside.

## Tests — `backend/tests/phase14-path-traversal.test.js` (8)

- `resolveStatic`: legit paths served (incl. in-root `..` normalization);
  plain + percent-encoded `..` escapes rejected; **sibling-prefix escape
  rejected**; malformed encoding and null bytes rejected.
- `checkLinks` containment: with a fixture tree (a file outside the root
  and a sibling-prefix dir that both really exist), `/../secret.txt` and
  `/../site2/leak.txt` are reported missing; `/assets/real.png` is not.
- **Tripwires**: no `startsWith(ROOT|root)` may reappear in `scripts/`;
  every file containing `createServer` must reference `resolveStatic`.

## Live verification (real backend + real HTTP)

- Seeded a probe company whose website was
  `/../../Downloads/SECURITY_ROADMAP.md` — a file that genuinely exists
  outside the repo root — and a control `/backend/package.json`:
  `GET /admin/content-health` reported the escape **missing** (94 internal
  checks ran; the outside file was never probed) and the control **not
  missing**.
- Booted a real HTTP server using `resolveStatic` and probed at the wire
  level (`curl --path-as-is`): `/../README.md`, `/%2e%2e/README.md`,
  `/..%2fREADME.md`, `/..%2f..%2fDownloads%2fSECURITY_ROADMAP.md` all →
  403; `/index.html` → 200; `/assets/../README.md` → 200 (in-root
  normalization is legitimate). (Fun find: plain curl normalizes
  dot-segments client-side, so the server only sees honest traversal when
  it is percent-encoded or sent with `--path-as-is`.)
- Probes cleaned, `.env` restored, backend restarted healthy.

## Modified / created

- `scripts/_safe_static.js` (new), 23 static-server harnesses (fixed),
  `backend/src/lib/content-health.js` (containment),
  `backend/tests/phase14-path-traversal.test.js` (new),
  `docs/security/phase-14-report.md` (this file).

## Status

**COMPLETE** — the backend no longer probes outside its configured root,
every localhost static server is contained (including four that had no
guard at all), the sitemap builder is verified safe by construction, and
tripwires keep the bare-prefix pattern from returning. Backend suite:
**217/217**.
