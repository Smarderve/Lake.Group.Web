# Security Test Plan

Date: 2026-08-13

## Local and CI gates

| Surface | Command |
|---|---|
| Backend full | `cd backend && npm test` |
| Security regressions | `cd backend && npm run test:security` |
| Syntax/build/lint | `cd backend && npm run typecheck && npm run build && npm run lint` |
| Dependency baseline | `cd backend && npm run test:audit` |
| CMS | `cd cms && npm test && npm run typecheck:test && npm run build` |
| CMS browser | `cd cms && npm run test:e2e && npm run test:visual` |
| Public security | `node --test tests/static-csp-hardening.test.js tests/africa-network-map-xss.test.js tests/ci-supply-chain-hardening.test.js` |
| All-page CSP | `node scripts/_verify_csp.js` |
| Public outage | `node scripts/_verify_phase8_entities.js` |
| Accessibility/globe | `node scripts/_verify_accessibility.js` and `node scripts/_verify_hero_globe.js` |
| Secret scan | `npm run secret:scan` |
| Root audit | `node backend/scripts/audit-gate.js . --baseline docs/security/audit-baseline.json --scope root` |

## Required attack cases

- anonymous, wrong-role, cross-object and smuggled-property requests
- brute-force, MFA replay/invalid code, inactive user and expired session
- forged Origin/X-Forwarded headers and credentialed CORS from an unlisted site
- SQL/shell/path/SSRF hostile strings
- malicious snapshot HTML and inline-event payloads
- SVG/polyglot/MIME mismatch/oversize uploads and active PDF disposition
- release payload injection, duplicate events, retries, token-bearing errors
- private fields/drafts/audit/storage keys in public snapshots
- cache headers on authenticated responses
- mutable CI actions, broad workflow permissions and persisted credentials

## TDD evidence rule

Every uncovered exploitable behavior gets a test that is observed failing for
the expected reason before implementation, then focused green verification and
the full relevant suite.

## External authorized tests

Run only against owned staging/production infrastructure:

- TLS scanner and HTTP→HTTPS/HSTS checks
- external port scan for 22/4000/5432 and origin bypass
- bucket anonymous read/list/write probes
- provider IAM/access-log review
- WAF/rate/DDoS controlled load test
- backup restoration to an isolated target
- SIEM test events and paging acknowledgement
- protected-branch/environment bypass review

Never run destructive availability or data-corruption tests against production.
