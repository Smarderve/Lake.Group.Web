# Linux forms deployment

Target topology: Nginx or Apache TLS edge → `127.0.0.1:4000` Node forms service → private PostgreSQL, loopback `clamd`, and SMTP. The service is never exposed directly on port 4000.

1. Copy the repository to `/opt/lakegroup`; install a supported Node.js release, PostgreSQL access, and `clamd` with current official signatures.
2. Create `/etc/lakegroup/forms.production.env` from `forms.production.env.template`, set IT-provided SMTP/PostgreSQL values, and keep `CAREERS_SCANNER_PROVIDER=clamd` with loopback configuration.
3. Add `nginx-forms.conf.example` routes to the existing HTTPS virtual host (Apache may proxy the same paths equivalently).
4. Run `sudo ./deploy-forms.sh /opt/lakegroup`, then `sudo ./verify-forms.sh /opt/lakegroup`.

The service uses a non-login `lakeforms` account, a protected external environment file, automatic restart, and systemd filesystem restrictions. `verify-forms.sh` fails if Node or clamd is not loopback-only, if either token endpoint is unavailable, or if the application’s real clamd adapter cannot scan a harmless buffer.
