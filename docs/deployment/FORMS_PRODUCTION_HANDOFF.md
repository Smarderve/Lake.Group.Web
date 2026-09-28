# Lake Group production forms handoff

## Included

The Windows deployment kit runs the isolated Node forms service as `LakeGroupForms`, bound only to `127.0.0.1:4000`. IIS serves the static site and proxies only `/api/contact/*` and `/api/careers/*` through URL Rewrite and ARR. The completed server configuration belongs at `C:\ProgramData\LakeGroup\Forms\forms.env`, outside the website, protected for Administrators and SYSTEM.

## Proven locally

Contact is proven end-to-end: browser form, token, frontend/backend validation, PostgreSQL replay/idempotency, SMTP, professional email rendering, and Gmail inbox receipt. Careers implementation is validated automatically; final malware-scanner/attachment E2E requires ClamAV environment verification. This does not claim Lake server E2E verification.

## Prerequisites and IT inputs

- Windows/IIS administrator access, correct IIS site name, URL Rewrite, ARR Proxy enabled, and an HTTPS binding for `www.lakeoilgroup.com`.
- SMTP host, port, TLS mode, username, password/app credential, and an SMTP-authorized `MAIL_FROM` sender. The destination is always `admin@lakeoilgroup.com`; it is not assumed to be the sender.
- Private local PostgreSQL owner/migration credentials (or provisioning permission) and a separate DML-only runtime URL.
- Local ClamAV and FreshClam, signatures current, listening only on `127.0.0.1:3310`.

## Commands

```powershell
cd C:\LakeGroup\deployment\windows\forms
.\deploy-forms.ps1 -ProjectRoot C:\LakeGroup -SiteName 'Lake Group' -EnvFile C:\ProgramData\LakeGroup\Forms\forms.env
.\verify-forms.ps1 -ProjectRoot C:\LakeGroup -SiteName 'Lake Group'
.\rollback-forms.ps1 -ProjectRoot C:\LakeGroup
```

Use `deploy-forms.ps1 -WhatIf` for safe dry-run validation; it does not send form mail or replace configuration. Rollback removes deployment-owned configuration, task, IIS changes, and generated files, but never shared Node, PostgreSQL, or IIS software.

## Security model

Production mode is fail-closed and locks both recipients to `admin@lakeoilgroup.com`, both origins to `https://www.lakeoilgroup.com`, private PostgreSQL runtime persistence, explicit SMTP configuration, and loopback ClamAV. The browser cannot choose recipients. Contact remains independent of ClamAV; Careers fails closed if scanning is unavailable. No public firewall rule is created for Node, PostgreSQL, or ClamAV.

The local regression profile remains separately locked to `FORMS_MODE=local-test`, `http://127.0.0.1:8080`, and `projectdevemail001@gmail.com`; it is never deployed as production data.
