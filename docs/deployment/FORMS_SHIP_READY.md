# Forms ship-ready status

## Proven locally

The local lab serves the actual static Contact and Careers pages from `http://127.0.0.1:8080` and mounts the same Contact/Careers routers, SMTP adapter, CV inspection, ClamAV scanner, and PostgreSQL-backed replay/rate-limit implementation as production. Automated tests cover mail shape, attachment encoding, origin checks, scanner/SMTP failure, token replay, and idempotency.

Actual local end-to-end acceptance additionally requires a local PostgreSQL database, local ClamAV service/signatures, and a Gmail App Password. The lab never sends a form automatically: an operator must submit one controlled Contact form and one controlled Careers form, then confirm delivery to the approved test inbox and confirm the CV attachment opens.

## Server-dependent items

Lake Group IT must supply the server-specific IIS installation/proxy setup, approved SMTP credentials, private PostgreSQL connection, local ClamAV installation, scheduled task, and production TLS/domain binding. The production deployment kit verifies these items after they are configured.

Application functionality is proven locally using the same routes, mailer, scanner and persistence implementation. Lake-server infrastructure integration remains deployment-specific and is verified by the included deployment script.

## Profiles

- `FORMS_MODE=local-test`: only `http://127.0.0.1:8080`, Gmail STARTTLS, and the approved test recipient are permitted.
- `FORMS_MODE=production`: only `https://www.lakeoilgroup.com`; SMTP is provider-neutral and recipients come from the protected production configuration. Use [forms.production.env.template](C:/Users/USER/Documents/lake.group.web/deployment/windows/forms/forms.production.env.template) as the server-side template.
