# Incident Response

Owner: Security/Operations · Review cadence: quarterly and after every incident

## Universal sequence

1. Detect and open a time-stamped incident record.
2. Validate scope without destroying evidence.
3. Contain access and preserve logs/snapshots.
4. Eradicate the root cause and add a failing regression.
5. Recover from known-good data/release.
6. Verify controls and monitor for recurrence.
7. Document lessons, owners, deadlines, and threat-matrix changes.

## Immediate playbooks

| Incident | Contain | Recover and verify |
|---|---|---|
| CMS account compromise | deactivate user, revoke sessions, preserve audit rows | reset password/MFA, review role/content actions |
| Administrator compromise | revoke sessions/tokens, freeze publishing | verify admin roster, rotate credentials, restore roles |
| Secret exposure | revoke first, remove exposure, scan history/logs | issue scoped replacement, verify audit logs |
| Malicious upload | unpublish/quarantine object, preserve hash/metadata | delete governed references, test signature rule |
| Defacement/unauthorized publish | stop release worker, rollback Vercel/snapshot | compare audit/release ledgers, republish approved version |
| Database compromise | isolate DB/backend, revoke DB credentials | restore isolated backup, validate integrity, rotate all dependent secrets |
| Supply-chain compromise | disable affected workflow/package, preserve build logs | pin/remove dependency, rebuild from trusted source |
| Ransomware/data destruction | isolate hosts and credentials | restore protected offsite copy; do not overwrite evidence |
| DDoS | engage CDN/provider controls, protect origin | tune edge rules after controlled review |
| Data leakage | stop exposure, preserve access logs, notify leadership/legal | rotate credentials and validate minimal projections |

## Evidence to preserve

AuditLog rows; structured application logs; GitHub/Vercel/provider audit logs;
release IDs/manifests; object versions; database backup hashes; affected object
hashes; timestamps in UTC; operator actions and approvals.

Never paste credentials, session IDs, TOTP seeds, private data, or raw malicious
payloads into tickets or public chat. Use restricted evidence storage.

## Exercises

Quarterly tabletop: compromised CMS admin plus unauthorized publication.
Semiannual technical drill: revoke sessions/tokens, rollback release, restore
backup to isolation, and emit/acknowledge a SIEM test alert.
