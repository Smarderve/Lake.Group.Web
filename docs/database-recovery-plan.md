# Lake Group Database Recovery Plan

## Current State

- **Render Backend**: Deployed and running at `https://lake-group-web-backend.onrender.com`
- **Render Database**: PostgreSQL database created but **EMPTY** (no application tables)
- **Health Check**: Returns `{"status":"ok","db":"up"}` but application queries return P2021 errors
- **Root Cause**: Previous database was deleted; new database has no schema/data

## Available Data Sources

### Backup Files (in `backend/backups/`)
1. `lakegroup-20260812111606.dump.enc` - Encrypted (requires BACKUP_ENCRYPTION_KEY)
2. `lakegroup-20260814112446.dump` - Unencrypted (1.4 MB)
3. `lakegroup-20260814120548.dump` - Unencrypted (1.4 MB)
4. `lakegroup-20260817140630.dump` - **Most recent** unencrypted (1.5 MB, Aug 17)

### Seed Scripts
- `seed-content.js` - Comprehensive content seeding from frontend bundles
- `create-user.js` - Admin user creation
- `seed-metrics.js` - Metrics seeding

## Recovery Strategy

### Option A: Restore from Most Recent Backup (RECOMMENDED)
**Source**: `lakegroup-20260817140630.dump` (Aug 17, 2026)
**Target**: Current Render PostgreSQL database
**Method**: pg_restore with --clean --if-exists --no-owner
**Risk**: None (database is empty, no data to lose)

### Option B: Run Prisma Migrations + Seed Data
**Source**: Prisma migration history (14 migrations)
**Target**: Current Render PostgreSQL database
**Method**: prisma migrate deploy + seed scripts
**Risk**: May lose some data that was in the backup but not in seeds

## Recommended Approach: Option A

The Aug 17 backup contains the complete database state from when it was working.
This is the safest and most complete recovery method.

## Recovery Steps

### Step 1: Verify Render Database is Empty
```bash
node scripts/_render_migrate.mjs verify
```
Expected: 0 public tables

### Step 2: Restore from Aug 17 Backup
```bash
# From backend/ directory
node scripts/_render_migrate.mjs restore ../backend/backups/lakegroup-20260817140630.dump
```
OR use the restore-db.js script:
```bash
npm run db:restore -- backups/lakegroup-20260817140630.dump
```

### Step 3: Verify Migration Status
```bash
# Check Prisma migration history in the database
npx prisma migrate status
```
Expected: All migrations applied

### Step 4: Verify Table Counts
```bash
node scripts/_render_migrate.mjs compare
```
Expected: All tables present with correct row counts

### Step 5: Boot Test
```bash
node scripts/_render_migrate.mjs boottest
```
Expected: Backend starts and can query companies (21 expected)

### Step 6: Verify Authentication
- Test login through CMS
- Verify MFA works
- Test session persistence

### Step 7: End-to-End CMS Testing
- Create/Edit/Delete company
- Create/Edit/Delete news
- Test media upload
- Test content management

## Data Preservation

### What Will Be Preserved (from Aug 17 backup)
- All users and authentication data
- All companies and subsidiaries
- All news articles
- All media records
- All CMS content
- All history events
- All leadership records
- All projects
- All contacts
- All settings and configuration
- All audit logs
- All migration history

### What Will NOT Be Preserved
- Any changes made after Aug 17 (if any)
- Real-time session data (will be recreated on login)

## Risks

1. **Low Risk**: Restoring to an empty database is safe
2. **Low Risk**: Backup is only 1 day old
3. **Medium Risk**: If backup is corrupted (unlikely, can verify)
4. **Low Risk**: MFA secrets are encrypted in backup

## Verification Checklist

After recovery:
- [ ] All 53+ tables exist
- [ ] Prisma migration history is clean
- [ ] User records exist (with hashed passwords)
- [ ] Company records exist (21+ companies)
- [ ] News articles exist (41+ articles)
- [ ] Media records exist
- [ ] Authentication works
- [ ] CMS login succeeds
- [ ] CMS CRUD operations work
- [ ] Public API returns data
- [ ] No P2021 errors

## Commands Summary

**NOT EXECUTED YET - AWAITING APPROVAL**

```bash
# 1. Verify empty database
node scripts/_render_migrate.mjs verify

# 2. Restore from backup
npm run db:restore -- backups/lakegroup-20260817140630.dump

# 3. Verify restoration
node scripts/_render_migrate.mjs compare

# 4. Boot test
node scripts/_render_migrate.mjs boottest

# 5. Test authentication (manual through CMS)
# Navigate to https://lake-group-web-cms.onrender.com/login
```

## Human Decision Required

**APPROVED TO PROCEED?**

This plan will:
1. Restore the database from the Aug 17 backup
2. Preserve all existing data
3. Enable full CMS functionality
4. No data will be lost (database was empty)

Please confirm to proceed with the recovery.
