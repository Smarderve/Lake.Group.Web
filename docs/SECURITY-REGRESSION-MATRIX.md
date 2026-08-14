# Security Regression Matrix — 300-Threat Coverage Model

Date: 2026-08-13

The supplied phased plan references a previously identified 300-threat
catalogue but does not contain that catalogue, and no separate catalogue is
present in the repository or supplied downloads. This matrix therefore defines
an explicit, reviewable 300-ID coverage model derived from the plan's threat
families. It must not be represented as a verbatim crosswalk to an unavailable
source document.

Status meanings:

- **Automated** — repository control has executable regression evidence.
- **Documented** — repository architecture/process control, manually reviewed.
- **External gate** — requires production provider/host evidence; exact checks
  are in `SECURITY-OPERATIONS.md`.
- **Mixed** — repository control plus an external enforcement obligation.

Each row enumerates exactly ten threats. Thirty rows cover `T001`–`T300`
without gaps or duplicate IDs.

| IDs | Ten enumerated threats | Primary control and evidence | Status |
|---|---|---|---|
| T001–T010 | unknown asset; unowned asset; undocumented data flow; hidden trust boundary; shadow service; stale inventory; unknown data sensitivity; untracked third party; undocumented backup; architecture drift | `SECURITY-ASSET-INVENTORY.md`, `SECURITY-ARCHITECTURE.md`, phase reports | Documented |
| T011–T020 | brute force; credential stuffing; password spraying; account enumeration; weak password; stolen password; dormant account; shared admin; MFA bypass; MFA non-enrollment | bcrypt/policy, generic errors, login limiter, production MFA gate, auth tests, `phase300-threat-hardening.test.js` | Automated/Mixed |
| T021–T030 | session fixation; session theft; cookie theft; stale role session; inactive-user session; idle-session abuse; session replay; missing revocation; insecure cookie; cross-device compromise | regenerated server sessions, secure/Lax/httpOnly cookies, DB reload, session viewer/revocation, phase 3/8 tests | Automated |
| T031–T040 | broken access control; IDOR; BOLA; role escalation; role mass assignment; function bypass; draft exposure; unauthorized delete; unauthorized export; separation-of-duty bypass | server RBAC, zod allowlists, object scoping, workflow state machine, phase 4/9/23 tests | Automated |
| T041–T050 | broken API auth; property overexposure; property overwrite; resource exhaustion; business-flow abuse; shadow API; deprecated API; unsafe method; pagination abuse; unsafe API response consumption | explicit route registry/inventory, schemas/projections, limits, 404/method handling, API suites | Automated |
| T051–T060 | SQL injection; NoSQL injection; command injection; template injection; LDAP injection; XPath injection; header injection; CRLF injection; log injection; prototype pollution | Prisma parameterization, no shell interpolation, zod schemas, structured logging, phase 5/13/18 tests | Automated |
| T061–T070 | stored XSS; reflected XSS; DOM XSS; HTML injection; CSRF; clickjacking; open redirect; CORS abuse; MIME sniffing; browser cache leakage | text-only rendering, CSP, Origin/Sec-Fetch checks, frame denial, exact CMS CORS, no-store middleware, XSS/CSP/CSRF tests | Automated |
| T071–T080 | malicious upload; web shell; MIME spoofing; extension spoofing; SVG XSS; image parser abuse; PDF active content; archive bomb; upload traversal; storage exhaustion | signature sniffing, allowlist, random keys, limits, SVG/archive rejection, PDF attachment, isolated S3/local adapters, media tests | Automated/Mixed |
| T081–T090 | SSRF; cloud metadata SSRF; redirect SSRF; DNS rebinding; private-IP fetch; URL credential abuse; unsupported scheme; response-size abuse; outbound timeout abuse; malicious third-party response | fail-closed URL/IP/DNS/redirect guard, timeout, external egress policy gate, phase 12 tests | Automated/Mixed |
| T091–T100 | public database; superuser runtime; owner runtime; plaintext DB transport; stolen DB credential; unauthorized read; unauthorized write; destructive migration; database dump; activity blind spot | split owner/runtime URLs, Prisma, production boot validation, private-network/TLS/activity-log external checks | Mixed |
| T101–T110 | secret in Git; secret in frontend; secret in logs; secret in artifact; broad token; long-lived token; unrotated token; environment disclosure; TOTP seed disclosure; backup-key exposure | secret scan, serializers/redaction, protected env docs, AES-GCM TOTP seeds, rotation runbooks | Automated/Mixed |
| T111–T120 | root process; debug exposure; unused service; public admin port; public SSH; weak SSH; missing patches; unsafe permissions; missing isolation; host persistence | non-root container, production fail-fast, Docker/host checklist and external acceptance commands | Mixed |
| T121–T130 | public bucket; bucket listing; IAM privilege abuse; static cloud key; metadata credential theft; missing storage logs; missing object versioning; cross-tenant access; container image vulnerability; cloud audit disabled | S3 adapter/private-by-default operator policy, scoped credentials, versioning/logging/image-scan gates | External gate/Mixed |
| T131–T140 | HTTP flood; TLS flood; cache poisoning; cache deception; origin exposure; host-header poisoning; domain takeover; DNS compromise; bot abuse; CDN configuration drift | immutable static releases, no-store private APIs, host/origin validation, Vercel/CDN/DNS/WAF external checks | Mixed |
| T141–T150 | connection exhaustion; JSON body flood; upload flood; query amplification; unbounded pagination; login flood; MFA flood; admin API flood; background-job flood; database pool exhaustion | 100KB JSON limit, upload cap, pagination caps, layered rate limits, bounded release worker, provider/database external limits | Automated/Mixed |
| T151–T160 | vulnerable dependency; malicious package; dependency confusion; typosquat; mutable build input; compromised transitive dependency; lockfile drift; unused package; unsigned artifact; missing SBOM | lockfiles, audit baseline, package review, immutable workflow actions, CI tests; SBOM/provider provenance external/release gate | Automated/Mixed |
| T161–T170 | pipeline tampering; mutable action tag; checkout credential persistence; broad workflow permission; untrusted privileged PR; deployment-secret exposure; artifact secret leakage; environment bypass; concurrent release race; unreviewed production deploy | SHA-pinned actions, read-only permissions, credentials disabled, protected production environment, concurrency/idempotency tests | Automated/Mixed |
| T171–T180 | missing login log; missing MFA log; missing authz denial log; missing CSRF log; missing rate-limit log; secret in request log; secret in response log; log forging; log loss; missing alert | structured events, header allowlists, durable audit rows, phase 18 tests; retention/SIEM alerts external | Automated/Mixed |
| T181–T190 | unaudited admin action; unaudited role change; unaudited publish; unaudited delete; mutable audit record; unqueryable audit; missing actor; missing resource; missing IP; secret in audit metadata | centralized audit helper, indexed SUPER_ADMIN viewer, mutation tripwire and no-secret sweep | Automated |
| T191–T200 | no backup; plaintext backup; local-only backup; backup overwrite; missing retention; stolen backup; failed backup unnoticed; untested restore; ransomware blast radius; missing recovery objective | AES-256-GCM backup, offsite adapter, retention, restore tooling/tests; scheduled execution/immutable copy/RPO evidence external | Mixed |
| T201–T210 | backend outage; CMS outage; DB outage; first-visit failure; partial snapshot; mutable snapshot; stale pointer; private-data snapshot leak; asset outage; rollback unavailable | versioned content-addressed snapshots, atomic manifest, public projection, clean-browser outage tests, rollback docs | Automated |
| T211–T220 | unauthorized publish; review bypass; self-approval; defacement; SEO poisoning; malicious content; dispatch forgery; duplicate release; partial deploy; failed-release replacement | role workflow, separation of duties, validated/idempotent dispatch, immutable Vercel release, previous-good retention | Automated/Mixed |
| T221–T230 | stack-trace leak; SQL-error leak; path leak; hostname leak; internal-IP leak; secret-bearing error; authorization fail-open; dependency fail-open; timeout fail-open; malformed-error inconsistency | uniform error middleware, redaction, fail-closed guards, health degradation, phase 5/22/release tests | Automated |
| T231–T240 | plaintext HTTP; weak TLS; missing HSTS; insecure cookie; proxy spoofing; clickjacking; referrer leakage; permission abuse; broad CORS; forwarded-origin confusion | HTTPS/HSTS/secure-cookie production gate, strict proxy parser, headers, exact CORS/CSRF tests; TLS scan external | Mixed |
| T241–T250 | frontend-only authorization; exposed bundle secret; unsafe raw HTML; unsafe URL; token in local storage; verbose UI error; hidden-button trust; client validation trust; unsafe third-party script; service-worker poisoning | server enforcement, React escaping/textContent, secret scan, local scripts, SW/CSP/cache tests | Automated |
| T251–T260 | missing security test; missing auth matrix; missing upload test; missing config test; skipped audit; skipped secret scan; missing lint/typecheck; destructive DAST; unreviewed threat change; stale test evidence | security/full CI gates, TDD protocol, non-destructive DAST, release acceptance report | Automated/Documented |
| T261–T270 | snapshot tampering; release-pointer tampering; unauthorized rollback; media replacement; audit tampering; backup tampering; workflow input tampering; object-key collision; stale release race; integrity-check bypass | content addressing, strict payload schema, random keys, protected workflows, checks and ledgers | Automated/Mixed |
| T271–T280 | account-compromise delay; admin-compromise delay; secret-exposure delay; upload incident delay; defacement delay; supply-chain delay; ransomware delay; DDoS delay; data-leak delay; evidence loss | `INCIDENT-RESPONSE.md`, disable/revoke/rotate/quarantine/rollback/restore procedures; provider exercises external | Documented/External gate |
| T281–T290 | debug enabled; weak production secret; unsafe proxy; HTTP CMS origin; local production storage; missing backup target; release trigger disabled; invalid token; excessive upload limit; configuration drift | `productionConfigProblems`, `.env.example`, CI config tests, operator acceptance sweep | Automated/Mixed |
| T291–T300 | stale dependency review; stale role review; dormant admin; ignored alerts; unverified backup; stale API inventory; stale cloud IAM; stale secret; stale threat model; missing independent assessment | periodic review schedule, acceptance report, exact operator evidence; independent assessment external | Documented/External gate |

## Coverage totals

- 300/300 IDs assigned to a threat and control family.
- 210 primarily repository-verifiable threats (`Automated` or repository side
  of `Mixed`).
- 90 threats include production/provider/organizational evidence that cannot be
  truthfully asserted from this checkout.
- Zero IDs are marked “not applicable” merely to improve coverage.

The final acceptance report records which external gates remain unverified.
