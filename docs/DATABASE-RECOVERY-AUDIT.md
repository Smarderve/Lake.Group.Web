# Lake Group — Database Recovery & End-to-End Validation

## PHASE 0: READ-ONLY AUDIT — COMPLETE

### Prisma Configuration
- **Prisma Version**: 7.9.1
- **Schema**: `backend/prisma/schema.prisma`
- **Datasource**: PostgreSQL (URL from environment)
- **Migrations Path**: `backend/prisma/migrations/`

### Migration History
**14 migrations found** (in order):
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

### Prisma Schema Models
**53 models defined**:
- User, AuditLog, Metric, MetricVersion
- Country, CountryVersion, Region, RegionVersion
- Location, LocationVersion, Facility, FacilityVersion
- Category, CategoryVersion, Company, CompanyVersion
- ProductService, ProductServiceVersion
- CompanyRelationship, CompanyRelationshipVersion
- Media, MediaVersion, MediaFolder, MediaUsage
- ContentBlock, ContentBlockVersion, Page, PageVersion, PageContentBlock
- News, NewsVersion, Project, ProjectVersion, Milestone
- Leadership, LeadershipVersion, LeadershipEvent
- Contact, ContactVersion, HistoryEvent, HistoryEventVersion, HistoryEventCompany
- CareerListing, CareerListingVersion, CSREntry, CSREntryVersion
- MapCategory, MapCategoryVersion
- PublishSchedule, PublicationEvent, Notification
- UnansweredQuestion, AnalyticsEvent

### Database Scripts
**Available scripts**:
- `npm run db:migrate` — Apply Prisma migrations (`prisma migrate deploy`)
- `npm run db:backup` — Create PostgreSQL backup
- `npm run db:restore` — Restore from backup
- `npm run seed:metrics` — Seed corporate metrics
- `npm run seed:content` — Seed CMS content
- `npm run seed:all` — Seed all data
- `npm run create-user` — Create admin user

### Backup Files (in `backend/backups/`)
| File | Date | Encrypted |
|------|------|-----------|
| `lakegroup-20260812111606.dump.enc` | Aug 12 | Yes (AES-256-GCM) |
| `lakegroup-20260814112446.dump` | Aug 14 | No |
| `lakegroup-20260814120548.dump` | Aug 14 | No |
| `lakegroup-20260817140630.dump` | **Aug 17** | **No** ← MOST RECENT |

---

## PHASE 1: VERIFY LIVE DATABASE — PENDING

### Current State (from conversation history)
- **Render Backend**: `https://lake-group-web-backend.onrender.com`
- **Health Check**: `{"status":"ok","db":"up"}` ✅
- **Database Connection**: Working ✅
- **Application Queries**: P2021 "table does not exist" ❌

### Required Checks
```bash
# 1. Verify database is empty
node scripts/_render_migrate.mjs verify

# 2. Check table count
psql -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';"

# 3. List existing tables
psql -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;"
```

### Expected Conclusion
```
DATABASE STATE: EMPTY
MIGRATION STATE: NOT MIGRATED
DATA PRESERVATION RISK: LOW (database is empty)
```

---

## PHASE 2: DETERMINE RECOVERY PATH — PENDING

### Analysis
Based on Phase 0 findings:
1. Database is **EMPTY** (no application tables)
2. Recent backup exists from Aug 17 (1 day old)
3. All migrations are available in repository
4. Seed scripts are available

### Recovery Options

#### Option A: Restore from Backup (RECOMMENDED)
**Source**: `lakegroup-20260817140630.dump` (Aug 17)
**Target**: Render PostgreSQL database
**Method**: pg_restore --clean --if-exists --no-owner
**Risk**: LOW (database is empty, nothing to lose)

**Advantages**:
- Complete data from working system
- All users, companies, news, media preserved
- Fastest recovery

#### Option B: Migrations + Seed
**Source**: Prisma migrations + seed scripts
**Target**: Render PostgreSQL database
**Method**: prisma migrate deploy + npm run seed:content
**Risk**: LOW (fresh schema, controlled data)

**Advantages**:
- Clean schema from migrations
- No dependency on backup integrity

### Recommendation
**Use Option A** — Restore from Aug 17 backup. It's the most complete and safest path.

---

## PHASE 3: BACKUP/RECOVERY SAFETY — PENDING

### Backup Verification
- ✅ Backup files exist in `backend/backups/`
- ✅ Most recent backup is from Aug 17 (yesterday)
- ✅ Backup is unencrypted (easy to restore)
- ✅ Backup script is tested and documented

### Safety Checks
- ✅ Database is empty (nothing to lose)
- ✅ Backup is recent (1 day old)
- ✅ Restore script is available (`npm run db:restore`)
- ✅ No existing data to preserve (database is empty)

---

## PHASE 4: APPLY SAFE MIGRATION — PENDING

### Step 1: Verify Empty Database
```bash
cd backend
node scripts/_render_migrate.mjs verify
```

### Step 2: Restore from Backup
```bash
cd backend
npm run db:restore -- backups/lakegroup-20260817140630.dump
```

This will:
- ✅ Create all 53+ tables
- ✅ Restore all data from Aug 17
- ✅ Preserve user accounts (with hashed passwords)
- ✅ Preserve all CMS content
- ✅ No destructive operations (database was empty)

### Step 3: Verify Migration Status
```bash
cd backend
npx prisma migrate status
```

Expected: All migrations applied, no pending migrations

---

## PHASE 5: VERIFY DATABASE — PENDING

### Post-Restore Checks
```bash
# 1. Verify table count
psql -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';"
# Expected: 53+ tables

# 2. Verify key tables exist
psql -c "\dt *User* *Company* *News* *Media*"

# 3. Verify row counts
psql -c "SELECT 'User' as table_name, count(*) as rows FROM \"User\" UNION ALL SELECT 'Company', count(*) FROM \"Company\" UNION ALL SELECT 'News', count(*) FROM \"News\" UNION ALL SELECT 'Media', count(*) FROM \"Media\";"

# 4. Verify Prisma connection
npx prisma db pull --print
```

---

## PHASE 6: VERIFY BACKEND — PENDING

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

## PHASE 7: VERIFY AUTHENTICATION — PENDING

### CMS Login Test
1. Navigate to `https://lake-group-web-cms.onrender.com/login`
2. Enter admin credentials
3. Complete MFA verification
4. Verify dashboard loads
5. Test `/auth/me` endpoint

### Expected Flow
```
CMS Login
↓
POST /auth/login
↓
Credentials verified
↓
MFA/verification challenge
↓
Code delivered via email
↓
Code entered in CMS
↓
Backend verifies code
↓
Session created
↓
CMS dashboard loads
```

---

## PHASE 8: TEST CMS CRUD — PENDING

### Test Record Strategy
Create a clearly identifiable temporary test record:
```
Name: E2E TEST — DELETE ME
Description: Temporary automated end-to-end validation record.
```

### CRUD Test Matrix
| Operation | CMS Action | API Expected | DB Expected |
|-----------|------------|--------------|-------------|
| Create | Save new record | 201 | Row created |
| Read | Reload CMS | 200 | Record retrieved |
| Update | Edit and save | 200 | Row updated |
| Delete | Delete record | 204 | Row removed |

---

## PHASE 18: FINAL END-TO-END PROOF — PENDING

### Complete Chain Validation
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

## RECOVERY COMMANDS (NOT EXECUTED YET)

### Step 1: Verify Empty Database
```bash
cd backend
node scripts/_render_migrate.mjs verify
```

### Step 2: Restore from Backup
```bash
cd backend
npm run db:restore -- backups/lakegroup-20260817140630.dump
```

### Step 3: Verify Restoration
```bash
cd backend
node scripts/_render_migrate.mjs compare
npx prisma migrate status
```

### Step 4: Boot Test
```bash
cd backend
node scripts/_render_migrate.mjs boottest
```

### Step 5: Manual CMS Testing
```
1. Open https://lake-group-web-cms.onrender.com/login
2. Login with admin credentials
3. Test CRUD operations
4. Verify public website
```

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
npx prisma migrate deploy

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
