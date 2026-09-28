# Lake Group production forms handoff

The application is complete and locally verified.

Choose the deployment section matching your server:

- A. Windows Server / IIS
- B. Linux / Nginx or Apache

Before deployment, create the protected production environment file from the supplied template and provide Lake Group's own SMTP and PostgreSQL credentials. No credentials are included in source control.

## Local acceptance evidence

**Contact — PROVEN LOCALLY END-TO-END**

Contact completed the real local browser, validation, token, PostgreSQL replay/idempotency, SMTP, and Gmail-receipt path.

**Careers — PROVEN LOCALLY END-TO-END**

Careers completed:

```
browser
→ frontend validation
→ token
→ multipart CV upload
→ backend validation
→ structural CV inspection
→ PostgreSQL replay/idempotency
→ Microsoft Defender
→ CLEAN
→ SMTP
→ Gmail
→ attachment received
→ SHA-256 integrity match
```

Request ID: `b3906583-77c0-41b3-8d3f-c401b5e6c725`.

The received `Lake-Group-Careers-Test-CV.pdf` had the same SHA-256 as the submitted file: `1b9c7007e0120b25edd99f003be410db7924d6b2171474388d85b1f7bc2efcb8`. Exactly one Careers email was received. The harmless scanner test was `CLEAN`; EICAR was `MALWARE_DETECTED` and prevented mail delivery.

This is not a claim that the Lake Group production server has been tested.

## A. Windows Server / IIS

Use `deployment/windows/forms/`. It deploys an IIS-to-loopback-Node setup and supports PostgreSQL, SMTP, and either Microsoft Defender or loopback ClamAV. The IIS site name is a deployment parameter; it is not hard-coded.

```powershell
cd C:\LakeGroup\deployment\windows\forms
.\deploy-forms.ps1 -ProjectRoot C:\LakeGroup -SiteName '<IIS_SITE_NAME>' -EnvFile '<PROTECTED_ENV_FILE>'
```

If Windows Defender is healthy, select `CAREERS_SCANNER_PROVIDER=defender`. If ClamAV is selected, it must be healthy and listen only on `127.0.0.1:3310`.

## B. Linux / Nginx or Apache

Use `deployment/linux/forms/`. It includes deployment, verification, and rollback scripts, a systemd service, a Nginx proxy example (adaptable to Apache), and a production environment template. The forms service binds to `127.0.0.1:4000`; Linux Careers uses loopback ClamAV.

```sh
sudo ./deploy-forms.sh /opt/lakegroup
sudo ./verify-forms.sh /opt/lakegroup
```

## Required protected environment values

Lake Group IT supplies these values on the server, never in Git:

- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`
- `DATABASE_URL_RUNTIME`
- `CAREERS_SCANNER_PROVIDER`

The production configuration is locked to:

- `CONTACT_RECIPIENT_EMAIL=admin@lakeoilgroup.com`
- `CAREERS_RECIPIENT_EMAIL=admin@lakeoilgroup.com`
- `https://www.lakeoilgroup.com` as the allowed production origin

SMTP is provider-neutral. The destination address is not assumed to be the SMTP-authorized sender.

## Scanner and safety model

The application remains OS-neutral:

| Platform | Scanner provider |
| --- | --- |
| Windows | `defender` or `clamd` |
| Linux | `clamd` |

Careers fails closed when its configured scanner is missing, unsupported, or unavailable. Contact remains independent of the scanner. No public firewall rule is created for Node, PostgreSQL, or ClamAV.

Source is ready for Lake Group IT deployment. Server-specific credentials and infrastructure values are intentionally supplied by IT during deployment.
