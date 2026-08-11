import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Prisma 7 keeps the datasource URL out of schema.prisma and reads it
// from the environment instead. DATABASE_URL lives in .env (gitignored).
// The fallback below exists only so `prisma generate`/`prisma validate`
// work before a developer has copied .env.example to .env; migration and
// introspection commands will refuse to run without a real connection.

// Shadow database used by `prisma migrate diff --from-migrations` (and
// `migrate dev`) to rebuild the schema state from the migration history
// without touching the live database. Derived from DATABASE_URL by
// swapping the database name, so no extra secret-bearing env var is
// needed. The dev role must have CREATEDB for Prisma to create/drop it.
function shadowUrl(databaseUrl) {
  if (!databaseUrl) return undefined;
  return databaseUrl.replace(/\/[^/?#]+(?=[?#]|$)/, '/lakegroup_shadow');
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? 'postgresql://localhost:5432/lakegroup',
    shadowDatabaseUrl: shadowUrl(process.env.DATABASE_URL),
  },
});
