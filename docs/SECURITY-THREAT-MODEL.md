# Security Threat Model

Date: 2026-08-13

## Scope and method

Scope is the static public site, CMS, Express API, PostgreSQL, object storage,
publication pipeline, CI/CD, and repository-configurable deployment controls.
The method combines STRIDE-style data-flow review with OWASP Top 10:2025,
OWASP API Top 10:2023, and NIST CSF 2.0.

The 300 identifiers and full family enumeration are in
`SECURITY-REGRESSION-MATRIX.md`. The original plan references but does not
include the prior catalogue; this limitation is preserved as evidence rather
than hidden.

## Adversaries

- unauthenticated Internet attacker
- compromised/abusive employee account
- compromised privileged administrator
- malicious uploaded content
- compromised dependency or CI action
- stolen provider/deployment credential
- network/edge attacker where TLS or origin restrictions are wrong
- ransomware/destructive operator or infrastructure failure

## High-value assets

Credentials and TOTP seeds; sessions; governed corporate truth; draft/private
content; publication authority; audit history; database and backups; media and
public release integrity; GitHub/Vercel/cloud credentials.

## Principal abuse paths and controls

1. Credential attack → login limiter/password policy/MFA → server-side session.
2. Employee overreach → role/object/property checks → workflow/audit.
3. Malicious content → schema/media validation → safe render/CSP → snapshot.
4. Upload attack → byte signature/parser/size checks → isolated random key.
5. Outbound URL attack → protocol/DNS/IP/redirect guard → timeout.
6. Supply-chain attack → lockfiles/audits/SHA-pinned actions/read-only CI.
7. Release compromise → strict dispatch/protected environment/idempotency.
8. Data destruction → encrypted offsite backup/restore/immutable public release.
9. Platform failure → known-good static snapshot remains available.

## Newly closed gaps in this execution

- All configured CMS roles are denied `/admin` until MFA enrollment; `/auth`
  enrollment remains available to prevent lockout.
- New TOTP seeds are AES-256-GCM encrypted before persistence.
- CMS/auth responses are `private, no-store`.
- PDF uploads carry attachment disposition locally and in S3.
- Workflow actions use immutable commit SHAs, read-only permissions, and
  non-persistent checkout credentials.

## Residual and external risk

Static pages still require inline script/style CSP allowances pending a
deterministic hash/externalization build. Production networking, TLS, WAF,
provider IAM, bucket access controls, alerts, branch protection, immutable
backup settings, and independent penetration testing require external evidence.
