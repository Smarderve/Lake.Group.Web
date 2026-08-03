# Lake Group CMS — Self-Hosted Payload Backend

Headless content backend for **lakeoilgroup.com**. Runs entirely on your own
company servers (Docker + PostgreSQL). The static website keeps living on
Vercel (or your servers) and consumes the REST API.

## What's inside

| Collection  | Slug         | Mirrors on the site                                  |
| ----------- | ------------ | ---------------------------------------------------- |
| News        | `news`       | `assets/news-data.js` (`window.LAKE_NEWS`)           |
| Leaders     | `leaders`    | `leadership-*.html` profile pages                    |
| Companies   | `companies`  | Subsidiary pages + megamenu divisions                |
| Countries   | `countries`  | `assets/africa-network-map.js` + flag SVGs           |
| Media       | `media`      | Uploads: banners, photos, logos, flags               |
| Users       | `users`      | Admin login for the dashboard                        |

## Quick start (local dev)

```bash
cd backend
npm install
cp .env.example .env          # set DATABASE_URI + PAYLOAD_SECRET
docker compose up -d db       # start only Postgres
npm run dev                   # http://localhost:3000/admin
```

First visit to `/admin` shows a "create first user" screen — that becomes your
admin account.

## Production (company servers)

```bash
cd backend
cp .env.example .env          # set PAYLOAD_SECRET, POSTGRES_PASSWORD, CORS_ORIGINS
docker compose up -d --build
```

| Route            | Purpose                                  |
| ---------------- | ---------------------------------------- |
| `http://HOST:3000` | Landing page (points to admin + APIs)  |
| `http://HOST:3000/admin` | **Admin dashboard** — full CRUD      |
| `http://HOST:3000/api/news` | Public REST API (all collections) |

Data survives restarts: Postgres in the `db-data` volume, uploaded images in
`media-data`.

## Useful commands

```bash
npm run generate:types      # regenerate src/payload-types.ts from collections
npx payload migrate         # create/apply SQL migrations
npx payload create-user     # create an admin from the CLI

npm run seed:verify         # dry-run: check site-data extraction (no DB needed)
npm run seed                # import the current site content (news, countries, leaders)
```

## Seeding today's content

`npm run seed` migrates the static site's existing data into the CMS:

| Source (site repo)                     | → Collection | Keyed by      |
| -------------------------------------- | ------------ | ------------- |
| `assets/news-data.js` (`LAKE_NEWS`)    | `news`       | `legacyId`    |
| `assets/africa-network-map.js` (`COUNTRY_META`) | `countries` | `code` |
| `leadership-*.html` profiles           | `leaders`    | `slug`        |

It is **idempotent** — re-running updates existing docs instead of duplicating
them. Images, banners and flags are uploaded to `media` once (cached by path).
Run `npm run seed:verify` first (no database required) to sanity-check the
extraction against the current site files.

## Project layout

```
backend/
├── docker-compose.yml      # Postgres 16 + CMS, healthcheck + volumes
├── Dockerfile              # multi-stage, Next.js standalone output
├── src/
│   ├── payload.config.ts   # collections, db, editor, CORS
│   ├── access/index.ts     # isAuthenticated / isAdmin access rules
│   ├── collections/        # Users, Media, Countries, Companies, Leaders, News
│   └── app/
│       ├── (payload)/      # /admin UI + /api REST catch-all
│       └── (frontend)/     # landing page
└── ADMIN_ROUTE_PLAN.md     # how the site + dashboard wire into this backend
```

See **ADMIN_ROUTE_PLAN.md** for the wiring plan (dashboard login, page
integration, seed migration).
