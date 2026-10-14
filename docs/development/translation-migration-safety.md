# Translation schema migration safety

The company PostgreSQL database has not been migrated by this repository work. Do not run this procedure against production without an approved change window, database owner credentials, and a tested backup/restore path.

## Change-window sequence

1. Confirm PostgreSQL version and record current schema migration state with `npx prisma migrate status` from `backend/` using the approved database connection. Confirm migrations `0016_cms_translation_jobs` and `0017_hardcoded_translation_jobs` are pending; stop if history is divergent or the schema already contains conflicting objects.
2. Take a database-native backup, encrypt it, record its location and checksum, and test restore into an isolated database. Ensure sufficient disk for the backup and migration.
3. Apply migrations to an isolated copy first with `npm run db:migrate`; verify tables/indexes and existing CMS data. The change is additive; do not use `migrate reset`, `db push`, or manual deletion.
4. During the approved window, take a fresh backup and repeat `npx prisma migrate status`. Apply `npm run db:migrate` from `backend/` using the migration-owner connection. The runtime service identity should retain only required DML privileges.
5. Verify both translation tables and enum states, run `npm test -- cms-v2-translation.test.js translation-engine-adapter.test.js`, then use the read-only service verifier. Do not enable a model until separately benchmarked and approved.
6. If migration fails, capture Prisma/PostgreSQL diagnostics and stop application of later migrations. Restore the verified backup only under the database owner's incident/change procedure; do not manually drop partially created production data.

The static website and English publication do not depend on translation worker availability. Translation jobs remain pending until the dedicated service has a configured, approved local engine. No live database or migration was accessed during development.
