# Security Asset Inventory

Date: 2026-08-13

| Asset | Owner | Data/sensitivity | Access | Controls | Recovery |
|---|---|---|---|---|---|
| Public website | Communications + Engineering | Published public content / low confidentiality, high integrity | Internet | CSP, static headers, immutable assets | redeploy/rollback known-good release |
| CMS | Content Operations | drafts, review metadata / confidential | employees | session auth, MFA gate, RBAC, exact CORS/CSRF | redeploy CMS; API data remains |
| Backend API | Engineering | accounts, governed data / high | CMS and public read endpoints | validation, limits, authz, safe errors/logging | container rollback |
| PostgreSQL | Data owner + Operations | users, sessions, content, audit / critical | backend and migration operators | least-privilege role split, Prisma | encrypted offsite backup + restore |
| Media storage | Content Operations | uploaded public candidates / medium-high integrity | backend write; governed public read | signature checks, random keys, PDF attachment | bucket versioning/replication gate |
| Public snapshots | Communications | published projection / public, high integrity | CDN | content addressing, atomic manifest, leakage tests | prior immutable release |
| Audit log | Security/Operations | employee activity / restricted, high integrity | SUPER_ADMIN viewer | centralized writes, indexes, no-secret tests | database backup |
| Git repository | Engineering | source/config/history / critical integrity | developers/CI | reviews, secret scan, lockfiles | provider history/mirrors |
| GitHub Actions | Engineering/Operations | build and release authority / critical | protected workflows | SHA actions, read-only permissions, environment gates | disable workflow/revoke tokens |
| Vercel project | Operations | production deployment / critical integrity | protected workflow/operators | project-scoped token, immutable deploy | provider rollback |
| Secrets | Operations | DB/session/MFA/backup/provider credentials / critical | runtime/protected environments | no Git/frontend/logs, validation, rotation runbook | rotate and revoke |
| Backups | Operations | full database / critical | backup role only | encryption, offsite adapter, retention | restoration drill |
| Monitoring/SIEM | Security/Operations | security logs / restricted | incident responders | structured events, no credential headers | provider retention/export |
| Employee accounts | Department owners | identity and privileges / high | named individuals | no public signup, MFA, disable/revoke | admin recovery procedure |
| DNS/CDN/WAF | Operations/provider | routing and edge policy / critical availability | provider administrators | provider MFA/RBAC/config review | provider recovery procedures |

Inventory owners must be revalidated quarterly and after any new integration,
data type, deployment provider, upload format, API route, or privileged role.
