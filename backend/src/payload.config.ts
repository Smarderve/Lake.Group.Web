import path from 'path'
import { fileURLToPath } from 'url'
import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Countries } from './collections/Countries'
import { Companies } from './collections/Companies'
import { Leaders } from './collections/Leaders'
import { News } from './collections/News'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    // Which collection authenticates the admin dashboard.
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: ' — Lake Group CMS',
      description: 'Self-hosted content management for lakeoilgroup.com',
      icons: [{ url: '/favicon.svg' }],
    },
  },
  collections: [Users, Media, Countries, Companies, Leaders, News],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI || '',
    },
    // Dev: auto-create/update tables on boot so `npm run dev` works with a
    // fresh database. In production, schema is applied via `payload migrate`
    // (see the docker-compose `migrate` service), or set PAYLOAD_PUSH=true
    // for a first boot before migrations exist.
    push: process.env.PAYLOAD_PUSH === 'true' || process.env.NODE_ENV !== 'production',
  }),
  // When the static website lives on a different origin than this CMS,
  // whitelist it here (see .env.example → CORS_ORIGINS / CSRF_ORIGINS).
  cors: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim())
    : [],
  csrf: process.env.CSRF_ORIGINS
    ? process.env.CSRF_ORIGINS.split(',').map((origin) => origin.trim())
    : [],
  serverURL: process.env.PAYLOAD_PUBLIC_SERVER_URL,
})
