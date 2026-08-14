# Security Acceptance Report

Date: 2026-08-13 · Scope: repository-controlled state only

## Phase-by-phase reconciliation

| Phase | Data flow / threat focus | Result and evidence |
|---|---|---|
| 0 Discovery | all components and dependencies | reconciled against code, workflows, manifests and existing phase reports |
| 1 Assets/boundaries | visitor, employee, API, DB, storage, CI | current inventory and architecture documents created |
| 2 Authentication | credentials → session → CMS | existing bcrypt/limits/sessions retained; all production CMS roles now require MFA enrollment; TOTP seeds encrypted |
| 3 Authorization/RBAC | session → route/object/workflow | existing role matrix, recent auth, object/property tests retained |
| 4 API | request → validation → minimal response | existing API inventory, schemas, projections and limits reconciled |
| 5 Injection | input → DB/shell/log/template | Prisma/no-shell/structured-log controls and negative suites retained |
| 6 Browser | snapshot/CMS content → DOM; cookie requests | XSS/CSP/CSRF controls retained; auth/admin responses now no-store |
| 7 Files/media | multipart → parser → storage → publish | signature/MIME/size/random-key pipeline retained; PDF disposition hardened |
| 8 SSRF | configured/admin URL → network | fail-closed URL/DNS/IP/redirect guard retained; egress ACL remains external |
| 9 Database | API → PostgreSQL | role split and boot validation retained; private network/TLS/logging external |
| 10 Secrets | environment → runtime/provider | scans/redaction retained; MFA seeds encrypted; provider secret manager external |
| 11 Server | container/host → runtime | non-root production image retained; host/firewall/patch evidence external |
| 12 Cloud/storage | API → S3/provider | strict adapter/config retained; IAM/public-block/versioning evidence external |
| 13 CDN/WAF | Internet → edge → origin | static resilience/cache controls retained; WAF/DNS/origin controls external |
| 14 Resource exhaustion | requests/jobs → CPU/DB/storage | layered limits and bounded workers retained; edge/DB concurrency external |
| 15 Supply chain | packages/actions → build | audits/lockfiles retained; workflow actions pinned to immutable SHAs |
| 16 CI/CD | commit → tests → protected deploy | read-only permissions and checkout credential isolation applied to all workflows |
| 17 Logging/alerts | security event → log/SIEM | structured safe logs retained; provider ingestion/alert acknowledgement external |
| 18 Audit trail | mutation → durable history | indexed no-secret audit viewer/tripwire retained |
| 19 Backup/recovery | DB → encrypted offsite copy → restore | tooling/tests retained; schedule/immutability/current restore external |
| 20 Public resilience | CMS publish → snapshot → first visitor | atomic content-addressed release/outage browser tests retained |
| 21 Publishing | edit → review → approve → release | permission, separation, idempotency/retry/known-good controls retained |
| 22 Errors | exception/dependency failure → response/log | generic responses, detailed safe logs and fail-closed behavior retained |
| 23 Transport | client/proxy → HTTPS API/site | HSTS/cookies/proxy tests retained; TLS provider evidence external |
| 24 Frontend | CMS/public data → React/DOM | server authz, safe rendering, no bundle secrets retained |
| 25 Development/testing | change → review/gates | TDD/security/DAST/audit/secret gates retained and expanded |
| 26 Regression matrix | 300 model → control/test/evidence | `SECURITY-REGRESSION-MATRIX.md` assigns T001–T300 |
| 27 Incident response | detection → containment → recovery | actionable playbooks and exercises documented |
| 28 Configuration | environment → production boot | fail-fast validation expanded for MFA roles/encryption |
| 29 Periodic review | time/change → control drift | daily-to-annual cadence and independent review gate documented |
| 30 Acceptance | all controls → evidence decision | repository verification section below; external gates remain conditional |

## Repository acceptance

The repository is acceptable only when the fresh verification run recorded
below has zero unexplained failures. “PASS” never substitutes for production
evidence in the external-gate section.

## External-only gates

Not asserted from this checkout: DNS/CDN/WAF configuration, TLS ciphers,
network/DB isolation, cloud IAM and bucket public-access controls, provider
audit logs, SIEM alert routing/retention, scheduled immutable backups and a
current isolated restoration, branch/environment protection, container image
registry scanning, organization MFA, and independent penetration testing.

## Residual repository risks

- Static pages retain `script-src` and `style-src 'unsafe-inline'`; removing
  these requires a deterministic hash/nonce/externalization build.
- Root Firebase deployment tooling has monitored moderate transitive advisories.
- TOTP key rotation currently requires managed re-enrollment/operational
  custody of the old key; loss of the key makes existing seeds unrecoverable.

## Final verification and score

Fresh comprehensive run: 2026-08-14 (repository-controlled state only)

| Gate | Command | Result |
|---|---|---|
| Backend security suites | `npm run test:security` (via `test:gate`) | PASS — 23 files / 182 tests |
| Backend dependency audit gate | `npm run test:audit` | PASS — 0 known, 0 baseline advisories |
| Backend full suite | `npm test` | PASS — 42 files / 301 tests |
| Backend ESLint | `npm run lint` | PASS — 0 errors (126 reviewed allowlisted warnings) |
| Backend syntax gate | `npm run typecheck` (syntax-check) | PASS — src, scripts, tests |
| Root secret scan | `npm run secret:scan` | PASS — 753 files clean, `.env` gitignored |
| DAST (live local) | `node scripts/dast-probe.js http://127.0.0.1:4000` | PASS — 10/10 checks |
| Public resilience | `npm run test:public-delivery` | PASS — 3/3 |
| CMS dependency audit | `cd cms && npm audit --audit-level=high` | PASS — 0 vulnerabilities |
| CMS unit/component | `cd cms && npm test` | PASS — 10 files / 32 tests |
| CMS typecheck (app + test) | `npm run typecheck` + `typecheck:test` | PASS |
| CMS production build | `npm run build` | PASS |
| CMS performance budget | `npm run test:performance` | PASS — entry 291.1 KiB raw / 91.2 KiB gzip, 100 chunks, 44.3 KiB CSS |
| CMS critical-flow E2E | `npm run test:e2e` | PASS — governed publishing, viewer denial, mobile drawer, axe |

**Defect found and resolved during this run.** The local database was missing
migration `0012_media_storage` (additive: `Media.storageProvider` /
`storageKey` columns + unique index). `/api/public/news` returned HTTP 500
(`P2022` column-does-not-exist) and DAST's public-header check dropped to 9/10
until `prisma migrate deploy` was applied; the probe then returned to 10/10
and public news serves real rows again. This is dev-environment drift (Phases
9/28 configuration management), not a code defect — production deployment
must apply `prisma migrate deploy` before `start` (already specified in
`CMS-PRODUCTION-DEPLOYMENT.md` and the import runbook).

**Score: ACCEPTED for repository-controlled scope.** Every automated gate above
passes with zero unexplained failures. The external-only gates (section
"External-only gates") remain conditional on operator-owned infrastructure
evidence, and the residual risks documented above are unchanged.
