/**
 * _gen_backend_docs.js
 * ------------------------------------------------
 * Generates docs/Lake_Group_CMS_Backend_Documentation.docx
 * — a complete technical reference for the backend/ Payload CMS.
 *
 * Run from repo root:  node scripts/_gen_backend_docs.js
 */
const fs = require('fs')
const path = require('path')
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle,
  TableOfContents, PageNumber, LevelFormat, PageBreak, Footer,
} = require('docx')

/* ------------------------------------------------------------------ */
/*  Brand palette                                                      */
/* ------------------------------------------------------------------ */
const NAVY = '013F5C'
const BLUE = '0181BB'
const INK = '1F2937'
const MUTED = '4B5563'
const HEADER_FILL = '013F5C'
const ZEBRA_FILL = 'F3F7FA'
const CODE_FILL = 'F2F5F7'

const CONTENT_WIDTH = 9026 // A4 (11906) − 2×1440 margin

/* ------------------------------------------------------------------ */
/*  Small helpers                                                      */
/* ------------------------------------------------------------------ */

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 420, after: 160 },
    children: [new TextRun({ text, bold: true, color: NAVY, size: 30 })],
  })
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 320, after: 120 },
    children: [new TextRun({ text, bold: true, color: BLUE, size: 25 })],
  })
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 260, after: 100 },
    children: [new TextRun({ text, bold: true, color: NAVY, size: 22 })],
  })
}

function p(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 140, line: 300 },
    children: [new TextRun({ text, color: INK, size: 21, ...opts })],
  })
}

/** Paragraph mixing bold labels and normal text: [["label","value"], ...] */
function pv(parts, opts = {}) {
  return new Paragraph({
    spacing: { after: 140, line: 300 },
    children: parts.map(([text, bold]) =>
      new TextRun({ text, bold: !!bold, color: INK, size: 21 }),
    ),
    ...opts,
  })
}

function bullets(items) {
  return items.map((item) =>
    new Paragraph({
      numbering: { reference: 'bullets', level: 0 },
      spacing: { after: 60, line: 290 },
      children: [new TextRun({ text: item, color: INK, size: 21 })],
    }),
  )
}

function code(lines) {
  const paras = lines.map((line) =>
    new Paragraph({
      shading: { type: ShadingType.CLEAR, fill: CODE_FILL, color: 'auto' },
      spacing: { before: 0, after: 0, line: 260 },
      children: [new TextRun({ text: line, font: 'Consolas', size: 17, color: '111827' })],
    }),
  )
  return [
    new Paragraph({ spacing: { after: 60 }, children: [] }),
    ...paras,
    new Paragraph({ spacing: { after: 160 }, children: [] }),
  ]
}

function cell(text, width, opts = {}) {
  const { bold, fill, color, font, size } = opts
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: fill ? { type: ShadingType.CLEAR, fill, color: 'auto' } : undefined,
    verticalAlign: 'center',
    margins: { top: 70, bottom: 70, left: 100, right: 100 },
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: !!bold, color: color || INK, font: font || 'Calibri', size: size || 19 })],
      }),
    ],
  })
}

function table(headers, rows, widths, opts = {}) {
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) =>
      cell(h, widths[i], { bold: true, fill: HEADER_FILL, color: 'FFFFFF', size: 19 }),
    ),
  })
  const bodyRows = rows.map((r, ri) =>
    new TableRow({
      children: r.map((c, ci) =>
        cell(c, widths[ci], {
          fill: ri % 2 === 1 ? ZEBRA_FILL : 'FFFFFF',
          font: opts.mono ? 'Consolas' : 'Calibri',
          size: opts.mono ? 17 : 19,
        }),
      ),
    }),
  )
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: widths,
    rows: [headerRow, ...bodyRows],
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: 'D8E0E8' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: 'D8E0E8' },
      left: { style: BorderStyle.SINGLE, size: 4, color: 'D8E0E8' },
      right: { style: BorderStyle.SINGLE, size: 4, color: 'D8E0E8' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: 'D8E0E8' },
      insideVertical: { style: BorderStyle.SINGLE, size: 4, color: 'D8E0E8' },
    },
  })
}

function spacer() {
  return new Paragraph({ spacing: { after: 120 }, children: [] })
}

/* ------------------------------------------------------------------ */
/*  Content                                                            */
/* ------------------------------------------------------------------ */

const children = []

/* ---------- Title block ---------- */
children.push(
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 2400, after: 120 },
    children: [new TextRun({ text: 'LAKE GROUP OF COMPANIES', bold: true, color: NAVY, size: 52 })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [new TextRun({ text: 'lakeoilgroup.com  ·  lake.group.web', color: MUTED, size: 22 })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 400, after: 120 },
    children: [new TextRun({ text: 'Lake Group CMS — Backend Technical Documentation', bold: true, color: NAVY, size: 34 })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
    children: [new TextRun({ text: 'Self-hosted Payload CMS (Next.js + PostgreSQL)', color: MUTED, size: 22 })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 500 },
    children: [new TextRun({ text: 'Version 0.1.0  ·  Compiled by Freebuff AI Assistant  ·  August 2026', color: MUTED, size: 18 })],
  }),
  new Paragraph({ children: [new PageBreak()] }),
)

/* ---------- Table of contents ---------- */
children.push(
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 120, after: 160 },
    children: [new TextRun({ text: 'Contents', bold: true, color: NAVY, size: 30 })],
  }),
  new TableOfContents('Table of Contents', { hyperlink: true, headingStyleRange: '1-2' }),
  new Paragraph({ children: [new PageBreak()] }),
)

/* ---------- 1. Overview ---------- */
children.push(
  h1('1.  Overview'),
  p('The Lake Group CMS is a self-hosted, headless content-management backend for lakeoilgroup.com. It is built on Payload CMS 3 (running inside a Next.js App Router application) and stores all content in a PostgreSQL database. The public static website — which continues to live on Vercel or company servers — consumes the content over the CMS REST API.'),
  pv([['Purpose: ', true], ['manage news, leadership profiles, companies, countries of operation, and all media uploads (banners, photos, logos, flags) in one admin panel.']]),
  pv([['Target: ', true], ['internal content editors and the public read API for the static site.']]),
  pv([['Location: ', true], ['backend/ directory of the lake.group.web repository.']]),
  p('The admin dashboard is delivered by Payload at /admin with login, role fields, a media library, and full CRUD for every collection. The first user is bootstrapped through the admin UI on first visit.'),
  spacer(),
  h2('What the collections mirror on the live site'),
  table(
    ['Collection', 'Slug', 'Static-site source it mirrors'],
    [
      ['News', 'news', 'assets/news-data.js  (window.LAKE_NEWS)'],
      ['Leaders', 'leaders', 'leadership-*.html profile pages'],
      ['Companies', 'companies', 'Subsidiary pages + megamenu divisions'],
      ['Countries', 'countries', 'assets/africa-network-map.js + flag SVGs'],
      ['Media', 'media', 'Uploads: banners, photos, logos, flags'],
      ['Users', 'users', 'Admin login for the dashboard'],
    ],
    [2200, 1600, 5226],
  ),
)

/* ---------- 2. Technology stack ---------- */
children.push(
  new Paragraph({ children: [new PageBreak()] }),
  h1('2.  Technology Stack'),
  table(
    ['Layer', 'Technology'],
    [
      ['Content framework', 'Payload CMS ^3.0.0 (self-hosted)'],
      ['Application framework', 'Next.js ~15.4.11 — App Router, standalone output'],
      ['UI runtime', 'React 19, React DOM 19'],
      ['Database', 'PostgreSQL via @payloadcms/db-postgres ^3.0.0'],
      ['Rich text editor', '@payloadcms/richtext-lexical ^3.0.0 (Lexical)'],
      ['Language', 'TypeScript ^5.7.0 (strict mode)'],
      ['Tooling', 'tsx ^4.19.0, cross-env ^7.0.3, Next lint'],
      ['Runtime', 'Node.js ≥ 18.20.0 (Docker image: node:20-alpine)'],
      ['Database server', 'PostgreSQL 16 (postgres:16-alpine in Docker)'],
    ],
    [3200, 5826],
  ),
  spacer(),
  h2('Key npm dependencies'),
  code([
    '"dependencies": {',
    '  "@payloadcms/db-postgres": "^3.0.0",',
    '  "@payloadcms/next": "^3.0.0",',
    '  "@payloadcms/richtext-lexical": "^3.0.0",',
    '  "next": "~15.4.11",',
    '  "payload": "^3.0.0",',
    '  "react": "^19.0.0",',
    '  "react-dom": "^19.0.0"',
    '}',
  ]),
)

/* ---------- 3. Repository structure ---------- */
children.push(
  h1('3.  Repository Structure'),
  p('Everything the CMS needs lives under backend/. The site root (parent directory) is treated as the data source for seeding.'),
  code([
    'backend/',
    '├── .env.example            # template for all environment variables',
    '├── .gitignore              # excludes .env, media, generated types',
    '├── .dockerignore           # keeps node_modules/.next/.env out of images',
    '├── ADMIN_ROUTE_PLAN.md     # dashboard + static-page wiring plan',
    '├── README.md               # setup & quick-start guide',
    '├── Dockerfile              # multi-stage build → standalone output',
    '├── docker-compose.yml      # Postgres 16 + migrate + cms services',
    '├── next.config.mjs         # standalone output via withPayload()',
    '├── package.json            # scripts & dependencies',
    '├── tsconfig.json           # strict TS, @/* and @payload-config paths',
    '├── public/                 # static assets (favicon.svg etc.)',
    '├── scripts/',
    '│   ├── seed.ts             # migrate static-site content into the CMS',
    '│   ├── site-data.ts        # pure extraction module (no Payload imports)',
    '│   └── verify-site-data.ts # dry-run checks without a database',
    '└── src/',
    '    ├── access/',
    '    │   └── index.ts        # isAuthenticated / isAdmin access rules',
    '    ├── app/',
    '    │   ├── (frontend)/     # landing page (admin + API links)',
    '    │   └── (payload)/      # /admin UI + /api REST catch-all routes',
    '    ├── collections/        # Users, Media, Countries, Companies,',
    '    │                       # Leaders, News',
    '    └── payload.config.ts   # central Payload configuration',
  ]),
  spacer(),
  h2('Next.js configuration (next.config.mjs)'),
  p('The config wraps Next.js with Payload’s withPayload() helper and enables standalone output so the multi-stage Dockerfile ships only the compiled runtime bundle.'),
  code([
    "import { withPayload } from '@payloadcms/next/withPayload'",
    '',
    'const nextConfig = {',
    "  output: 'standalone',  // self-contained production bundle",
    '}',
    '',
    'export default withPayload(nextConfig)',
  ]),
  spacer(),
  h2('TypeScript configuration (tsconfig.json)'),
  p('Strict mode is enabled. Module resolution uses the bundler strategy with path aliases @/* → ./src/* and @payload-config → ./src/payload.config.ts. The generated Payload types are output to src/payload-types.ts (gitignored, regenerated with npm run generate:types).'),
)

/* ---------- 4. Configuration ---------- */
children.push(
  new Paragraph({ children: [new PageBreak()] }),
  h1('4.  Core Configuration (src/payload.config.ts)'),
  p('payload.config.ts is the single place where the CMS is assembled: collections, database adapter, editor, auth user, CORS/CSRF origins, and TypeScript output.'),
  code([
    "import { buildConfig } from 'payload'",
    "import { postgresAdapter } from '@payloadcms/db-postgres'",
    "import { lexicalEditor } from '@payloadcms/richtext-lexical'",
    '',
    'export default buildConfig({',
    '  admin: {',
    '    user: Users.slug,            // "users" authenticates /admin',
    '    importMap: { baseDir: ... },',
    "    meta: { titleSuffix: ' — Lake Group CMS', ... }",
    '  },',
    '  collections: [Users, Media, Countries, Companies, Leaders, News],',
    '  editor: lexicalEditor(),',
    '  secret: process.env.PAYLOAD_SECRET || \'\',',
    '  typescript: { outputFile: \'src/payload-types.ts\' },',
    '  db: postgresAdapter({',
    '    pool: { connectionString: process.env.DATABASE_URI || \'\' },',
    "    push: PAYLOAD_PUSH === 'true' || NODE_ENV !== 'production',",
    '  }),',
    '  cors: CORS_ORIGINS.split(\',\'),      // browser origins allowed',
    '  csrf: CSRF_ORIGINS.split(\',\'),      // request-origin whitelist',
    '  serverURL: process.env.PAYLOAD_PUBLIC_SERVER_URL,',
    '})',
  ]),
  spacer(),
  table(
    ['Setting', 'Value / Behaviour'],
    [
      ['admin.user', '\u201Cusers\u201D — the collection that authenticates the admin dashboard'],
      ['admin.meta', 'Title suffix \u201C — Lake Group CMS\u201D; favicon.svg icon'],
      ['collections', 'Users, Media, Countries, Companies, Leaders, News (6)'],
      ['editor', 'lexicalEditor() — Lexical rich text for description/bio fields'],
      ['db adapter', '@payloadcms/db-postgres; connection from DATABASE_URI'],
      ['db push', 'Schema auto-created on boot in dev, or when PAYLOAD_PUSH=true (production first boot)'],
      ['cors / csrf', 'Comma-separated origin whitelists from environment variables'],
      ['serverURL', 'PAYLOAD_PUBLIC_SERVER_URL (used for redirects & absolute links)'],
    ],
    [2600, 6426],
  ),
)

/* ---------- 5. Access control ---------- */
children.push(
  h1('5.  Access Control (src/access/index.ts)'),
  p('All content collections follow the same rule: publicly readable (so the static website can fetch content), but create / update / delete require a signed-in admin. The Users collection itself is admin-only everywhere.'),
  code([
    'export const isAuthenticated: Access = ({ req: { user } }) => Boolean(user)',
    '',
    'export const isAdmin: Access = ({ req: { user } }) => {',
    '  if (!user) return false',
    "  return user.collection === 'users'",
    '}',
  ]),
  spacer(),
  table(
    ['Collection', 'read', 'create / update / delete'],
    [
      ['News', 'Public', 'Authenticated'],
      ['Leaders', 'Public', 'Authenticated'],
      ['Companies', 'Public', 'Authenticated'],
      ['Countries', 'Public', 'Authenticated'],
      ['Media', 'Public', 'Authenticated'],
      ['Users', 'Admin only', 'Admin only'],
    ],
    [2200, 2200, 4626],
  ),
)

/* ---------- 6. Collections ---------- */
children.push(
  new Paragraph({ children: [new PageBreak()] }),
  h1('6.  Collections'),
  p('Six collections define the content model. Field-level details for each are listed below, including upload behaviour, relationships and admin-group placement.'),

  /* 6.1 Users */
  h2('6.1  Users — slug "users"'),
  pv([['Auth: ', true], ['true (email + password). First user created via the /admin bootstrap screen.']]),
  pv([['Admin group: ', true], ['System  ·  Use as title: email  ·  Default columns: email, name, role']]),
  table(
    ['Field', 'Type', 'Notes'],
    [
      ['name', 'text', 'Display name of the admin user'],
      ['role', 'select', 'editor (default) | admin — reserved for future fine-grained permissions'],
    ],
    [2200, 1500, 5326],
  ),

  /* 6.2 Media */
  h2('6.2  Media — slug "media"'),
  pv([['Role: ', true], ['uploads — news banners, gallery photos, leader portraits, company logos, country flags.']]),
  pv([['Storage: ', true], ['backend/media/ via the Docker media-data volume (survives restarts).']]),
  pv([['Image sizes: ', true], ['thumbnail 400×300, card 768×576, hero 1920×1080 (centre-cropped).']]),
  pv([['MIME types: ', true], ['image/* only.']]),
  table(
    ['Field', 'Type', 'Notes'],
    [
      ['alt', 'text (required)', 'Accessible alt text for the image'],
    ],
    [2200, 1500, 5326],
  ),

  /* 6.3 Countries */
  h2('6.3  Countries — slug "countries"'),
  pv([['Mirrors: ', true], ['COUNTRY_META from assets/africa-network-map.js plus flag SVGs in assets/images/flags/.']]),
  pv([['Admin group: ', true], ['Company Data  ·  Use as title: name']]),
  table(
    ['Field', 'Type', 'Notes'],
    [
      ['name', 'text (required)', 'Country display name'],
      ['code', 'text (required, unique, indexed)', 'ISO 3166-1 alpha-2 — e.g. TZ, KE, ZM'],
      ['isOperational', 'checkbox', 'Default true; indexed; sidebar position'],
      ['isHeadquarters', 'checkbox', 'Default false; sidebar position'],
      ['flag', 'upload → media', 'Flag SVG for the country'],
      ['summary', 'textarea', 'Shown on the operations-map country panel'],
      ['lat', 'number', 'Map centre latitude'],
      ['lng', 'number', 'Map centre longitude'],
      ['defaultZoom', 'number', 'Default 6'],
      ['subsidiaryCount', 'number', 'Number of Lake Group subsidiaries in the country'],
    ],
    [2200, 2100, 4726],
  ),

  /* 6.4 Companies */
  h2('6.4  Companies — slug "companies"'),
  pv([['Mirrors: ', true], ['megamenu divisions (energies, manufacturing, logistics, realestate, agro) and subsidiary pages (lake-oil.html, lake-steel.html, …).']]),
  pv([['Admin group: ', true], ['Company Data  ·  Use as title: name']]),
  table(
    ['Field', 'Type', 'Notes'],
    [
      ['name', 'text (required)', 'Company display name'],
      ['slug', 'text (required, unique, indexed)', 'URL slug — e.g. lake-oil, lake-steel'],
      ['division', 'select (required)', 'energies | manufacturing | logistics | realestate | agro'],
      ['tagline', 'text', 'Short strap line under the company name'],
      ['description', 'richText (Lexical)', 'Full company description'],
      ['logo', 'upload → media', 'Company logo'],
      ['heroImage', 'upload → media', 'Hero banner image'],
      ['pageUrl', 'text', 'Legacy static page — e.g. lake-oil.html'],
      ['founded', 'text', 'Founding year / info'],
      ['sortOrder', 'number', 'Default 100; sidebar position'],
      ['featured', 'checkbox', 'Default false; sidebar position'],
      ['headquarters', 'relationship → countries', 'Country of headquarters'],
      ['countries', 'relationship → countries (hasMany)', 'All countries of operation'],
      ['keyStats', 'array', 'Repeating {label, value} key statistics'],
    ],
    [2200, 2400, 4426],
  ),

  /* 6.5 Leaders */
  h2('6.5  Leaders — slug "leaders"'),
  pv([['Mirrors: ', true], ['leadership-*.html profile pages: photo, role, unit, lede, bio, quote, mandate list, fact grid and the featured Founder and CEO slot.']]),
  pv([['Admin group: ', true], ['Content  ·  Use as title: name']]),
  table(
    ['Field', 'Type', 'Notes'],
    [
      ['name', 'text (required)', 'Leader display name'],
      ['role', 'text (required)', 'Job title — e.g. Founder and CEO'],
      ['unit', 'text', 'Division label — e.g. Group Leadership'],
      ['slug', 'text (required, unique, indexed)', 'URL slug — e.g. ally-edha-awadh'],
      ['featured', 'checkbox', 'Default false; exactly one leader featured'],
      ['sortOrder', 'number', 'Default 100; sidebar position'],
      ['photo', 'upload → media', 'Portrait photo'],
      ['isLogo', 'checkbox', 'Render company logo instead of photo on directory cards'],
      ['lede', 'textarea', 'One-line summary at the top of the profile'],
      ['bio', 'richText (Lexical)', 'Biography paragraphs'],
      ['quote', 'textarea', 'Signature quote'],
      ['mandate', 'array', 'Repeating responsibilities {item}'],
      ['facts', 'array', 'Repeating facts {label, value}'],
      ['company', 'relationship → companies', 'Optional link to the leader’s subsidiary'],
    ],
    [2200, 2400, 4426],
  ),

  /* 6.6 News */
  h2('6.6  News — slug "news"'),
  pv([['Mirrors: ', true], ['window.LAKE_NEWS in assets/news-data.js: id, title, date, category, bannerImage, description[] (paragraphs), images[], optional video URL.']]),
  pv([['Admin group: ', true], ['Content  ·  Use as title: title  ·  Searchable: title, excerpt']]),
  table(
    ['Field', 'Type', 'Notes'],
    [
      ['legacyId', 'number', 'ID from legacy LAKE_NEWS dataset (seed migration key)'],
      ['title', 'text (required)', 'Article title'],
      ['slug', 'text (required, unique, indexed)', 'URL slug — e.g. lake-gas-kenya-import-market'],
      ['status', 'select', 'draft (default) | published | archived; indexed; sidebar'],
      ['date', 'date (required, indexed)', 'Publish date'],
      ['category', 'select (required, indexed)', 'Expansion, LPG, Awards, Business, Logistics, Events, Sports, CSR, Announcements'],
      ['excerpt', 'textarea', 'Short summary for news cards / meta descriptions'],
      ['bannerImage', 'upload → media', 'Header image'],
      ['description', 'array', 'Repeating paragraphs {paragraph textarea}'],
      ['images', 'array', 'Repeating gallery images {image upload → media}'],
      ['videoUrl', 'text', 'Optional YouTube / external video URL'],
      ['relatedCompanies', 'relationship → companies (hasMany)', 'Companies mentioned in the article'],
      ['countries', 'relationship → countries (hasMany)', 'Countries relevant to the article'],
    ],
    [2200, 2400, 4426],
  ),
)

/* ---------- 7. Application routes ---------- */
children.push(
  new Paragraph({ children: [new PageBreak()] }),
  h1('7.  Application Routes (src/app/)'),
  p('The Next.js app is split into two route groups. Everything under (payload) was generated by Payload and hosts the admin UI and the REST API; (frontend) is a minimal landing page.'),
  h2('7.1  (payload) — admin + API'),
  table(
    ['Route file', 'Exports / Purpose'],
    [
      ['layout.tsx', 'RootLayout with handleServerFunctions — wires the admin UI to the Payload config'],
      ['admin/importMap.js', 'Import map (currently empty {}) used by Payload’s server functions'],
      ['admin/[[...segments]]/page.tsx', 'Catch-all RootPage — renders the full admin dashboard at /admin/...'],
      ['admin/[[...segments]]/not-found.tsx', 'NotFoundPage for unknown admin routes'],
      ['api/[...slug]/route.ts', 'REST_GET / POST / DELETE / PATCH / PUT / OPTIONS — exposes /api/... for every collection'],
    ],
    [3400, 5626],
  ),
  h2('7.2  (frontend) — landing page'),
  p('A simple branded page at the CMS root (port 3000) that links to the admin dashboard and to each public API endpoint. Styling lives in globals.css using the Lake Group palette (navy #013F5C, blue #0181BB, gold #FFF200).'),
  code([
    'const endpoints = [',
    "  { href: '/api/news',      label: 'News API' },",
    "  { href: '/api/leaders',   label: 'Leaders API' },",
    "  { href: '/api/companies', label: 'Companies API' },",
    "  { href: '/api/countries', label: 'Countries API' },",
    "  { href: '/api/media',     label: 'Media API' },",
    ']',
  ]),
)

/* ---------- 8. Docker & deployment ---------- */
children.push(
  h1('8.  Docker & Deployment'),
  h2('8.1  docker-compose.yml — services'),
  table(
    ['Service', 'Role / Configuration'],
    [
      ['db', 'postgres:16-alpine; user lake; database lakegroup_cms; password from POSTGRES_PASSWORD; volume db-data; pg_isready healthcheck (5s interval, 10 retries)'],
      ['migrate', 'One-shot schema migration — builds the builder target, waits for db healthy, runs npx payload migrate; never restarts'],
      ['cms', 'Main CMS — built with DATABASE_URI_ARG; port 3000:3000; depends on healthy db; volumes: media-data → /app/media; env: DATABASE_URI, PAYLOAD_SECRET, PAYLOAD_PUBLIC_SERVER_URL, CORS_ORIGINS, CSRF_ORIGINS, PAYLOAD_PUSH'],
    ],
    [1500, 7526],
  ),
  spacer(),
  pv([['Volumes: ', true], ['db-data (PostgreSQL data — survives restarts) and media-data (uploaded images, logos, flags).']]),
  h2('8.2  Dockerfile — multi-stage build'),
  table(
    ['Stage', 'Purpose'],
    [
      ['base', 'node:20-alpine + libc6-compat; working directory /app'],
      ['deps', 'Copies package.json + lockfile; runs npm ci (exact install)'],
      ['builder', 'Copies node_modules + source; npm run build with DATABASE_URI_ARG (used only at compile time) and PAYLOAD_SECRET=build_only_secret'],
      ['runner', 'Production image: standalone bundle + .next/static + public; non-root nextjs user (uid 1001); /app/media created & owned by nextjs; EXPOSE 3000; CMD node server.js'],
    ],
    [1500, 7526],
  ),
  spacer(),
  h2('8.3  Quick start'),
  code([
    '# Local development',
    'cd backend',
    'npm install',
    'cp .env.example .env            # set DATABASE_URI + PAYLOAD_SECRET',
    'docker compose up -d db         # start only Postgres',
    'npm run dev                     # http://localhost:3000/admin',
    '',
    '# Production (company servers)',
    'cp .env.example .env            # set PAYLOAD_SECRET, POSTGRES_PASSWORD, CORS_ORIGINS',
    'docker compose up -d --build',
  ]),
)

/* ---------- 9. Environment variables ---------- */
children.push(
  h1('9.  Environment Variables (.env.example)'),
  table(
    ['Variable', 'Purpose / Notes'],
    [
      ['DATABASE_URI', 'PostgreSQL connection string. Local: postgres://lake:lake_change_me@localhost:5432/lakegroup_cms. Docker: use host "db"'],
      ['PAYLOAD_SECRET', 'Long random secret signing auth tokens & encrypting payloads — generate with openssl rand -base64 48'],
      ['PAYLOAD_PUBLIC_SERVER_URL', 'Public URL of the CMS (redirects & absolute links). Default http://localhost:3000'],
      ['CORS_ORIGINS', 'Comma-separated browser origins allowed to call the REST API (the static site’s origin goes here)'],
      ['CSRF_ORIGINS', 'Comma-separated origins allowed to submit requests (CSRF protection)'],
      ['PAYLOAD_PUSH', 'Force schema auto-create/update on boot. Default false (dev-only). Set true for the FIRST production boot before migrations exist'],
      ['POSTGRES_PASSWORD', 'Docker Compose only — password for the bundled Postgres container. Default lake_change_me'],
    ],
    [3000, 6026],
  ),
  spacer(),
  p('Never commit the real .env file — .gitignore excludes .env and .env*.local.'),
)

/* ---------- 10. Seeding scripts ---------- */
children.push(
  new Paragraph({ children: [new PageBreak()] }),
  h1('10.  Data-Seeding Scripts (scripts/)'),
  p('Three scripts migrate today’s static-site content into the CMS. The extraction is fully idempotent — re-running updates existing documents instead of duplicating them.'),
  h2('10.1  site-data.ts — pure extraction module'),
  p('Contains no Payload imports, so it can run without a database. It parses the static site’s data files and returns Payload-shaped objects.'),
  table(
    ['Function', 'What it does'],
    [
      ['findRepoRoot()', 'Walks up from cwd until it finds a directory containing assets/news-data.js (the site repo root)'],
      ['assetPath() / exists()', 'Normalises a site asset path (strips query strings, fixes slashes) to an absolute path; external URLs rejected'],
      ['parseSiteDate()', 'Converts "15 Feb, 2026" / "Apr, 2014" / "2014" → ISO YYYY-MM-DD'],
      ['slugify()', 'Turns titles into URL slugs (max 80 chars)'],
      ['loadNews()', 'Executes assets/news-data.js in a sandbox with a fake window, reads window.LAKE_NEWS, maps to NewsSeed[]'],
      ['loadCountries()', 'Regex-extracts COUNTRY_META entries (iso, name, center, zoom) from assets/africa-network-map.js'],
      ['loadLeaders()', 'Scans leadership-*.html, extracts the <article class="lp-body"> block, parses name/role/unit/lede/bio/quote/mandate/facts/photo'],
      ['mimeFor() / mediaName()', 'Map file extensions to MIME types; basename for upload filenames'],
    ],
    [2600, 6426],
  ),
  spacer(),
  h2('10.2  seed.ts — import into the CMS'),
  p('Run with npx payload run scripts/seed.ts (requires a reachable database). For each country it uploads the flag SVG into media; for each news article it uploads the banner and up to 12 gallery images; then it upserts by unique keys: countries by code, news by legacyId, leaders by slug. Invalid news categories fall back to "Announcements". Plain text paragraphs are converted into Payload Lexical rich-text state.'),
  table(
    ['Source (site repo)', '→ Collection', 'Upsert key'],
    [
      ['assets/news-data.js (LAKE_NEWS)', 'news', 'legacyId'],
      ['assets/africa-network-map.js (COUNTRY_META)', 'countries', 'code'],
      ['leadership-*.html profiles', 'leaders', 'slug'],
    ],
    [3400, 2200, 3426],
  ),
  spacer(),
  h2('10.3  verify-site-data.ts — dry-run validation'),
  p('Run with npx tsx scripts/verify-site-data.ts. Validates the extraction against the real site files with no database. Fails (exit 1) if any check fails:'),
  bullets([
    'News: ≥ 30 articles loaded, every article has a parseable date, slugs are unique (missing banner files are reported but skipped gracefully)',
    'Countries: ≥ 9 countries loaded, Tanzania (TZ) marked as headquarters, all flag SVGs exist',
    'Leaders: ≥ 7 leaders loaded, exactly one featured leader, every leader has a name and role, leader photos exist',
  ]),
)

/* ---------- 11. REST API ---------- */
children.push(
  h1('11.  REST API Reference'),
  p('All collections are exposed under /api via the Payload REST catch-all. Public read requires no authentication; writes require a logged-in admin.'),
  table(
    ['Collection', 'List', 'Single'],
    [
      ['News', 'GET /api/news', 'GET /api/news/{id}'],
      ['Leaders', 'GET /api/leaders', 'GET /api/leaders/{id}'],
      ['Companies', 'GET /api/companies', 'GET /api/companies/{id}'],
      ['Countries', 'GET /api/countries', 'GET /api/countries/{id}'],
      ['Media', 'GET /api/media', 'GET /api/media/{id}'],
      ['Users', 'GET /api/users (admin only)', 'auth: POST /api/users/login'],
    ],
    [2000, 3300, 3726],
  ),
  spacer(),
  h2('Example — news page feed'),
  code([
    "const res = await fetch('https://cms.example.com/api/news?limit=12&sort=-date&depth=1')",
    'const { docs } = await res.json()',
    '// docs[].title, docs[].date, docs[].category, docs[].bannerImage.url, …',
    '',
    "// Filter by status",
    "const published = await fetch('https://cms.example.com/api/news?where[status][equals]=published')",
  ]),
)

/* ---------- 12. Static site integration ---------- */
children.push(
  h1('12.  Static-Site Integration Plan (ADMIN_ROUTE_PLAN.md)'),
  h2('12.1  Dashboard access'),
  p('Option A (recommended now): replace dashboard.html’s fake doLogin() with a redirect to the CMS admin — zero frontend work. Option B (later): keep the branded dashboard and talk to the REST API directly, signing in with POST /api/users/login (Payload sets a secure httpOnly payload-token cookie) and calling CRUD endpoints with credentials: include. Requires CORS_ORIGINS to include the dashboard origin.'),
  h2('12.2  Page wiring (phase 2)'),
  table(
    ['Page', 'Endpoint used'],
    [
      ['news.html', 'GET /api/news?sort=-date&depth=1'],
      ['news-article.html', 'GET /api/news/{id} (by slug)'],
      ['leadership.html', 'GET /api/leaders?sort=sortOrder&depth=1'],
      ['leadership-*.html', 'GET /api/leaders?where[slug][equals]=…'],
      ['africa-network.html', 'GET /api/countries + GET /api/companies'],
      ['Megamenu', 'GET /api/companies?sort=sortOrder'],
    ],
    [2600, 6426],
  ),
  spacer(),
  h2('12.3  Security notes'),
  bullets([
    'Writes require login; read access is public so the website can fetch content',
    'Users collection is admin-only, and the first user is bootstrapped via the UI',
    'Set a strong PAYLOAD_SECRET and POSTGRES_PASSWORD; keep the CMS behind a VPN/firewall if only internal editors manage it',
    'The REST API is CORS-locked to CORS_ORIGINS',
  ]),
)

/* ---------- 13. Commands ---------- */
children.push(
  new Paragraph({ children: [new PageBreak()] }),
  h1('13.  Useful Commands'),
  table(
    ['Command', 'Purpose'],
    [
      ['npm run dev', 'Start the dev server (Next.js, port 3000)'],
      ['npm run build', 'Production build'],
      ['npm run start', 'Serve the production build'],
      ['npm run lint', 'Next.js lint'],
      ['npm run generate:types', 'Regenerate src/payload-types.ts from collections'],
      ['npm run generate:importmap', 'Regenerate the Payload admin import map'],
      ['npm run seed', 'Import static-site content (news, countries, leaders)'],
      ['npm run seed:verify', 'Dry-run check of the extraction (no DB needed)'],
      ['npx payload migrate', 'Create/apply SQL migrations'],
      ['npx payload create-user', 'Create an admin user from the CLI'],
    ],
    [3400, 5626],
  ),
)

/* ---------- 14. Summary ---------- */
children.push(
  h1('14.  Summary'),
  p('The Lake Group CMS is a compact, self-hosted content backend: six collections (Users, Media, Countries, Companies, Leaders, News) managed through Payload’s /admin panel and served to the static site over a public REST API. It deploys with Docker Compose (PostgreSQL 16 + CMS), persists uploads and data in named volumes, and ships with idempotent seed scripts that migrate the current static-site content — news, countries and leadership profiles — into the database.'),
  p('The next integration milestones are documented in backend/ADMIN_ROUTE_PLAN.md: point the existing dashboard at /admin, then wire news, leadership, countries, companies and the megamenu to the API collection-by-collection.'),
)

/* ------------------------------------------------------------------ */
/*  Assemble document                                                  */
/* ------------------------------------------------------------------ */

const doc = new Document({
  creator: 'Freebuff AI Assistant',
  title: 'Lake Group CMS — Backend Technical Documentation',
  description: 'Complete technical reference for the backend/ Payload CMS of lakeoilgroup.com',
  styles: {
    default: {
      document: { run: { font: 'Calibri', size: 21, color: INK } },
    },
  },
  numbering: {
    config: [
      {
        reference: 'bullets',
        levels: [
          {
            level: 0,
            format: LevelFormat.BULLET,
            text: '\u2022',
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          },
        ],
      },
    ],
  },
  features: { updateFields: true },
  sections: [
    {
      properties: {
        page: {
          margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
        },
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: 'Lake Group CMS — Backend Documentation  ·  ', color: MUTED, size: 16 }),
                new TextRun({ children: [PageNumber.CURRENT], color: MUTED, size: 16 }),
                new TextRun({ text: ' / ', color: MUTED, size: 16 }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], color: MUTED, size: 16 }),
              ],
            }),
          ],
        }),
      },
      children,
    },
  ],
})

const outPath = path.resolve(__dirname, '..', 'docs', 'Lake_Group_CMS_Backend_Documentation.docx')
Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(outPath, buffer)
  console.log('Wrote', outPath, `(${buffer.length.toLocaleString()} bytes)`)
})
