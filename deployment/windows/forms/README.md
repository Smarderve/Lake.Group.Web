# Windows forms deployment

This package deploys the Lake Group Contact and Careers forms behind IIS. The
Node forms service listens only on `127.0.0.1:4000`; IIS is the public HTTPS
edge. The package supports private PostgreSQL, provider-neutral SMTP, and either
Microsoft Defender or loopback ClamAV for Careers CV scanning.

1. Copy the repository to the server and install an approved Node.js release,
   IIS, and PostgreSQL connectivity.
2. Create a protected environment file outside the web root from
   `forms.production.env.template`. Lake Group IT supplies SMTP, PostgreSQL,
   and secret values; none are included in Git.
3. On a healthy Windows Defender host, set
   `CAREERS_SCANNER_PROVIDER=defender`. Alternatively use `clamd` with a current
   database and a listener restricted to `127.0.0.1:3310`.
4. Run the deployment and verification scripts with the actual IIS site name:

```powershell
.\deploy-forms.ps1 -ProjectRoot C:\LakeGroup -SiteName '<IIS_SITE_NAME>'
.\verify-forms.ps1 -ProjectRoot C:\LakeGroup -SiteName '<IIS_SITE_NAME>'
```

Use `-WhatIf` on the deployment command for a non-mutating preview. Use
`rollback-forms.ps1` only to remove deployment-owned configuration and IIS
changes; it does not remove shared Node, PostgreSQL, or IIS software.

Production configuration is locked to `https://www.lakeoilgroup.com` and to
`admin@lakeoilgroup.com` as the Contact and Careers recipients. Careers fails
closed if its selected scanner is unavailable; Contact remains independent of
the scanner.
