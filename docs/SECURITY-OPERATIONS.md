# Security Operations and External Acceptance Gates

Date: 2026-08-13

Repository tests cannot prove provider or production controls. Record command
output/screenshots and approver/date for every gate below.

## Before production

- **TLS:** `curl -sSI http://<host>` redirects to HTTPS; `curl -sSI
  https://<host>` shows HSTS/nosniff/CSP/referrer/permissions headers. Run an
  authorized TLS scanner; require TLS 1.2+ and no known weak suites.
- **Network:** from an external host, verify only 80/443 are public; 22 is
  allowlisted; 4000/5432 are filtered. Confirm backend direct access cannot
  spoof forwarding headers.
- **Database:** inspect `listen_addresses`, `pg_hba_file_rules`, runtime role
  privileges and TLS status. Runtime role must have no schema/DDL privileges.
- **Storage:** provider public-access block enabled; anonymous list/write denied;
  bucket versioning, encryption, access logs and lifecycle enabled; application
  IAM limited to required object prefixes/actions.
- **GitHub:** branch protection, required reviews/checks, administrator
  enforcement, organization MFA, protected `production` environment and
  deployment reviewers enabled.
- **Tokens:** GitHub token limited to one repository; Vercel token limited to
  one team/project. Tokens exist only as protected environment secrets.
- **Vercel/CDN/DNS:** project membership reviewed; origin/domain ownership
  verified; DNS provider MFA/lock enabled; WAF/rate/bot rules reviewed.
- **Monitoring:** ingest structured security/application/provider logs; retain
  per policy; test alerts for repeated login/authz failures, role/admin changes,
  suspicious uploads, unusual publishing, release failures and backup failures.
- **Backups:** scheduled encrypted offsite backup succeeds; immutable/versioned
  copy exists; restore to isolated target and validate content/RPO/RTO.
- **Container/host:** image scan clean of critical/high findings; process is
  non-root; read-only filesystem/capability restrictions applied where the
  platform supports them; host checklist passes.

## Key rotation

1. Create replacement credential/key with equal or narrower scope.
2. For provider tokens, update protected secret, run one approved release,
   inspect audit logs, then revoke old token.
3. For `MFA_ENCRYPTION_KEY`, retain the old key in restricted recovery custody
   until every user has successfully completed MFA under the replacement or
   has been deliberately re-enrolled. A key loss makes existing TOTP seeds
   unrecoverable.
4. For session key rotation, expect existing sessions to be invalidated.
5. For backup keys, retain historical keys for the full protected-backup
   retention period.

## Cadence

- Daily: release/backup/alert health.
- Weekly: failed-login, authorization-denial and publishing anomalies.
- Monthly: dependencies, provider audit logs, dormant users/admins.
- Quarterly: roles, IAM, secrets, API inventory, threat model, tabletop.
- Semiannual: isolated restore and incident technical drill.
- Annually/major launch: independent penetration test.

See `docs/security/server-hardening-checklist.md`,
`docs/CMS-PRODUCTION-DEPLOYMENT.md`, and
`docs/CMS-OPERATIONS-RUNBOOK.md` for detailed command-level procedures.
