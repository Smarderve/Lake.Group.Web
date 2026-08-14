# Security Architecture

Date: 2026-08-13

This is the current-state architecture index required by the 300-threat plan.
Detailed historical evidence remains under `docs/security/`.

## Data flow and trust boundaries

```text
Untrusted visitor
  → Vercel CDN / static HTML
  → content-addressed public snapshot (public projection only)

Employee browser
  → separately deployed CMS
  → HTTPS + exact credentialed CORS + Origin/CSRF checks
  → Express session authentication + production MFA enrollment gate
  → route/object/property authorization + workflow rules
  → Prisma using least-privilege runtime PostgreSQL role

Employee upload
  → auth/RBAC → multipart limits → signature/MIME/parser checks
  → random immutable key → S3-compatible storage
  → governed media record → review/approve/publish → public snapshot

CMS publication
  → durable PublicationEvent → redacted/idempotent repository dispatch
  → protected GitHub environment → snapshot validation
  → immutable Vercel production release; previous release remains on failure
```

## Security boundaries

| Boundary | Data crossing | Repository controls | External enforcement |
|---|---|---|---|
| Internet → static site | public HTML/assets/snapshot | CSP, headers, no third-party scripts, text-safe rendering | TLS, CDN/WAF/DDoS, DNS |
| CMS browser → API | credentials, governed content | secure server session, exact CORS, CSRF Origin checks, rate limits | HTTPS and ingress isolation |
| API → PostgreSQL | accounts, content, audit | Prisma parameterization, runtime/owner URL split | private network, TLS, DB logs |
| API → object storage | media, encrypted backups | strict keys, content validation, random names, PDF attachment | private bucket/IAM, versioning, access logs |
| API → GitHub | release metadata | strict payload, token redaction, retries/idempotency | one-repository token scope |
| GitHub → Vercel | validated release | read-only workflow, SHA actions, protected environment | project-scoped token, approvals |

## Cryptographic material

- Passwords: bcrypt cost 12.
- Sessions: server-side opaque IDs signed by `SESSION_SECRET`.
- TOTP seeds: AES-256-GCM via `MFA_ENCRYPTION_KEY`; new writes encrypted,
  existing plaintext rows are re-sealed after successful verification.
- Backups: AES-256-GCM through the backup tooling.
- Production boot rejects missing/weak keys and insecure origins/storage.

## Availability model

The visitor path does not require a live CMS, API, or database. Publication is
atomic: release failure does not replace `current.json` or the known-good
Vercel deployment.

## Deployment-dependent controls

The repository cannot assert DNS security, TLS ciphers, WAF rules, private
networking, provider IAM, bucket public-access blocks, SIEM alerts, immutable
backup policies, or protected-branch settings. Exact checks are listed in
`SECURITY-OPERATIONS.md`; evidence is required before production acceptance.
