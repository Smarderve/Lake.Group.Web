# Public Delivery Architecture

## Current State (Phase 0)

The public website is a static multi-page site made from root-level HTML,
JavaScript, CSS, fonts, and images. It has no React/Vue runtime, SSR, SSG, ISR,
or server-rendered request path. `vercel.json` configures Vercel static hosting,
redirects, and cache headers. Vercel's edge delivery is therefore the existing
public CDN. The backend now supports an S3-compatible media/object-backup
storage boundary, with a filesystem adapter limited to development and tests.

The CMS is a Vite/React application in `cms/`. It writes governed content
through the Express backend in `backend/`, backed by PostgreSQL/Prisma.
Governed records move through DRAFT, IN_REVIEW, APPROVED, PUBLISHED, and
ARCHIVED states. The backend public routes expose only PUBLISHED and
visibility-eligible records.

Before this resilient-delivery work, public scripts fetched the live backend:

- `assets/registry-api.js` hydrated tagged companies, leadership, projects,
  history, contacts, media, CSR, careers, facilities, and related records.
- `assets/metrics-api.js` hydrated governed corporate metrics.
- `assets/news-api.js` replaced the bundled news collection.
- `assets/africa-network-map.js` replaced static operations-map markers.
- `assets/assistant.js` fetched the approved knowledge bundle.

When those requests failed, static markup or bundled JavaScript data remained.
That kept pages visible but left the frontend as a second business-data source.
It also made freshness and provenance ambiguous.

## Existing Import and Publication Capabilities

- `backend/scripts/content-seed-data.js`, `seed-content.js`, and
  `seed-metrics.js` already implement repeatable initial onboarding.
- Seeds create PUBLISHED records, immutable versions, and audit rows.
- `seed-content.js` resolves relationships in dependency order and skips
  existing records unless explicitly forced.
- The public API already formats authoritative published shapes for all
  governed domains, map data, media, metrics, and knowledge facts.
- Publication events are recorded in PostgreSQL. A lightweight API worker
  durably tracks public-release dispatch state in event metadata and retries
  protected GitHub dispatches with bounded exponential backoff.
- Media supports governed existing URLs and validated binary uploads.
  Production objects use generated immutable S3-compatible keys; the public
  snapshot receives only CDN URLs and presentation metadata.

## Target State

```text
CMS
  -> Express/PostgreSQL source of truth
  -> governed publication
  -> snapshot export from public API
  -> validate complete release
  -> versioned static content
  -> atomic Vercel deployment/current manifest
  -> static website and first-time visitors
```

The static website consumes same-origin versioned published content. It does
not require the live CMS, backend, database, browser cache, local storage, or a
previous service-worker installation. The HTML, SEO tags, local media, and
versioned JSON ship together through Vercel.

## Deployment Boundary

Repository code can generate, validate, test, and package immutable releases.
Updating the production Vercel project requires external project credentials,
domains, and deployment authorization. A failed generation or deployment must
leave the previously promoted Vercel deployment unchanged.

The repository-controlled path is complete: CMS workflow action →
`PublicationEvent` → release worker → protected GitHub dispatch → atomic
snapshot → checks → Vercel prebuilt deployment. Operators still supply the
scoped GitHub/Vercel/object-storage credentials and project identifiers.

See `PUBLISHING-PIPELINE.md` and `FAILURE-RESILIENCE.md` for the implemented
release and recovery behavior.
