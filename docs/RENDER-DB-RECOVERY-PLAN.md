# Render PostgreSQL Recovery & End-to-End Validation Plan

## PHASE 0: READ-ONLY AUDIT — COMPLETE ✅

### Prisma Configuration
| Component | Value |
|-----------|-------|
| **Prisma Version** | 7.9.1 |
| **Schema** | `backend/prisma/schema.prisma` |
| **Models** | 53 models |
| **Datasource** | PostgreSQL (URL from environment) |
| **Migrations Path** | `backend/prisma/migrations/` |

### Migration History (14 migrations)
1. `0001_init` — Initial schema
2. `0002_auth` — Authentication
3. `0003_metrics` — Corporate metrics
4. `0004_registry` — Corporate registry
5. `0005_cms_core` — CMS core
6. `0006_map_media` — Map & media
7. `0007_governance` — Governance & publishing
8. `0008_ai_knowledge` — AI / Corporate knowledge
9. `0009_analytics` — Analytics
10. `0010_runtime_roles` — Runtime roles
11. `0011_audit_log_indexes` — Audit log indexes
12. `0012_media_storage` — Media storage
13. `0013_rate_limit` — Rate limiting
14. `0014_user_preferences` — User preferences

### Available Recovery Tools
| Script | Purpose | Command |
|--------|---------|---------|
| `db:migrate` | Apply Prisma migrations | `npm run db:migrate` |
| `db:restore` | Restore from backup | `npm run db:restore -- <file>` |
| `_render_migrate.mjs verify` | Check Render DB state | `node scripts/_render_migrate.mjs verify` |
| `_render_migrate.mjs restore` | Restore to Render | `node scripts/_render_migrate.mjs restore [dump]` |
| `_render_migrate.mjs compare` | Compare local vs Render | `node scripts/_render_migrate.mjs compare` |
| `_render_migrate.mjs boottest` | Boot test against Render | `node scripts/_render_migrate.mjs boottest` |

### Backup Files (in `backend/backups/`)
| File | Date | Size | Encrypted | Status |
|------|------|------|-----------|--------|
| `lakegroup-20260812111606.dump.enc` | Aug 12 | - | Yes (AES-256-GCM) | Requires key |
| `lakegroup-20260814112446.dump` | Aug 14 | 1.4 MB | No | ✅ Ready |
| `lakegroup-20260814120548.dump` | Aug 14 | 1.4 MB | No | ✅ Ready |
| `lakegroup-20260817140630.dump` | **Aug 17** | **1.5 MB** | **No** | ✅ **BEST** |

---

## PHASE 1-5: DATABASE CLASSIFICATION & STRATEGY

### Current State (from conversation history)
```
Backend: https://lake-group-web-backend.onrender.com
Health Check: {"status":"ok","db":"up"} ✅
Database Connection: Working ✅
Application Queries: P2021 "table does not exist" ❌
```

### Database Classification
```
DATABASE STATE: EMPTY (0 application tables)
MIGRATION STATE: NOT MIGRATED
DATA PRESERVATION RISK: LOW (database is empty)
```

### Recovery Strategy
**Use Option A: Restore from Aug 17 Backup**

**Why this is the safest path:**
1. ✅ Database is **EMPTY** (nothing to lose)
2. ✅ Backup is **1 day old** (very recent)
3. ✅ Backup is **unencrypted** (easy to restore)
4. ✅ Restore script is **tested and documented** (`_render_migrate.mjs restore`)
5. ✅ Contains **complete working state** (users, companies, news, etc.)

---

## PHASE 6: MIGRATION COMMANDS (NOT EXECUTED YET)

### Step 1: Verify Empty Database
```bash
cd backend
node scripts/_render_migrate.mjs verify
```

**Expected output:**
- Connection successful
- 0 public tables
- Database is fresh/empty

### Step 2: Restore from Aug 17 Backup
```bash
cd backend
node scripts/_render_migrate.mjs restore ../backend/backups/lakegroup-20260817140630.dump
```

**This will:**
- ✅ Create all 53+ tables
- ✅ Restore all data from Aug 17
- ✅ Preserve user accounts (with hashed passwords)
- ✅ Preserve all CMS content
- ✅ No destructive operations (database was empty)

### Step 3: Verify Restoration
```bash
cd backend
node scripts/_render_migrate.mjs compare
npx prisma migrate status
```

**Expected:**
- All tables present
- Row counts match backup
- Migration history clean

### Step 4: Boot Test
```bash
cd backend
node scripts/_render_migrate.mjs boottest
```

**Expected:**
- Backend starts successfully
- Health check returns `db: up`
- Can query companies (21+ expected)

---

## PHASE 7-9: BACKEND VERIFICATION

### API Endpoint Tests
```bash
# Health check
curl https://lake-group-web-backend.onrender.com/health
# Expected: {"status":"ok","db":"up"}

# Public companies (should now work)
curl https://lake-group-web-backend.onrender.com/api/public/companies
# Expected: JSON array of companies

# Public news
curl https://lake-group-web-backend.onrender.com/api/public/news
# Expected: JSON array of news articles
```

### Authentication Test
```bash
# CORS preflight
curl -X OPTIONS https://lake-group-web-backend.onrender.com/auth/login \
  -H "Origin: https://lake-group-web-cms.onrender.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type,x-request-id"
# Expected: HTTP 204 with correct CORS headers

# Login attempt (should now work)
curl -X POST https://lake-group-web-backend.onrender.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@lakegroup.com","password":"test"}'
# Expected: Success or "Invalid credentials" (not P2021)
```

---

## PHASE 10-22: FINAL VALIDATION

### CMS Login Test
1. Navigate to `https://lake-group-web-cms.onrender.com/login`
2. Enter admin credentials
3. Complete MFA verification
4. Verify dashboard loads
5. Test `/auth/me` endpoint

### CMS CRUD Test
Create a clearly identifiable temporary test record:
```
Name: E2E TEST — DELETE ME
Description: Temporary automated end-to-end validation record.
```

**Test Matrix:**
| Operation | CMS Action | API Expected | DB Expected |
|-----------|------------|--------------|-------------|
| Create | Save new record | 201 | Row created |
| Read | Reload CMS | 200 | Record retrieved |
| Update | Edit and save | 200 | Row updated |
| Delete | Delete record | 204 | Row removed |

### End-to-End Proof
```
REAL CMS USER
      ↓
CMS UI
      ↓
HTTP REQUEST
      ↓
CORS / CSRF
      ↓
BACKEND API
      ↓
VALIDATION
      ↓
SERVICE LOGIC
      ↓
PRISMA
      ↓
POSTGRESQL
      ↓
PRISMA
      ↓
BACKEND RESPONSE
      ↓
CMS UI
```

---

## DATA PRESERVATION ANALYSIS

### What Will Be Preserved (from Aug 17 backup)
| Data Type | Count | Status |
|-----------|-------|--------|
| Users | Multiple | ✅ Preserved (with hashed passwords) |
| MFA Secrets | Multiple | ✅ Preserved (encrypted) |
| Companies | 21+ | ✅ Preserved |
| News Articles | 41+ | ✅ Preserved |
| Media Records | 44+ | ✅ Preserved |
| History Events | Multiple | ✅ Preserved |
| Leadership | Multiple | ✅ Preserved |
| Projects | Multiple | ✅ Preserved |
| Contacts | Multiple | ✅ Preserved |
| Settings | All | ✅ Preserved |
| Audit Logs | Complete | ✅ Preserved |
| Migration History | 14 migrations | ✅ Preserved |

### What Will NOT Be Preserved
- Any changes made after Aug 17 (if any — unlikely since database was deleted)
- Real-time session data (will be recreated on login)

---

## RISK ASSESSMENT

### Low Risk ✅
- Database is empty (nothing to lose)
- Backup is recent (1 day old)
- Backup is unencrypted (easy to restore)
- Restore script is tested and documented

### Medium Risk ⚠️
- If backup is corrupted (unlikely, can verify)
- If Render database has different PostgreSQL version (unlikely)

### Mitigation
- Verify backup integrity before restore
- Keep backup files as safety net

---

## VERIFICATION CHECKLIST

After recovery:
- [ ] All 53+ tables exist in Render database
- [ ] Prisma migration history shows all 14 migrations applied
- [ ] User records exist (with correct email/role)
- [ ] Company records exist (21+ companies)
- [ ] News articles exist (41+ articles)
- [ ] Media records exist (44+ gallery tiles + news images)
- [ ] Authentication works (login succeeds)
- [ ] MFA works (verification code delivered)
- [ ] CMS CRUD operations work
- [ ] Public API returns data
- [ ] No P2021 errors
- [ ] No raw database errors exposed to clients

---

## HUMAN DECISION REQUIRED

### APPROVED TO PROCEED?

This recovery plan will:

1. ✅ Restore the database from the Aug 17 backup
2. ✅ Preserve all existing data (users, companies, news, etc.)
3. ✅ Enable full CMS functionality
4. ✅ No data will be lost (database was empty)
5. ✅ Minimal risk (recent backup, tested scripts)

**Please confirm to proceed with the database recovery.**

---

## ALTERNATIVE: Schema-Only Recovery

If you prefer a clean schema without the Aug 17 data:

```bash
# 1. Run Prisma migrations only
cd backend
npm run db:migrate

# 2. Seed fresh content
npm run seed:content

# 3. Create admin user
npm run create-user -- --email admin@lakegroup.com --role SUPER_ADMIN
```

This creates a fresh database with current schema and seed data, but loses any data that was in the Aug 17 backup but not in the seeds.

---

## NEXT STEPS

After approval, I will:

1. Execute the recovery plan (restore from Aug 17 backup)
2. Verify database integrity
3. Test backend API endpoints
4. Test CMS login and CRUD
5. Verify public website
6. Produce final validation report

**Awaiting your approval to proceed.**
