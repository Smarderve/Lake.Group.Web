# Contact and Careers test delivery

The static Vercel site proxies only four form routes to the existing Render backend: the two token routes and the two POST routes. CMS content delivery and admin routes are not part of these rewrites.

## Required backend environment

Set the following in the Render backend service before testing. Do not put mail credentials or the signing secret in Vercel public variables or browser code.

```dotenv
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

For a separate test domain, append its **exact** origin to each explicit allowlist. Do not use `*`. The existing `TRUST_PROXY` value must match the actual one-hop/private-ingress topology; forwarded client IP headers from arbitrary clients must not be trusted. The PostgreSQL `rate_limit` migration must be deployed, because form budgets and replay claims use that shared table in production.

Verify the sender domain in Resend and publish its provider-specified SPF, DKIM, and DMARC records. No DNS values are assumed by this repository. ClamAV must be reachable only privately from the backend; the CV is sent to clamd using INSTREAM and is never uploaded to a public scan site.

If any mail setting, recipient, signing secret, or scanner is missing, the corresponding form fails closed. Careers scanner timeout or unknown results never send a CV.

## One-message acceptance test

1. On the canonical website, submit one Contact enquiry with unique subject text and one Careers application with a benign PDF. Do not run attack tests against the live mailbox.
2. Check the test inbox for exactly one message per submission, correct fields, reference ID, verified sender, `[TEST]` subject, and Reply-To set to the validated visitor/applicant email. Confirm the Careers attachment is present and opens safely.
3. Check the backend logs for the matching reference IDs and coarse delivered events; logs must not contain the message body, CV, or API key.
4. Retry the same idempotency key only in a controlled test and confirm no second email is delivered.

After this succeeds, the later production recipient change is **environment configuration only**:

- Careers: `maryam.mgeni@lakeoilgroup.com`
- Contact: `admin@lakeoilgroup.com`

Neither final recipient is active in the test configuration above.
