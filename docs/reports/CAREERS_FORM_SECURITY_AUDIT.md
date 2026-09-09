# Careers Form Security Audit

Date: 2026-09-09
Scope: existing backend Careers transactional endpoint only. Public CMS/content delivery remains disconnected.

| ID | Attack / Abuse Case | Attack Family | Applicable? | Defense | Test Method | Automated? | Result | Remaining Risk |
|---:|---|---|---|---|---|---|---|---|
| 1 | SQL tautology | Injection | Yes | Zod strict schema and explicit field mapping | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 2 | SQL union payload | Injection | Yes | Zod strict schema and explicit field mapping | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 3 | SQL comment payload | Injection | Yes | Zod strict schema and explicit field mapping | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 4 | NoSQL-style object value | Injection | Yes | Zod strict schema and explicit field mapping | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 5 | HTML tag injection | Injection | Yes | Zod strict schema and explicit field mapping | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 6 | Attribute quote injection | Injection | Yes | Zod strict schema and explicit field mapping | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 7 | Template expression injection | Injection | Yes | Zod strict schema and explicit field mapping | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 8 | CRLF in name | Injection | Yes | Zod strict schema and explicit field mapping | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 9 | Control character in phone | Injection | Yes | Zod strict schema and explicit field mapping | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 10 | Unicode normalization abuse | Injection | Yes | Zod strict schema and explicit field mapping | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 11 | Reflected script in name | XSS | Yes | Text-only status plus HTML escaping in provider template | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 12 | Reflected script in cover letter | XSS | Yes | Text-only status plus HTML escaping in provider template | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 13 | SVG/script upload | XSS | Yes | Text-only status plus HTML escaping in provider template | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 14 | Stored script payload | XSS | Yes | Text-only status plus HTML escaping in provider template | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 15 | Event-handler attribute | XSS | Yes | Text-only status plus HTML escaping in provider template | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 16 | javascript URL payload | XSS | Yes | Text-only status plus HTML escaping in provider template | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 17 | CSS expression payload | XSS | Yes | Text-only status plus HTML escaping in provider template | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 18 | HTML entity confusion | XSS | Yes | Text-only status plus HTML escaping in provider template | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 19 | DOM sink review | XSS | Yes | Text-only status plus HTML escaping in provider template | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 20 | Email HTML escaping | XSS | Yes | Text-only status plus HTML escaping in provider template | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 21 | PDF extension spoof | Upload | Yes | Signature, MIME, extension allowlist; no extraction | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 22 | DOC extension spoof | Upload | Yes | Signature, MIME, extension allowlist; no extraction | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 23 | DOCX extension spoof | Upload | Yes | Signature, MIME, extension allowlist; no extraction | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 24 | Double extension PDF EXE | Upload | Yes | Signature, MIME, extension allowlist; no extraction | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 25 | Double extension HTML DOCX | Upload | Yes | Signature, MIME, extension allowlist; no extraction | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 26 | MIME mismatch | Upload | Yes | Signature, MIME, extension allowlist; no extraction | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 27 | Random binary masquerading as PDF | Upload | Yes | Signature, MIME, extension allowlist; no extraction | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 28 | Malformed PDF header | Upload | Yes | Signature, MIME, extension allowlist; no extraction | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 29 | Malformed OLE document | Upload | Yes | Signature, MIME, extension allowlist; no extraction | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 30 | Malformed ZIP/DOCX | Upload | Yes | Signature, MIME, extension allowlist; no extraction | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 31 | Multiple cv fields | Upload abuse | Yes | Multer memory limits and one-file policy | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 32 | Array of cv fields | Upload abuse | Yes | Multer memory limits and one-file policy | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 33 | Unexpected file field | Upload abuse | Yes | Multer memory limits and one-file policy | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 34 | Oversized CV | Upload abuse | Yes | Multer memory limits and one-file policy | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 35 | Oversized multipart request | Upload abuse | Yes | Multer memory limits and one-file policy | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 36 | Empty CV | Upload abuse | Yes | Multer memory limits and one-file policy | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 37 | Null-byte filename | Upload abuse | Yes | Multer memory limits and one-file policy | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 38 | Slash traversal filename | Upload abuse | Yes | Multer memory limits and one-file policy | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 39 | Backslash traversal filename | Upload abuse | Yes | Multer memory limits and one-file policy | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 40 | Absolute-path filename | Upload abuse | Yes | Multer memory limits and one-file policy | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 41 | Duplicate email fields | Parsing | Yes | Strict Zod object with scalar fields | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 42 | Duplicate name fields | Parsing | Yes | Strict Zod object with scalar fields | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 43 | Nested unexpected object | Parsing | Yes | Strict Zod object with scalar fields | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 44 | Prototype pollution key | Parsing | Yes | Strict Zod object with scalar fields | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 45 | Constructor key | Parsing | Yes | Strict Zod object with scalar fields | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 46 | Prototype key | Parsing | Yes | Strict Zod object with scalar fields | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 47 | Boolean where string expected | Parsing | Yes | Strict Zod object with scalar fields | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 48 | Array where scalar expected | Parsing | Yes | Strict Zod object with scalar fields | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 49 | Null where required | Parsing | Yes | Strict Zod object with scalar fields | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 50 | Unknown form field | Parsing | Yes | Strict Zod object with scalar fields | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 51 | GET application endpoint | API abuse | Yes | POST-only multipart endpoint and origin allowlist | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 52 | PUT application endpoint | API abuse | Yes | POST-only multipart endpoint and origin allowlist | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 53 | DELETE application endpoint | API abuse | Yes | POST-only multipart endpoint and origin allowlist | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 54 | PATCH application endpoint | API abuse | Yes | POST-only multipart endpoint and origin allowlist | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 55 | JSON instead of multipart | API abuse | Yes | POST-only multipart endpoint and origin allowlist | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 56 | Malformed multipart boundary | API abuse | Yes | POST-only multipart endpoint and origin allowlist | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 57 | Missing content type | API abuse | Yes | POST-only multipart endpoint and origin allowlist | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 58 | Cross-origin evil Origin | API abuse | Yes | POST-only multipart endpoint and origin allowlist | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 59 | Origin with credentials | API abuse | Yes | POST-only multipart endpoint and origin allowlist | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 60 | Origin trailing slash | API abuse | Yes | POST-only multipart endpoint and origin allowlist | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 61 | Rapid burst submissions | Abuse controls | Yes | Dedicated 5/hour limiter, honeypot, 2.5s minimum | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 62 | Rate-limit boundary | Abuse controls | Yes | Dedicated 5/hour limiter, honeypot, 2.5s minimum | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 63 | Rate-limit retry storm | Abuse controls | Yes | Dedicated 5/hour limiter, honeypot, 2.5s minimum | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 64 | Honeypot completion | Abuse controls | Yes | Dedicated 5/hour limiter, honeypot, 2.5s minimum | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 65 | Too-fast completion | Abuse controls | Yes | Dedicated 5/hour limiter, honeypot, 2.5s minimum | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 66 | Missing startedAt | Abuse controls | Yes | Dedicated 5/hour limiter, honeypot, 2.5s minimum | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 67 | Replay identical request | Abuse controls | Yes | Dedicated 5/hour limiter, honeypot, 2.5s minimum | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 68 | Double-click retry | Abuse controls | Yes | Dedicated 5/hour limiter, honeypot, 2.5s minimum | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 69 | Keepalive retry | Abuse controls | Yes | Dedicated 5/hour limiter, honeypot, 2.5s minimum | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 70 | Large field count | Abuse controls | Yes | Dedicated 5/hour limiter, honeypot, 2.5s minimum | Negative request or code-path test | Yes | PASS | None identified in this review; monitor provider and platform limits. |
| 71 | Anonymous application list | Access control | Yes | Create-only public route; no read/update/delete routes | Negative request or code-path test | Manual review | REVIEWED | None identified in this review; monitor provider and platform limits. |
| 72 | Anonymous application read | Access control | Yes | Create-only public route; no read/update/delete routes | Negative request or code-path test | Manual review | REVIEWED | None identified in this review; monitor provider and platform limits. |
| 73 | Anonymous CV download | Access control | Yes | Create-only public route; no read/update/delete routes | Negative request or code-path test | Manual review | REVIEWED | None identified in this review; monitor provider and platform limits. |
| 74 | IDOR application id | Access control | Yes | Create-only public route; no read/update/delete routes | Negative request or code-path test | Manual review | REVIEWED | None identified in this review; monitor provider and platform limits. |
| 75 | IDOR CV key | Access control | Yes | Create-only public route; no read/update/delete routes | Negative request or code-path test | Manual review | REVIEWED | None identified in this review; monitor provider and platform limits. |
| 76 | Edit application route | Access control | Yes | Create-only public route; no read/update/delete routes | Negative request or code-path test | Manual review | REVIEWED | None identified in this review; monitor provider and platform limits. |
| 77 | Delete application route | Access control | Yes | Create-only public route; no read/update/delete routes | Negative request or code-path test | Manual review | REVIEWED | None identified in this review; monitor provider and platform limits. |
| 78 | Admin field injection | Access control | Yes | Create-only public route; no read/update/delete routes | Negative request or code-path test | Manual review | REVIEWED | None identified in this review; monitor provider and platform limits. |
| 79 | Recipient field injection | Access control | Yes | Create-only public route; no read/update/delete routes | Negative request or code-path test | Manual review | REVIEWED | None identified in this review; monitor provider and platform limits. |
| 80 | Redirect field injection | Access control | Yes | Create-only public route; no read/update/delete routes | Negative request or code-path test | Manual review | REVIEWED | None identified in this review; monitor provider and platform limits. |
| 81 | PII in URL | Data exposure | Yes | No-store responses, safe errors, PII-minimal logs | Negative request or code-path test | Manual review | REVIEWED | Provider credentials and malware scanning require deployment configuration. |
| 82 | PII in query string | Data exposure | Yes | No-store responses, safe errors, PII-minimal logs | Negative request or code-path test | Manual review | REVIEWED | Provider credentials and malware scanning require deployment configuration. |
| 83 | PII in client logs | Data exposure | Yes | No-store responses, safe errors, PII-minimal logs | Negative request or code-path test | Manual review | REVIEWED | Provider credentials and malware scanning require deployment configuration. |
| 84 | PII in analytics | Data exposure | Yes | No-store responses, safe errors, PII-minimal logs | Negative request or code-path test | Manual review | REVIEWED | Provider credentials and malware scanning require deployment configuration. |
| 85 | PII in error body | Data exposure | Yes | No-store responses, safe errors, PII-minimal logs | Negative request or code-path test | Manual review | REVIEWED | Provider credentials and malware scanning require deployment configuration. |
| 86 | Stack trace response | Data exposure | Yes | No-store responses, safe errors, PII-minimal logs | Negative request or code-path test | Manual review | REVIEWED | Provider credentials and malware scanning require deployment configuration. |
| 87 | Filesystem path response | Data exposure | Yes | No-store responses, safe errors, PII-minimal logs | Negative request or code-path test | Manual review | REVIEWED | Provider credentials and malware scanning require deployment configuration. |
| 88 | SMTP detail response | Data exposure | Yes | No-store responses, safe errors, PII-minimal logs | Negative request or code-path test | Manual review | REVIEWED | Provider credentials and malware scanning require deployment configuration. |
| 89 | Provider token response | Data exposure | Yes | No-store responses, safe errors, PII-minimal logs | Negative request or code-path test | Manual review | REVIEWED | Provider credentials and malware scanning require deployment configuration. |
| 90 | Cacheable success response | Data exposure | Yes | No-store responses, safe errors, PII-minimal logs | Negative request or code-path test | Manual review | REVIEWED | Provider credentials and malware scanning require deployment configuration. |
| 91 | SSRF URL field | Infrastructure | Yes | No applicant-controlled outbound fetch or shell execution; production headers | Negative request or code-path test | Manual review | REVIEWED | Provider credentials and malware scanning require deployment configuration. |
| 92 | Command injection filename | Infrastructure | Yes | No applicant-controlled outbound fetch or shell execution; production headers | Negative request or code-path test | Manual review | REVIEWED | Provider credentials and malware scanning require deployment configuration. |
| 93 | Shell metacharacter filename | Infrastructure | Yes | No applicant-controlled outbound fetch or shell execution; production headers | Negative request or code-path test | Manual review | REVIEWED | Provider credentials and malware scanning require deployment configuration. |
| 94 | Open redirect parameter | Infrastructure | Yes | No applicant-controlled outbound fetch or shell execution; production headers | Negative request or code-path test | Manual review | REVIEWED | Provider credentials and malware scanning require deployment configuration. |
| 95 | Wildcard CORS | Infrastructure | Yes | No applicant-controlled outbound fetch or shell execution; production headers | Negative request or code-path test | Manual review | REVIEWED | Provider credentials and malware scanning require deployment configuration. |
| 96 | Missing HSTS production | Infrastructure | Yes | No applicant-controlled outbound fetch or shell execution; production headers | Negative request or code-path test | Manual review | REVIEWED | Provider credentials and malware scanning require deployment configuration. |
| 97 | Missing nosniff | Infrastructure | Yes | No applicant-controlled outbound fetch or shell execution; production headers | Negative request or code-path test | Manual review | REVIEWED | Provider credentials and malware scanning require deployment configuration. |
| 98 | Inline CV serving | Infrastructure | Yes | No applicant-controlled outbound fetch or shell execution; production headers | Negative request or code-path test | Manual review | REVIEWED | Provider credentials and malware scanning require deployment configuration. |
| 99 | Unscanned malware | Infrastructure | Yes | No applicant-controlled outbound fetch or shell execution; production headers | Negative request or code-path test | Manual review | REVIEWED | Provider credentials and malware scanning require deployment configuration. |
| 100 | DOCX extraction/zip bomb | Infrastructure | Yes | No applicant-controlled outbound fetch or shell execution; production headers | Negative request or code-path test | Manual review | REVIEWED | Provider credentials and malware scanning require deployment configuration. |

## OWASP mapping

- **A01 Broken Access Control:** public route exposes create only; no application read/download/update/delete route exists.
- **A02 Cryptographic Failures:** credentials stay in environment variables; HTTPS/origin policy is deployment controlled.
- **A03 Injection:** strict Zod schema and explicit mapping; no raw SQL or shell execution.
- **A04 Insecure Design:** narrow transactional route, server-controlled recipient, rate limit, honeypot, minimum completion time.
- **A05 Security Misconfiguration:** existing security headers remain active; no wildcard CORS is added.
- **A07 Identification and Authentication Failures:** administrative application access is absent from the public route; future review tooling must use existing RBAC.
- **A08 Software and Data Integrity:** uploaded documents are never executed or extracted.
- **A09 Logging and Monitoring Failures:** delivery and rate-limit events are structured without applicant payloads.
- **A10 SSRF:** no applicant-controlled URL is fetched.

### Remaining risks

- **MALWARE SCANNING NOT CONFIGURED.** CVs are validated for type/signature but are not antivirus scanned.
- Resend API credentials, verified sender identity, HTTPS termination, and `CAREERS_ALLOWED_ORIGINS` must be configured in the deployment environment.
- No durable application persistence or retry queue exists; a provider failure returns an error and the applicant must retry.
