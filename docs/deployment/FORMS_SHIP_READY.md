# Forms ship-ready status

## Local acceptance complete

### Contact — PROVEN LOCALLY END-TO-END

Contact has been verified through the real local browser flow: frontend and backend validation, token issuance, PostgreSQL replay/idempotency protection, SMTP acceptance, and Gmail receipt.

### Careers — PROVEN LOCALLY END-TO-END

Careers has been verified through the real local browser flow:

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

Verified request ID: `b3906583-77c0-41b3-8d3f-c401b5e6c725`.

The received `Lake-Group-Careers-Test-CV.pdf` matched the submitted SHA-256: `1b9c7007e0120b25edd99f003be410db7924d6b2171474388d85b1f7bc2efcb8`. Exactly one Careers email was received. A harmless scanner test returned `CLEAN`; EICAR returned `MALWARE_DETECTED`, which prevents email delivery.

This is local acceptance evidence only. It does not claim Lake Group production-server testing or delivery.

## Runtime and scanner model

The common Node forms service binds to loopback and owns the Contact/Careers routes, validation, PostgreSQL replay/idempotency protection, SMTP delivery, and structural CV checks. Careers uses a configured fail-closed scanner adapter; Contact is independent of that scanner.

| Platform | Supported `CAREERS_SCANNER_PROVIDER` |
| --- | --- |
| Windows | `defender` or `clamd` |
| Linux | `clamd` |

Do not configure Defender on Linux. Do not require ClamAV on Windows when `defender` is selected. A missing, unsupported, or unavailable configured scanner prevents Careers processing; it does not affect Contact.

## Deployment packages

- Windows: `deployment/windows/forms/` supports IIS, a Node loopback service, PostgreSQL, Defender or loopback ClamAV, and provider-neutral SMTP.
- Linux: `deployment/linux/forms/` supports Nginx or Apache, systemd, Node on `127.0.0.1:4000`, PostgreSQL, loopback ClamAV, and provider-neutral SMTP.

## Production configuration locks

- `FORMS_MODE=production` permits only `https://www.lakeoilgroup.com`.
- `CONTACT_RECIPIENT_EMAIL` and `CAREERS_RECIPIENT_EMAIL` are locked to `admin@lakeoilgroup.com`.
- SMTP remains provider-neutral. `MAIL_FROM` must be an SMTP-authorized sender supplied by Lake Group IT.
- Credentials, tokens, databases, CVs, scanner binaries/signatures, and local environment files do not belong in source control.

Use the protected environment-file templates under the Windows or Linux deployment package. Lake Group IT supplies the server-specific SMTP, PostgreSQL, TLS, reverse-proxy, and selected-scanner values during deployment.
