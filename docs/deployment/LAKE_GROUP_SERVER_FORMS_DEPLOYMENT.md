# Lake Group server forms deployment guide

This is the zero-cost, forms-only production deployment for `https://www.lakeoilgroup.com`. The public website remains static IIS content. IIS reverse-proxies only the same-origin contact and careers API paths to a Node process bound to loopback; no Vercel, Render, paid email API, cloud scanner, Redis service, storage service, or new external account is used.

## Server prerequisites

- IIS with HTTPS for `www.lakeoilgroup.com`, URL Rewrite, and ARR reverse-proxy enabled.
- Node.js 22 or later, local/private PostgreSQL with the existing `rate_limit` table migration applied, and the approved Windows service mechanism (NSSM is acceptable).
- ClamAV official Windows build, with `clamd` and `freshclam` installed locally.
- A Gmail App Password for `projectdevemail001@gmail.com`. Do not use the normal Gmail password or Less Secure Apps.

Install the backend dependencies from `C:\LakeGroup\backend` with `npm ci --omit=dev`. Do not put the deployed `.env` file in source control.

## Forms service configuration

Store these variables in the Windows service environment or approved local secret store. The value shown for the App Password is a placeholder, not a credential.

```env
NODE_ENV=production
PORT=4000
DATABASE_URL_RUNTIME=postgresql://lake_app:<PASSWORD>@127.0.0.1:5432/lakegroup
PUBLIC_FORM_TOKEN_SECRET=<32+_CHARACTER_RANDOM_SERVER_ONLY_SECRET>

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=projectdevemail001@gmail.com
SMTP_PASS=<GOOGLE_APP_PASSWORD_SERVER_ONLY>
MAIL_FROM="Lake Group Website Test <projectdevemail001@gmail.com>"

CONTACT_RECIPIENT_EMAIL=projectdevemail001@gmail.com
CAREERS_RECIPIENT_EMAIL=projectdevemail001@gmail.com
CONTACT_ALLOWED_ORIGINS=https://www.lakeoilgroup.com
CAREERS_ALLOWED_ORIGINS=https://www.lakeoilgroup.com

CAREERS_CLAMD_HOST=127.0.0.1
CAREERS_CLAMD_PORT=3310
TRUST_PROXY=1
```

Port 587 uses STARTTLS (`SMTP_SECURE=false` with TLS upgrade required). Certificate validation remains enabled. The sender and both active recipients are intentionally the test Gmail account. The browser never receives SMTP configuration or credentials; submitted visitor email is used only as validated `Reply-To`.

The forms process is deliberately separate from `src/index.js`. It mounts only `/api/contact/*`, `/api/careers/*`, and a loopback-only `/internal/forms-health`; it does not load CMS, admin, media, S3, release, or development routes. Its production gate requires local PostgreSQL-backed replay/rate-limit storage, exact production origins, SMTP configuration, and local ClamAV.

## ClamAV local setup

Use the official Windows build and locate the installed binaries/configuration before running service commands. In `clamd.conf`, remove the example marker and bind the TCP socket only to `127.0.0.1:3310`; never bind it to `0.0.0.0`. In `freshclam.conf`, remove the example marker and configure automatic signature updates. Run `freshclam` before starting the scanner so its virus database exists.

Install/start the scanner with the vendor-supported commands appropriate to the observed install path (commonly `clamd --install-service` followed by `net start clamd`). Before Careers testing, confirm that the service is running, signatures are present, port `127.0.0.1:3310` is reachable from the Node service account, and a harmless PDF scans cleanly. The application fails closed with `SCANNER_UNAVAILABLE` if any scanner operation cannot complete.

## Windows service and IIS

Example NSSM configuration (adapt paths only after checking the actual server installation):

```text
nssm install LakeGroupForms "C:\Program Files\nodejs\node.exe" "C:\LakeGroup\backend\src\forms-index.js"
nssm set LakeGroupForms AppDirectory C:\LakeGroup\backend
nssm set LakeGroupForms AppEnvironmentExtra NODE_ENV=production PORT=4000
nssm set LakeGroupForms Start SERVICE_AUTO_START
nssm start LakeGroupForms
```

Use a least-privilege service account, automatic restart, and non-interactive operation. The service listens only on `127.0.0.1:4000`. Run `npm run forms:verify-smtp` as an administrator-side diagnostic to validate SMTP authentication/connectivity; it sends no message and prints no credential.

Keep the repository `web.config` rules that proxy:

- `/api/contact/*` → `http://127.0.0.1:4000/api/contact/*`
- `/api/careers/*` → `http://127.0.0.1:4000/api/careers/*`

Confirm the real-domain token routes resolve through IIS:

```text
https://www.lakeoilgroup.com/api/contact/token
https://www.lakeoilgroup.com/api/careers/token
```

Public firewall access is TCP 80 only when redirecting HTTP and TCP 443 for IIS HTTPS. Node 4000, ClamAV 3310, PostgreSQL, and administration/CMS services remain local/private with no public firewall rule.

## Controlled acceptance and negative tests

After deployment, submit once from `https://www.lakeoilgroup.com/contact.html` using `smarderve@gmail.com` and a unique `LAKE-CONTACT-TEST-<timestamp>` subject. Confirm one `[TEST] Lake Group Contact — Website Enquiry` message arrives at `projectdevemail001@gmail.com`, its `Reply-To` is the visitor email, and the response includes a reference ID.

Then submit once from `https://www.lakeoilgroup.com/careers.html` using the same applicant email and a small known-safe PDF. Confirm the scanner returns clean, one `[TEST] Lake Group Careers — New Application` message arrives at the test inbox, and its attachment opens correctly.

Perform controlled negative tests for unsupported/mismatched/oversized/missing/malformed CVs, bad origin, replayed token/idempotency key, honeypot, too-fast submission, scanner outage, and SMTP outage. Do not send malware or an EICAR signature to Gmail. Rejections must return no success and cause no delivery. Verify browser refresh/retry after a successful response does not produce duplicate mail.

Stop after successful test delivery. Do not change either recipient to a company/HR address in this deployment phase.
