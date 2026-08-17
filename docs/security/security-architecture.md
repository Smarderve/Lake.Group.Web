# Security Architecture — Lake Group Platform

> Historical architecture snapshot. See `../SECURITY-ARCHITECTURE.md` and
> `../SECURITY-CONTROLS.md` for the current release state, including binary
> storage, resilient publication, MFA enforcement, and hardened CI.

Maps the roadmap's intended final architecture (§9) onto the real codebase.
Layers are enforced server-side; the static site is a renderer of PUBLISHED
payloads and is never a security boundary.

```
                    INTERNET
                        │
                        ▼
                HTTPS / TLS            ← reverse proxy (production; HSTS via
                        │                SESSION_COOKIE_SECURE=true)
                        ▼
             ┌────────────────────┐
             │  Node.js (Express) │
             │   (src/app.js)     │
             │                    │
             │ Security headers   │ src/middleware/security-headers.js
             │ JSON parsing (100kb)│ app.use(express.json())
             │ Sessions (server)  │ express-session + connect-pg-simple
             │   httpOnly/Lax/    │ src/app.js:70-72
             │   Secure (prod)    │
             │ Rate limiting      │ src/middleware/rate-limit.js
             │   login/MFA 5/15m  │
             │   public writes    │
             │   120/15m          │
             │ Auth (bcrypt, TOTP)│ src/routes/auth.js, src/lib/passwords.js
             │ RBAC + recent-auth │ src/middleware/auth.js
             │ zod validation     │ src/validators/*, governed.js safeParse
             │ Sanitized errors   │ src/middleware/error-handler.js
             │ Audit logging      │ src/lib/audit.js
             └────────┬───────────┘
                      │  Prisma (parameterized only — no raw SQL in routes)
                      ▼
             ┌────────────────────┐
             │  PostgreSQL 18     │
             │  lake_user (no     │  non-superuser, no createdb/createrole
             │  superuser)        │  ⚠️ DB owner; listen_addresses='*'
             └────────────────────┘
```

## Control inventory (roadmap §9 alignment)

| Layer | Control | Location | Status |
| --- | --- | --- | --- |
| Transport | HSTS (HTTPS only) | `security-headers.js` (`hsts: cookieSecure`) | ✅ (prod flag) |
| Browser | CSP with `frame-ancestors 'none'` | API `security-headers.js`; static `vercel.json` + page meta | ✅ API and 49 static pages |
| Browser | nosniff / X-Frame-Options DENY / Referrer-Policy / Permissions-Policy | `security-headers.js` | ✅ |
| Sessions | Postgres store, regenerate-on-login, revoke-all | `src/lib/sessions.js`, `auth.js` | ✅ |
| AuthN | bcrypt(12), TOTP MFA, generic errors, rate limits | `passwords.js`, `auth.js` | ✅ |
| AuthZ | `requireAuth` → `requireRole('SUPER_ADMIN')` → `requireRecentAuth` | `middleware/auth.js`, `admin.js` | ✅ (Phase 11 tightened) |
| Input | zod schemas on every governed create/update/transition + auth | `validators/*`, `governed.js` | ✅ |
| Data | Prisma parameterization; PUBLISHED-only public projection | `public.js` | ✅ |
| Errors | 4xx passthrough, 5xx generic, no stack traces | `error-handler.js` | ✅ |
| Logging | pino structured + `AuditLog` (LOGIN_SUCCESS/FAILED, ADMIN_ACTION, …) | `logger.js`, `lib/audit.js` | ✅ |
| Secrets | `.env` gitignored | `backend/.gitignore` | ✅ |
| Abuse | login/MFA 5/15m; public writes 120/15m | `rate-limit.js` | ✅; ⚠️ admin unlimited |
| Recovery | `db:backup` / `db:restore` + live drill | `scripts/backup-db.js`, `restore-db.js` | ✅ |
| Supply chain | lockfile + `npm audit` (0 findings) | `package-lock.json` | ✅ |

## Production deployment notes

- Terminate TLS at the reverse proxy; set `SESSION_COOKIE_SECURE=true` (activates
  secure cookies + HSTS). `trust proxy` for correct client IPs (rate limiting).
- Bind PostgreSQL to `127.0.0.1` (or private network) and firewall 5432 from the
  public internet; today `listen_addresses='*'`.
- Run Node as a dedicated non-root user under a service manager; only 80/443
  public; SSH key-only.
- Admin surface on `/admin/*` — keep behind the proxy's auth/allow-list as an
  extra layer; never expose to the open internet unauthenticated.
