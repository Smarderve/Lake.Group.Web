# Careers form security audit — 2026-09-24

## Result

The Careers page sends multipart data to `POST /api/careers/applications`; its old application `mailto:` flow is removed. The server-selected test recipient is `projectdevemail001@gmail.com`. `maryam.mgeni@lakeoilgroup.com` is documented for later activation only. A CV is delivered only after structural inspection and a clean private scanner result.

The automated Careers suite in `backend/tests/careers.test.js` contains **53 passing cases**. The individual attack names and assertions are in that test file. All automated delivery uses a mocked mailer and scanner.

| Attack / category | Control | Automated cases | Result | Residual risk |
|---|---|---|---|---|
| Mail routing and injection | Strict scalar schema, fixed server recipient/subject, HTML escaping | `to`, `cc`, `bcc`, `from`, `replyTo`, `sender`, recipient, CRLF and NUL metadata | PASS | Sender identity must be verified with the provider. |
| Invalid applicant fields | Zod `.strict()`, limits, normalization | Empty/long name, email, phone, nationality, opportunity, cover letter; unknown fields and false consent | PASS | Text content can still be spam; layered limits apply. |
| CV type and filename spoofing | PDF/DOCX only, 5 MB max, MIME plus byte/structure checks, safe filename | DOC, double extension, executable renamed PDF, fake PDF, active PDF, missing DOCX part | PASS | Complex PDF active content can be obfuscated; private AV scanning is mandatory. |
| DOCX archive abuse | Bounded central-directory inspection, no macros/embedded executables/nested archive, encrypted entries rejected | Valid DOCX, missing document, macro, embedded executable, nested archive | PASS | Compression metadata may be hostile; ClamAV is still required before delivery. |
| Malware and scanner failure | ClamAV INSTREAM, finite timeout, concurrency cap, fail closed | Clean, infected, unavailable, unknown verdict | PASS with injected scanner | Private clamd host is not configured locally; real scanner integration remains unverified. |
| Bot and duplicate delivery | Honeypot, signed expiring form token, distributed rate limits, one-time claim | Cross-origin, missing config, replay and duplicate idempotency key; token unit tests | PASS | Non-browser clients can forge Origin. Rate limits and scanner add further protection. |
| Resource exhaustion | 5 MB file/6 MB request, one file, Multer field limits, four active uploads per process | File limits and malformed input paths in route tests | PARTIAL | Load and scanner-timeout testing against deployed infrastructure remains. |

## Operational controls

- CVs are held in bounded memory and sent to private clamd using INSTREAM. No original filename is used as a filesystem path. Scanner errors, timeout, and unknown verdicts return 503; no unscanned attachment is emailed.
- Production rate limits and token/idempotency claims use the existing PostgreSQL `rate_limit` table shared across instances. In-memory fallback is for local tests only.
- `CAREERS_RECIPIENT_EMAIL`, `CAREERS_MAIL_API_KEY`, `CAREERS_MAIL_FROM`, `CAREERS_CLAMD_HOST`, and the shared form secret are server-side environment values. Missing values fail closed.
- The sender must be verified with Resend. SPF, DKIM, and DMARC must follow the actual provider's DNS instructions.

## Delivery gate

No real Careers application has been sent or attachment received in the test inbox. The local backend lacks the mail key, sender, and private ClamAV host. Configure those in deployment, submit one controlled benign PDF, and verify exactly one email, attachment, sender, Reply-To, subject, and reference. Keep Maryam's address inactive until this test succeeds.
