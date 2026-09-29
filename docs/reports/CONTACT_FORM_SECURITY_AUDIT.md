# Contact form security audit — 2026-09-24

## Result

The controlled test flow uses `POST /api/contact/messages` and a short-lived token from `/api/contact/token`. The destination is **only** the server-side `CONTACT_RECIPIENT_EMAIL`; the testing value is `projectdevemail001@gmail.com`. `admin@lakeoilgroup.com` is documented for later activation and is not configured by this change. Missing recipient, sender, API key, or signing secret fails closed. The public Contact page no longer uses `data-mock`.

The automated Contact suite in `backend/tests/contact.test.js` contains **61 passing cases**. The individual attack names and assertions are in that test file. The suites use a mocked mailer; no attack test sends real email.

| Attack / category | Control | Automated cases | Result | Residual risk |
|---|---|---|---|---|
| Visitor-controlled mail routing and redirects | Strict Zod object, fixed provider subject, server recipient | `to`, `cc`, `bcc`, `from`, `replyTo`, `sender`, `recipient`, `redirect`, `returnUrl`, `next`, `successUrl` | PASS | Deployment must keep the recipient env var at the test inbox. |
| SQL/NoSQL-style object and prototype payloads | Scalar field schema and unknown-key rejection | `$ne`, `$gt`, arrays, objects, `prototype`, `constructor` across fields | PASS | Applicant text is never interpolated into SQL or shell commands. |
| Header and log injection | Email validation, single-line metadata, safe error codes | CRLF in email and subject; NUL and bidi characters | PASS | Mail provider must preserve structured API fields. |
| XSS and HTML | HTML escaping; source text is plain text | Script markup in the message remains escaped in mocked HTML mail | PASS | Mail clients have their own rendering rules. |
| Oversize and type confusion | 32 KB JSON parser, strict lengths and types | Long name/email/phone/subject/message, null/number/array/object, wrong Content-Type, malformed JSON | PASS | Reverse proxy must also enforce a reasonable request timeout. |
| Spam and bots | Honeypot, elapsed-time signed token, URL/repetition checks, shared rate-limit table | Filled website, too many URLs, tampered token, replay, duplicate key, wrong Origin and cross-site metadata | PASS | Origin can be forged by non-browser clients; token and shared rate limits supply additional controls. |
| Unsupported methods | Only POST message route | GET, PUT, PATCH, DELETE | PASS | Vercel rewrite must be limited to exact form routes. |
| Delivery failure | Server-only mail API, finite timeout, private response | Missing recipient and separate mailer 429/500/malformed/transport tests | PASS | A provider timeout can leave delivery outcome uncertain; idempotency deliberately blocks an automatic resend. |

## Operational controls

- `Cache-Control: no-store` is set for form responses. Existing Vercel and backend security headers remain in effect.
- IP, email, combined identity, and global budgets are stored in the existing PostgreSQL `rate_limit` table when the backend uses its production database. In-memory storage is only a local/test fallback.
- Express proxy trust follows the existing `TRUST_PROXY` setting. Only enable forwarded-IP trust for a known ingress topology.
- Logs contain request ID, coarse outcome, and code. Message body and provider payload are not logged.
- The sender must be a Resend-verified Lake Group identity. Publish the SPF, DKIM, and DMARC records specified by the actual provider; none are invented here.

## Delivery gate

No real Contact email has been sent or inbox receipt verified. The local backend has no configured Contact mail API key or sender. Set `CONTACT_RECIPIENT_EMAIL=projectdevemail001@gmail.com`, sender/API key, and `PUBLIC_FORM_TOKEN_SECRET` in the deployed backend, then run one controlled submission and verify the inbox. Keep `admin@lakeoilgroup.com` inactive until that succeeds.
