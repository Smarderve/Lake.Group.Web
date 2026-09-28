# Forms ship-ready status

## Contact proven locally end-to-end

The local lab serves the actual static Contact and Careers pages from `http://127.0.0.1:8080` and mounts the same Contact/Careers routers, SMTP adapter, CV inspection, ClamAV scanner, and PostgreSQL-backed replay/rate-limit implementation as production. Automated tests cover mail shape, attachment encoding, origin checks, scanner/SMTP failure, token replay, and idempotency.

Contact has been proven locally end-to-end: browser form, token, frontend and backend validation, PostgreSQL replay/idempotency, SMTP, real Gmail inbox receipt, and the professional email rendering path. The lab remains available for future controlled regression tests and never submits forms automatically.

## Server-dependent items

Lake Group IT must supply the server-specific IIS installation/proxy setup, approved SMTP credentials, private PostgreSQL connection, local ClamAV installation, scheduled task, and production TLS/domain binding. The production deployment kit verifies these items after they are configured.

Careers implementation is validated automatically, but is not fully E2E proven until a real CV completes browser submission, structural validation, ClamAV scanning, SMTP delivery, and received attachment verification. Final malware-scanner/attachment E2E requires a ClamAV environment verification. Lake-server infrastructure integration remains deployment-specific and is verified by the included deployment script.

## Profiles

- `FORMS_MODE=local-test`: only `http://127.0.0.1:8080`, Gmail STARTTLS, and the approved test recipient are permitted.
- `FORMS_MODE=production`: only `https://www.lakeoilgroup.com`; SMTP is provider-neutral, and both recipients are locked to `admin@lakeoilgroup.com`. `MAIL_FROM` must be the sender authorized by Lake Group IT. Use [forms.production.env.template](C:/Users/USER/Documents/lake.group.web/deployment/windows/forms/forms.production.env.template) as the server-side template.
