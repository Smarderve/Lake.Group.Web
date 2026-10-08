# Contact and Careers test delivery

This document covers controlled testing only. Render and Vercel are optional development/staging environments. Final production is `https://www.lakeoilgroup.com` on Lake Group-owned infrastructure: IIS at the public HTTPS edge, a private persistent Node forms service, private ClamAV, and same-origin `/api` routes. Lake Group production does not depend on Render or Vercel.

## Local development

Use local Node, database, mail/scanner test doubles, and development-only secrets. Keep all credentials out of browser code and Git.

## Temporary development/staging

A Vercel static deployment may proxy the four form routes to a Render backend for controlled testing. This is optional staging topology only; its provider URLs and rewrites must never be copied into the Lake Group production architecture. CMS content delivery and admin routes are not part of these form rewrites.

## Final Lake Group production

IIS/ARR proxies `/api/contact/*` and `/api/careers/*` to the private Node service over loopback or a private server address. The service reads the production environment variables below, sends mail through its server-side adapter, and scans Careers uploads through private ClamAV. The browser continues to call same-origin `/api/contact/*` and `/api/careers/*` routes.

## Required backend environment

For staging, use only the isolated test recipient shown below. For final production, both form recipients must be `admin@lakeoilgroup.com` as shown in the production block. `SMTP_USER`/`MAIL_FROM` are sender settings, not recipient settings. Never put mail credentials or the signing secret in Vercel public variables or browser code.

```dotenv
# STAGING TEST ONLY. Never use this recipient in production.
CONTACT_RECIPIENT_EMAIL=projectdevemail001@gmail.com
CONTACT_ALLOWED_ORIGINS=https://www.lakeoilgroup.com
CONTACT_MAIL_API_KEY=<private Resend key>
CONTACT_MAIL_FROM=<verified Lake Group sender>
CAREERS_RECIPIENT_EMAIL=projectdevemail001@gmail.com
CAREERS_ALLOWED_ORIGINS=https://www.lakeoilgroup.com
CAREERS_MAIL_API_KEY=<private Resend key>
CAREERS_MAIL_FROM=<verified Lake Group sender>
CAREERS_CLAMD_HOST=<private ClamAV service hostname>
CAREERS_CLAMD_PORT=3310
PUBLIC_FORM_TOKEN_SECRET=<random secret of at least 32 characters>
```

For final Lake Group production, configure the following recipients in the private backend service environment:

```dotenv
CONTACT_RECIPIENT_EMAIL=admin@lakeoilgroup.com
CAREERS_RECIPIENT_EMAIL=admin@lakeoilgroup.com
```

For a separate test domain, append its **exact** origin to each explicit allowlist. Do not use `*`. The existing `TRUST_PROXY` value must match the actual one-hop/private-ingress topology; forwarded client IP headers from arbitrary clients must not be trusted. The PostgreSQL `rate_limit` migration must be deployed, because form budgets and replay claims use that shared table in production.

Verify the sender domain in Resend and publish its provider-specified SPF, DKIM, and DMARC records. No DNS values are assumed by this repository. ClamAV must be reachable only privately from the backend; the CV is sent to clamd using INSTREAM and is never uploaded to a public scan site.

If any mail setting, recipient, signing secret, or scanner is missing, the corresponding form fails closed. Careers scanner timeout or unknown results never send a CV.

## One-message acceptance test

1. On the canonical website, submit one Contact enquiry with unique subject text and one Careers application with a benign PDF. Do not run attack tests against the live mailbox.
2. Check the test inbox for exactly one message per submission, correct fields, reference ID, verified sender, `[TEST]` subject, and Reply-To set to the validated visitor/applicant email. Confirm the Careers attachment is present and opens safely.
3. Check the backend logs for the matching reference IDs and coarse delivered events; logs must not contain the message body, CV, or API key.
4. Retry the same idempotency key only in a controlled test and confirm no second email is delivered.

Production recipients are fixed by the production configuration gate and deployment templates:

- Careers: `admin@lakeoilgroup.com`
- Contact: `admin@lakeoilgroup.com`

The isolated local/test profile continues to use its test inbox and is rejected by the production configuration gate.
