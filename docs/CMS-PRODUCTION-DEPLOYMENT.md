# CMS Production Deployment Architecture

## Status and boundary

Specification Phase 18 is implemented as deployable configuration, production
guards, CI, and operator documentation. No infrastructure was created and no
deployment was performed. Production domains, hosting accounts, PostgreSQL
credentials, and secret values remain operator-owned external inputs.

## Topology

| Component | Target | Public address pattern | Artifact |
| --- | --- | --- | --- |
| Public website | Existing Vercel project | `https://www.<domain>` | Existing static site |
| CMS | Separate Vercel project rooted at `cms/` | `https://cms.<domain>` | `cms/dist` |
| API | Container platform behind managed TLS | `https://api.<domain>` | `backend/Dockerfile` |
| PostgreSQL | Private managed/server database | No public browser route | Prisma schema/migrations |

Use CMS and API custom subdomains under the same registrable domain. They are
different origins (so CORS applies) but remain same-site for the API's
`SameSite=Lax` session cookie. Do not deploy the CMS on a provider domain while
the API uses an unrelated site unless the session-cookie design is explicitly
changed and security-reviewed.

## Environment contract

### CMS build-time

- `VITE_API_BASE_URL=https://api.<domain>`
- This is public bundle data. No database URL, session secret, token, or
  infrastructure credential may use the `VITE_` prefix.

### API runtime

- `NODE_ENV=production`
- `PORT` supplied by the platform (default `4000`)
- `DATABASE_URL`: migration/owner connection, available only to release jobs
- `DATABASE_URL_RUNTIME`: distinct DML-only runtime role
- `SESSION_SECRET`: at least 32 random characters; 64 random bytes recommended
- `MFA_REQUIRED_ROLES=SUPER_ADMIN,EDITOR,REVIEWER,CONTACT_MANAGER,VIEWER`;
  production rejects a partial/unknown role list and blocks `/admin` for an
  unenrolled account while keeping `/auth/mfa/setup` reachable
- `MFA_ENCRYPTION_KEY`: exactly 32 random bytes encoded as base64 (`openssl
  rand -base64 32`), stored separately from the session and backup keys
- `SESSION_COOKIE_SECURE=true`
- `SESSION_NAME`: stable across releases
- `SESSION_TTL_MS`, `SESSION_ROLLING`, `RECENT_AUTH_WINDOW_MS`
- `CMS_ALLOWED_ORIGINS=https://cms.<domain>`
- `CSRF_ALLOWED_ORIGINS=https://cms.<domain>`
- `TRUST_PROXY=0` for direct TLS; `1` only when the service is ingress-only
  behind exactly one proxy; otherwise an exact proxy IP/CIDR allowlist such as
  `10.20.0.0/16,10.30.0.10`. Production rejects booleans, hostnames, negative
  values, and hop counts above one.
- `LOG_LEVEL=info`
- `BACKUP_ENCRYPTION_KEY`: separate random value of at least 32 characters
- `BACKUP_RETENTION_DAYS`: approved local retention window
- `BACKUP_STORAGE_PREFIX`: private offsite key prefix, for example
  `production/backups/`
- `MEDIA_STORAGE_DRIVER=s3`
- `MEDIA_PUBLIC_BASE_URL`: exact HTTPS CDN/media origin
- `MEDIA_UPLOAD_MAX_BYTES`: approved upload ceiling (default 10 MiB)
- `S3_REGION`, `S3_BUCKET`, and optional `S3_ENDPOINT` /
  `S3_FORCE_PATH_STYLE`; prefer workload identity, otherwise provide
  `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` through the secret manager
- `PUBLIC_RELEASE_ENABLED=true`
- `PUBLIC_RELEASE_GITHUB_REPOSITORY=owner/repository`
- `PUBLIC_RELEASE_GITHUB_TOKEN`: fine-grained token limited to Contents write
  access on that single repository (required for repository dispatch), with no
  organization-wide or administration permission
- `PUBLIC_RELEASE_API_BASE_URL`: exact HTTPS production API origin

The process refuses production startup when the owner/runtime database split,
strong session/MFA/backup secrets, all-role MFA policy, production object
storage, recognized GitHub token format, safe proxy trust, protected release
trigger, or exact HTTPS CMS/CSRF origin contract is missing.

## CMS on Vercel

1. Create a project with repository root `cms`.
2. Select Vite; `cms/vercel.json` defines build, output, SPA rewrites, immutable
   hashed-asset caching, and browser security headers.
3. Set `VITE_API_BASE_URL` separately for Preview and Production.
4. Attach `cms.<domain>` and require HTTPS.
5. Restrict project access until the initial super administrator and MFA are
   verified.
6. Protect the production branch with the `CMS Checks` workflow. Vercel Git
   integration should deploy only protected `main`; previews may build from
   pull requests.

## API container

`backend/Dockerfile` builds dependencies/Prisma separately, copies only runtime
files, runs as the non-root `node` user, and exposes an HTTP health check.

Release order:

1. Build and scan the immutable image from a reviewed commit.
2. Back up PostgreSQL and verify the backup artifact.
3. Run `npm ci && npm run db:migrate` in a one-off release job with
   `DATABASE_URL` (owner). The web container must receive only
   `DATABASE_URL_RUNTIME`.
4. Start the new image with the runtime environment above.
5. Require `/health` HTTP 200 before routing traffic.
6. Smoke-test login, dashboard, one read, and a non-destructive draft edit.
7. Route traffic gradually if the platform supports it.

The service handles `SIGTERM`/`SIGINT`, stops accepting connections, waits for
the HTTP server to close, and disconnects Prisma before exiting.

## Browser/API security boundary

- `/auth`, `/admin`, and `/health` return credentialed CORS headers only for an
  exact `CMS_ALLOWED_ORIGINS` match.
- Unknown preflights receive `403 CORS_ORIGIN_DENIED`.
- State-changing `/auth` and `/admin` requests independently require an origin
  accepted by `CSRF_ALLOWED_ORIGINS`.
- `/api/public` keeps wildcard CORS without credentials for the public site.
- TLS is terminated by the managed platform/reverse proxy; the application
  enforces secure cookies, HSTS, frame denial, content-type protection,
  referrer policy, permissions policy, request-size limits, and rate limits.
- Forwarded host/protocol are accepted only when Express's trust policy accepts
  the direct peer. Never combine `TRUST_PROXY=1` with a directly reachable
  backend port.

## CI/CD gates

- `.github/workflows/cms.yml`: CMS install, unit/component tests, app/test
  typecheck, production build, performance budget, Playwright critical flow,
  and deployable artifact upload.
- `.github/workflows/backend.yml`: syntax, seed verification, lint, full API
  tests, production build, and container build.
- `.github/workflows/public-release.yml`: protected CMS repository dispatch,
  atomic snapshot generation, resilience and secret checks, Vercel build, and
  production deploy under the protected `production` environment. Workflow
  permissions are read-only, checkout does not persist `GITHUB_TOKEN`, and
  `VERCEL_TOKEN` exists only in the three Vercel command environments.
- Existing security, audit, accessibility, and Lighthouse workflows remain
  independent required checks.
- Deployment credentials belong in the hosting provider/GitHub environment,
  never repository files. Production deployment should require environment
  approval.

Token operations:

1. Store GitHub and Vercel credentials only as protected environment secrets.
2. Rotate at least every 90 days and immediately after personnel, scope, or
   provider-security changes.
3. Create the replacement credential first, update the environment secret,
   run one approved release, then revoke the old credential.
4. Review GitHub/Vercel audit logs and `/admin/public-releases` after rotation.
   Never paste credentials into dispatch payloads, job summaries, artifacts,
   issue comments, or command-line arguments.

## External inputs required before first release

These cannot be implemented safely in source:

- approved production and preview domain names;
- Vercel and container-platform projects/accounts;
- private PostgreSQL host and owner/runtime credentials;
- generated session and backup-encryption secrets;
- S3-compatible media/backup bucket, CDN origin, and workload identity or
  scoped object credentials;
- GitHub fine-grained dispatch token and protected environment secrets
  `PUBLIC_API_BASE_URL`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and
  `VERCEL_PROJECT_ID`;
- DNS and TLS ownership;
- backup destination, alert destination, on-call rota, and maintenance window;
- final retention/RPO/RTO approval.

Their absence does not block local build or release-candidate verification, but
it blocks an actual production deployment.

## Resilient public website

The corporate site is deployed as static HTML/assets plus
`public-content/current.json` and immutable content-addressed release JSON.
The release job generates this artifact from PUBLISHED backend projections
before Vercel promotion. Visitors never require a live CMS/backend/database for
business content, including in a clean browser.

The backend worker now converts PUBLISHED, UNPUBLISHED, and ROLLED_BACK ledger
events into authenticated `repository_dispatch` requests. Status, bounded
retries, request IDs, and errors remain in publication-event metadata and are
visible at `GET /admin/public-releases`. The workflow retains the previous
Vercel deployment whenever generation, checks, or deployment fail. See
`PUBLIC-DELIVERY-ARCHITECTURE.md`, `PUBLISHING-PIPELINE.md`, and
`FAILURE-RESILIENCE.md`.
