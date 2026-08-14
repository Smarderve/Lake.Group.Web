# Phase 7 — XSS Protection: Completion Report

**Date:** 2026-08-11 · **Source:** `SECURITY_ROADMAP.md` §Phase 7

---

## PHASE: 7 — XSS Protection

### Audit result

| Surface | Finding | Status |
| --- | --- | --- |
| Stored XSS (chat / i18n / news render) | The assistant and i18n render via `textContent`; `innerHTML` uses are static chrome templates (no user data interpolated) | ✅ safe |
| Reflected XSS (query/search) | No server-rendered search; chat input rendered as text | ✅ safe |
| DOM XSS | Live probe: `<img onerror>` payload in a chat question never executes | ✅ verified |
| External script injection | **Real gap found**: `site.js` lazily loaded iconify from a CDN (`code.iconify.design`) — a third-party script execution surface and a supply-chain dependency | ✅ **vendored locally** |
| CSP | Static site had **no Content-Security-Policy** (the last open "fix before production" gap) | ✅ **implemented** |

### Implemented

1. **Content-Security-Policy meta on all 49 pages** (inserted before `</head>`)
   and the matching Vercel HTTP response header:
   - `default-src 'self'`; `object-src 'none'`; `base-uri 'self'`;
     `form-action 'self'`; `frame-ancestors 'none'`
   - `script-src 'self' 'unsafe-inline'`; `script-src-attr 'none'` — inline
     event handlers were removed, while existing inline script elements remain
     pending a deterministic hash/nonce build
   - `style-src 'self' 'unsafe-inline'` — ~1400 inline `style=` attributes
   - `img-src 'self' data: https:`; `font-src 'self' data:` (fonts are local)
   - `connect-src 'self' https:` — covers same-origin snapshots and the
     explicitly configured production `LAKE_API_BASE`
   - `frame-src https://www.youtube.com https://www.youtube-nocookie.com`
     (the only embeds)
   - `frame-ancestors` is enforced by the Vercel response header (meta alone
     cannot enforce it)
2. **Iconify vendored locally** — `assets/vendor/iconify/iconify-icon.min.js`
   (2.3.0, the exact CDN build); `site.js` now loads the local copy. The site
   loads **zero third-party scripts** now.
3. **Verification harness** — `scripts/_verify_csp.js` (headless Chrome):
   - all 49 pages load with **0 CSP violations** (console + pageerror capture)
   - enforcement probe: a `data:`-URI script is **blocked** while inline
     scripts still run
   - DOM-XSS probe: a chat question carrying `<img src=x onerror=...>` is
     rendered as text only — `onerror` never fires, no injected elements

### Modified

- All 49 `*.html` (CSP meta)
- `assets/site.js` (vendored iconify loader)
- `scripts/_verify_csp.js` (new), `scripts/_add_csp_tags.js` (new, one-shot)

### Created

- `assets/vendor/iconify/iconify-icon.min.js`
- `scripts/_add_csp_tags.js`, `scripts/_verify_csp.js`
- `docs/security/phase-07-report.md`

### Security controls

- CSP removes the stored-XSS blast radius (external script/style/frame/data-
  URI injection blocked at the browser)
- No third-party script dependencies (supply-chain posture improved)
- DOM-XSS regression probe in the harness

### Tests

- **CSP harness: RESULT PASS** — 49/49 pages, 0 violations; enforcement
  probe (data:-script blocked); DOM-XSS probe (payload not executed)
- **Live E2E: 9/9 PASS** with the CSP'd site (metrics, entities, news, map,
  assistant citation + no-invention guard, analytics in real Postgres)
- **Accessibility harness: PASS** (18 pages — no regression)
- Backend suite: **161/161** (unchanged — no backend edits this phase)

### Failures

- None. Two notable findings *surfaced by verification* (both fixed):
  1. The iconify CDN script (vendored).
  2. The CSP harness's own beacon traffic tripped the public-write rate
     limiter (429 — the limiter working as designed); the harness now uses
     a dead loopback API base so it exercises `connect-src` without
     firing real analytics events.

### Remaining risks (documented tradeoffs)

- `script-src 'unsafe-inline'` is required by inline script elements on more
  than 40 pages. Inline event handlers are independently blocked. Full removal
  requires a deterministic static hash/nonce build.
- `style-src 'unsafe-inline'` for the site's ~1400 inline style attributes.
- `connect-src` includes `https:` for the deployment-configurable API origin;
  production loopback access is no longer allowed.
- `frame-ancestors` for the static site must come from the reverse proxy
  header (meta tags don't support it) — already in the Phase 11 runbook.

### Status

**COMPLETE** — stored/reflected/DOM XSS paths verified safe, a real
third-party script dependency removed, CSP live on all pages with zero
violations, enforcement and DOM-XSS regression probes in place.
