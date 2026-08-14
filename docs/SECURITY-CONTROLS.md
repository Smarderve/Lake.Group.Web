# Security Controls

Date: 2026-08-13

| Domain | Implemented repository control | Evidence |
|---|---|---|
| Authentication | bcrypt policy, generic errors, login/MFA throttles, server sessions | auth/phase 2/3 tests |
| MFA | production all-role enrollment gate; TOTP; AES-256-GCM seed storage | `phase300-threat-hardening.test.js` |
| Authorization | per-request DB reload, RBAC, recent auth, object/property scoping | phase 4/9/23 suites |
| CSRF/CORS | exact Origin and Sec-Fetch validation; exact credentialed CMS CORS | phase 8/24 suites |
| API/input | zod/allowlists, 100KB JSON limit, pagination/query caps | phase 5/9/10 suites |
| Injection | Prisma; no shell interpolation; structured logs | phase 5/13/18 suites |
| Browser/XSS | text-safe CMS rendering, CSP, frame denial, no event attributes | static CSP and popup tests |
| Sensitive caching | `/auth` and `/admin` emit `private, no-store` | 300-threat suite |
| Uploads | auth/RBAC, one file, byte/MIME/size/parser checks, random key, lifecycle | media-upload suites |
| Active documents | PDFs forced to attachment disposition | 300-threat suite |
| SSRF | protocol/IP/DNS/redirect validation and timeout | phase 12 suite |
| Database | runtime/owner split required, ORM parameterization | config and DB security tests |
| Secrets | scans, serializer allowlists, release-error redaction | secret/security suites |
| Recovery | encrypted offsite backup adapter, retention, restore tooling | phase 20 tests/runbook |
| Public resilience | content-addressed snapshot, atomic pointer, leakage tests | public snapshot/browser tests |
| Publishing | separated workflow, dispatch validation, retries/idempotency | governance/release tests |
| Logging/audit | structured security events and durable indexed audit viewer | phase 18/19 suites |
| CI/supply chain | lockfiles, audit baseline, SHA actions, read-only permissions | CI supply-chain test |
| Container | pinned Node image, pruned production deps, non-root user, healthcheck | Dockerfile/phase 24 tests |

## Fail-closed production configuration

Production startup validates distinct DB roles, strong session/backup/MFA
keys, HTTPS cookies and exact origins, safe proxy trust, offsite backup target,
S3 storage, upload cap, and protected public-release configuration.

## Controls requiring external enforcement

Private database/storage networking, bucket public-access blocks/versioning,
cloud/provider IAM and MFA, WAF/DDoS, TLS configuration, SIEM alerts and
retention, protected branches/environments, backup schedules/immutability, and
independent penetration testing. These are acceptance gates, not claimed
implemented controls.
