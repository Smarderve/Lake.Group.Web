# Release security hardening — 2026-08-13

## Closed findings

- **Stored XSS in Africa map popups:** every CMS/snapshot-derived popup value
  is now inserted through `textContent` into DOM nodes passed to Leaflet.
  Pipeline names/descriptions and facility name/city/marker descriptions cannot
  create elements, event handlers, SVG, iframes, or scripts.
- **Forwarding-header trust:** production accepts only direct mode (`0`), an
  ingress-only single hop (`1`), or explicit proxy IP/CIDR entries. CSRF origin
  construction consults Express's compiled direct-peer trust function before
  reading forwarded host data.
- **Release credential exposure:** the workflow is read-only, disables checkout
  credential persistence, scopes the Vercel token to Vercel steps, does not put
  tokens on command lines or in artifacts, validates dispatch input, and
  redacts known and configured token values from durable release errors.

## Static CSP

All 49 shipping HTML pages use the following meta policy:

```text
default-src 'self'; script-src 'self' 'unsafe-inline'; script-src-attr 'none';
style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:;
font-src 'self' data:; connect-src 'self' https:;
frame-src https://www.youtube.com https://www.youtube-nocookie.com;
worker-src 'self'; manifest-src 'self'; media-src 'self' https:;
object-src 'none'; base-uri 'self'; form-action 'self';
upgrade-insecure-requests
```

The Vercel HTTP response header adds `frame-ancestors 'none'`, which browsers
do not support in meta policies. The localhost production connection allowance
and all inline HTML event-handler
attributes were removed. `form-action` is same-origin only. Vercel also returns
`nosniff`, strict referrer policy, and a restrictive permissions policy.

`script-src 'unsafe-inline'` and `style-src 'unsafe-inline'` remain because more
than 40 static pages contain inline script elements and inline styles. Removing
them safely requires a separate deterministic static build that externalizes
code/styles or generates per-release CSP hashes/nonces. The incremental policy
blocks script attributes (`script-src-attr 'none'`) and the confirmed dynamic
HTML sink has been removed, but arbitrary same-page HTML injection would still
have elevated impact until that build architecture exists.

## Operator requirements

- Ensure an ingress-only network path before using `TRUST_PROXY=1`; otherwise
  use direct mode or exact IP/CIDR entries.
- Keep the GitHub dispatch token limited to Contents write on one repository.
- Keep the Vercel token limited to the production project/team.
- Rotate both at least every 90 days and immediately after suspected exposure,
  personnel changes, or scope changes. Replace, verify one approved release,
  inspect provider audit logs, then revoke the old credential.

## Fresh review and verification

A post-change, defect-first review found no remaining medium-or-higher
exploitable issue in the changed security paths. Repository verification
completed on 2026-08-13:

- backend: 41 test files / 297 tests, 21 security files / 169 tests, build,
  syntax check, audit baseline, and ESLint all passed; ESLint reports 126
  security-plugin warnings and no errors
- CMS: 10 test files / 32 tests, typecheck, production build, performance
  budget, critical publication E2E, and 40-route desktop/mobile visual and axe
  gate passed
- public site: map-popup malicious-snapshot regression, CSP policy regression,
  public snapshot/release workflow tests, all-page CSP browser exercise,
  18-page accessibility check, entity hydration, and normal/reduced-motion
  globe verification passed
- secret scan: 739 repository files checked with no detected credential
- dependency review: backend and CMS reported zero vulnerabilities; the root
  development toolchain reported five moderate transitive findings under
  `firebase-tools`, with no high or critical finding and only a breaking
  downgrade offered by npm

## Security score

**93/100** for the repository-controlled release state. This is a defensible
engineering score, not a penetration-test certification. The largest deduction
is the static site's continued `script-src`/`style-src 'unsafe-inline'`
dependency. Smaller deductions cover broad `https:` resource/connect schemes,
the five moderate development-only Firebase CLI transitive advisories, and
deployment controls that still depend on operators enforcing ingress isolation,
protected GitHub environments, and provider-side token scope. No confirmed
medium-or-higher application vulnerability remains open in the reviewed paths.
