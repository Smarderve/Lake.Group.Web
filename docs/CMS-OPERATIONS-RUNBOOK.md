# CMS Operations Runbook

## Service checks

1. `GET https://api.<domain>/health` must return HTTP 200 with
   `status: "ok"` and `db: "up"`.
2. Open `https://cms.<domain>/login`; sign in with a non-privileged smoke-test
   account and confirm the dashboard loads without browser errors.
3. Verify one public endpoint, for example `GET /api/public/news`.
4. In the CMS System Settings screen, confirm `Connected` and
   `Database available`.

Never use `/health` as a substitute for an authenticated workflow smoke test:
it proves process/database reachability, not authorization or publishing.

## Routine release

1. Confirm all required CI checks pass for the exact release commit.
2. Announce the change window and identify the rollback image/commit.
3. Run `npm run db:backup` from `backend/`; verify the new encrypted artifact
   and off-host copy.
4. Review pending Prisma migration SQL. Apply with `npm run db:migrate` using
   the owner connection in a one-off release job.
5. Deploy the immutable API image; wait for health/readiness.
6. Deploy the tested `cms/dist` artifact or promote the matching Vercel build.
7. Run service checks and the critical content workflow:
   create draft → submit → approve → publish → public visibility.
8. Record release commit, image digest, migration, operator, time, and results.

## Rollback

### Application-only

1. Keep the current database in place.
2. Route traffic to the prior known-good API image.
3. Promote the prior Vercel CMS deployment.
4. Re-run service checks.

### Migration-related

Prisma migrations are forward-only by default. Do not improvise destructive
down-migrations during an incident.

1. Stop writes or enable the platform maintenance response.
2. Capture a fresh database backup.
3. Decide whether the schema is backward compatible with the previous image.
4. If compatible, roll back application images only.
5. If data/schema restoration is required, follow
   `docs/security/disaster-recovery.md`; restore into an isolated database,
   validate, then switch traffic after incident-lead approval.

## Incident triage

### Health returns 503

- Check structured API logs around `health check failed`.
- Check database reachability, runtime-role credentials, connection limits,
  storage, and provider status.
- Do not replace the runtime URL with the owner URL to bypass permissions.
- Keep the failed instance out of rotation until `/health` is stable.

### CMS reports network/CORS failures

- Compare the browser `Origin` exactly with `CMS_ALLOWED_ORIGINS`.
- Ensure that same origin is also present in `CSRF_ALLOWED_ORIGINS`.
- Check `VITE_API_BASE_URL` in the deployed build.
- Confirm TLS and custom domains place CMS/API under the intended site.
- A denied preflight should be `403 CORS_ORIGIN_DENIED`; never fix this by
  changing credentialed CORS to `*`.

### Login loops or widespread sign-outs

- Confirm `SESSION_SECRET` and `SESSION_NAME` did not change unintentionally.
- Confirm secure cookies reach the API over HTTPS.
- Check PostgreSQL session-table availability.
- Inspect authentication-denial logs by code/reason without requesting
  passwords, cookies, MFA secrets, or authorization headers.

### Suspicious account activity

- From Users & Roles, revoke the affected user's sessions.
- Reduce the role if approved by the incident lead; do not modify your own role.
- Review Audit Trail by actor/action.
- Rotate credentials and session secret only through the secret manager.
- Rotating `SESSION_SECRET` intentionally invalidates every session.

## Backups and recovery

- Run `npm run db:backup` from `backend/` on the approved schedule. The script
  creates a custom-format dump, encrypts it with AES-256-GCM, uploads the
  encrypted bytes under `BACKUP_STORAGE_PREFIX`, then applies local retention.
- Treat `Backup complete` without `Offsite backup complete` as a failed
  production backup. Never delete the last verified offsite copy.
- Restrict the owner database URL, encryption key, and object write identity
  to the backup job. The runtime web process uses the DML-only database role.
- Alert on backup failure and on absence of a successful backup within the
  approved RPO.
- Perform periodic restore drills using `npm run db:restore` only against an
  isolated target first.
- Retention, encryption, verification, and restore procedures are defined in
  `docs/security/disaster-recovery.md`.

## User administration

- Create initial users with `npm run create-user` in an approved operator
  environment; never expose the command password in shell history or logs.
- Enforce least privilege. Only `SUPER_ADMIN` can manage roles, passwords,
  sessions, audit, and system settings.
- Production enforces MFA enrollment for every CMS role before `/admin`
  access. An unenrolled user may access only the authentication/enrollment
  flow; investigate any `MFA_ENROLLMENT_REQUIRED` event for a previously
  enrolled user.
- TOTP seeds are encrypted with `MFA_ENCRYPTION_KEY`. Back up that key through
  the approved secret manager; losing it requires deliberate user
  re-enrollment. Rotate through a controlled re-enrollment campaign and do not
  revoke old-key custody until every active account is verified.
- Review active users and roles on the approved access-review cadence.

## Monitoring and alerts

Ingest JSON stdout/stderr from the container platform. Alert at minimum on:

- repeated health-check failure;
- elevated 5xx rate or latency;
- repeated authentication/rate-limit denials;
- process restarts/crash loops;
- database pool exhaustion;
- failed backup or migration jobs.

Logs intentionally omit cookies, authorization headers, tokens, and request
bodies. Preserve this allowlist when configuring platform log enrichment.

## Proxy and CSRF checks

- Use `TRUST_PROXY=0` only for direct TLS. Use `1` only when network policy
  prevents all direct backend access and exactly one ingress is present.
  Prefer exact IP/CIDR entries when ingress addresses are stable.
- A production boot failure naming `TRUST_PROXY` means the value is broader
  than the supported topology. Do not bypass it with `true` or a larger hop
  count.
- After ingress changes, verify an HTTPS login returns a `Secure` session
  cookie, the CMS origin succeeds, an unlisted Origin receives
  `CSRF_REJECTED`, and direct spoofed `X-Forwarded-Host/Proto` cannot alter the
  accepted origin.

## Public content release

After publish, unpublish, or rollback, the API's release worker claims the
publication event and sends an authenticated `cms-publication` repository
dispatch. Inspect `GET /admin/public-releases` in the CMS session:

1. `PENDING` or `DISPATCHING` is normal briefly.
2. `RETRY_SCHEDULED` includes the next attempt and a sanitized error. The
   worker retries with exponential backoff up to `PUBLIC_RELEASE_MAX_ATTEMPTS`.
3. `TRIGGERED` records the GitHub request ID. In GitHub, the protected
   `CMS Public Website Release` run must generate the snapshot, run resilient
   delivery and secret checks, build, and deploy.
4. `FAILED` requires an operator to correct credentials/provider health and
   create a new governed publication action; do not edit ledger metadata.
5. Verify `public-content/current.json`, representative pages, uploaded media,
   map, and SEO from the public domain.

If generation or deployment fails, do not purge or replace the current Vercel
deployment. Repair the source or release job and rerun it. Recovery does not
need a full cache purge because the manifest revalidates and releases are
content-addressed.

Rotate `PUBLIC_RELEASE_GITHUB_TOKEN` and `VERCEL_TOKEN` at least every 90 days
and immediately on suspected exposure. Replace the protected environment
secret, run one approved release, verify provider audit logs and the release
ledger, then revoke the old token. GitHub scope is one repository with Contents
write only; Vercel scope is the single production project/team. Credentials
must never appear in dispatch payloads, artifacts, job summaries, or support
logs. Release errors are redacted before durable storage, but an observed
`[REDACTED]` value still requires incident review and rotation.

## Media upload lifecycle

- Editors may upload JPEG, PNG, WebP, GIF, or PDF files up to the configured
  byte limit. The backend verifies bytes, ignores the client filename,
  generates an immutable object key, extracts image dimensions, and creates a
  governed DRAFT media record.
- PDF objects are stored with attachment disposition to avoid inline active
  document execution on the media origin.
- S3-compatible storage is mandatory in production. Local storage is only for
  development and tests.
- Publishing a media record exposes only its public URL and presentation
  metadata. Storage provider/key and uploader/folder administration remain
  private.
- Archiving does not delete bytes because current or retained immutable public
  releases may still reference them. A SUPER_ADMIN may permanently delete only
  an unused DRAFT upload through `DELETE /admin/media/:id/upload`; the action
  is audited.
