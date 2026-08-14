# Initial Public Content Import Runbook

## Safety

The import is an onboarding operation, not a recurring publication path.
Back up PostgreSQL first. Run against staging before production. Never use
`--force` unless the operator has reviewed the reverse-dependency deletion
behavior and explicitly approved replacing existing governed records.

## Dry Verification

```powershell
cd backend
npm ci
npm run seed:verify
npm test -- --run tests/seed-data.test.js
```

This validates extraction counts, stable keys, URLs, dates, coordinate shapes,
and important relationships without writing to PostgreSQL.

## Import

Set owner/migration `DATABASE_URL`, then:

```powershell
cd backend
npm run db:migrate
npm run seed:metrics
npm run seed:content
npm run health:report
```

The default import is idempotent in practical operation: unique/stable records
are found first and existing records are skipped. Created rows are PUBLISHED
for initial onboarding, receive a version row, and write an audit event.
Subsequent changes must use the CMS workflow.

## Verification

1. Compare seed verification counts with admin/public API counts.
2. Check companies, geography, projects, leadership, contacts, history,
   careers, CSR, media, news, map, and metrics.
3. Verify important figures against their recorded sources.
4. Confirm every public result is PUBLISHED and drafts remain absent.
5. Run `node scripts/_verify_phase8_entities.js` from the repository root.
6. Generate a versioned public snapshot and run its validation.

## Deduplication and Corrections

- Do not create a second import source.
- Correct questionable facts in the CMS as a governed draft with a reason.
- Use stable slugs, ISO codes, metric keys, and relationship keys.
- Do not automatically publish a correction merely because an import script
  discovered a difference.
- Keep migration source files for auditability; classify them as import-only,
  not runtime fallbacks.
