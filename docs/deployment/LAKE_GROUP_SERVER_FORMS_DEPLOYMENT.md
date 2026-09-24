# Lake Group server forms deployment guide

This guide deploys the static website and Node forms service on Lake Group infrastructure. Render and Vercel remain optional development or staging targets only.

## Components

- IIS 10 with URL Rewrite and Application Request Routing (ARR)
- Node.js 20 LTS or newer supported LTS
- PostgreSQL on a private interface
- ClamAV/clamd on the same server or a private Lake Group network address
- Optional private Redis-compatible store when more than one forms instance runs

Install dependencies in `backend/` with `npm ci --omit=dev`, then run the production start command defined by `backend/package.json`.

## Production environment

Create the environment for the Node service on the Lake Group server. Never commit it, place it in frontend files, or expose it through IIS.

```env
NODE_ENV=production
PORT=4000
PUBLIC_FORM_TOKEN_SECRET=<32+ byte cryptographically random secret>
CAREERS_RECIPIENT_EMAIL=projectdevemail001@gmail.com
CONTACT_RECIPIENT_EMAIL=projectdevemail001@gmail.com
CAREERS_ALLOWED_ORIGINS=https://www.lakeoilgroup.com
CONTACT_ALLOWED_ORIGINS=https://www.lakeoilgroup.com
CAREERS_MAIL_API_KEY=<secret>
CAREERS_MAIL_FROM=<verified sender>
CONTACT_MAIL_API_KEY=<secret>
CONTACT_MAIL_FROM=<verified sender>
CAREERS_CLAMD_HOST=127.0.0.1
CAREERS_CLAMD_PORT=3310
TRUST_PROXY=<exact IIS proxy IP or CIDR, or 0 for direct TLS>
```

Generate the token secret with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. Keep the current test recipient until controlled delivery tests pass; later change Careers to `maryam.mgeni@lakeoilgroup.com` and Contact to `admin@lakeoilgroup.com`.

Production also requires the existing database, session, MFA, and storage variables documented in `backend/.env.example`.

## Persistent Node service

Run the backend as a persistent Windows service (NSSM, PM2 with a Windows service wrapper, or the approved Lake Group process manager). Bind it to loopback or a private interface only. Do not publish port 4000.

```text
nssm install LakeGroupForms "C:\Program Files\nodejs\node.exe" "C:\LakeGroup\backend\src\index.js"
nssm set LakeGroupForms AppDirectory C:\LakeGroup\backend
nssm set LakeGroupForms AppEnvironmentExtra NODE_ENV=production PORT=4000
nssm start LakeGroupForms
```

Use the server secret store/environment mechanism for all remaining variables. Configure automatic restart and private log rotation.

## IIS reverse proxy

Install IIS URL Rewrite and ARR, enable proxy, and deploy the repository `web.config`. The rules proxy only `/api/contact/*`, `/api/careers/*`, and `/api/public-form-token` (when that compatibility endpoint is enabled) to `http://127.0.0.1:4000`. The raw Node port is never internet-facing.

The current browser clients use same-origin `/api/contact/token`, `/api/careers/token`, `/api/contact/messages`, and `/api/careers/applications`; no provider hostname is embedded in frontend JavaScript.

Keep `/admin`, CMS APIs, Prisma, database endpoints, and debug routes private. The public website remains static HTML at `https://www.lakeoilgroup.com`.

## HTTPS, origin, and proxy trust

Terminate TLS at Lake Group IIS, redirect HTTP to HTTPS, and keep HSTS enabled there. Allow only `https://www.lakeoilgroup.com` in production form origin variables. Set `TRUST_PROXY` to the exact IIS proxy address/CIDR; never use unrestricted `true`. This keeps `req.ip` reliable for rate limiting and audit logs.

## ClamAV

Install ClamAV locally and bind clamd to `127.0.0.1:3310`, or use a private Lake Group network address protected by firewall rules. Do not expose port 3310 publicly. Public responses must reveal only a generic unavailable status.

## Mail and rate limits

Mail is behind the backend mailer adapter. Configure the existing transactional HTTPS provider now; the adapter can later target Lake Group's approved SMTP relay without changing routes. Contact has no upload or ClamAV dependency.

A single Node instance may use the existing local rate-limit store with persistent storage appropriate to Lake Group operations. Multiple instances require a shared private Redis-compatible store. Never use public Redis.

## Firewall

Public: TCP 80 (redirect only) and TCP 443 (IIS). Private only: Node port 4000, ClamAV 3310, Redis, PostgreSQL, CMS/admin services, and diagnostic ports. Restrict administration to the Lake Group management network.

## Smoke test

After configuring secrets, run one controlled Contact and one controlled Careers submission from `https://www.lakeoilgroup.com`, using `smarderve@gmail.com` as the visitor/applicant address and the temporary test recipient. Confirm acknowledgement, recipient delivery, logs without secrets, token replay rejection, origin rejection, rate limiting, and CV malware rejection. Do not bypass security checks when configuration is missing.

## Health, restart, and rollback

Use a private local health check for detailed diagnostics. Any public health response must not include API keys, scanner addresses, filesystem paths, database strings, or internal IPs.

Restart with the service manager after environment changes. Roll back by restoring the previous backend artifact and environment version, restarting it, then verifying both public form endpoints. Static files can be restored from the previous approved website release.

## Environment separation

- **Local development:** localhost, test secrets, local mail/scanner mocks.
- **Temporary staging:** Render/Vercel or another isolated test host; provider rewrites are staging-only.
- **Lake Group production:** IIS plus a private persistent Node service and Lake Group mail, scanner, and rate-limit infrastructure at `https://www.lakeoilgroup.com`. No Render or Vercel account is required.
