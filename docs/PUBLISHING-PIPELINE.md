# Publishing Pipeline

## Content Workflow

CMS saves create or reopen DRAFT records. Authors submit them for review,
reviewers approve them, and authorized publishers move APPROVED records to
PUBLISHED. Public APIs never return working copies.

Saving in the CMS does not update the website. A public release is produced
only after publication and only from public API projections.

## Snapshot Generation

Run from a trusted release job with access to the public backend:

```powershell
$env:LAKE_PUBLIC_API_BASE = "https://api.example.com"
npm run public:snapshot
npm run test:public-delivery
```

`scripts/public-snapshot.js` retrieves every governed public collection plus
metrics, the operations map, and approved knowledge facts. It validates the
complete payload, hashes the content, writes
`public-content/releases/<content-hash>/content.json`, verifies the written
file, and only then replaces `public-content/current.json`.

The release ID is content-addressed. Repeating a build without a content change
is idempotent. Historical release directories are retained.

## Atomic Promotion

1. Generate into a temporary directory.
2. Validate required collections and map/knowledge shapes.
3. Rename the complete immutable directory into `releases/`.
4. Write and replace the current manifest.
5. Run browser resilience tests.
6. Deploy the repository as one Vercel deployment.
7. Confirm the deployed manifest and representative pages.

Vercel deployment promotion is atomic at the site level. If generation, tests,
or deployment fail, the previously promoted deployment and release remain
current. Do not purge the previous deployment first.

## Cache Policy

- `public-content/current.json`: revalidate every request.
- versioned release JSON: one-year immutable cache.
- HTML: revalidate so SEO and generated markup move with deployment.
- static images: long-lived stale-while-revalidate under existing Vercel
  policy.

The manifest is the narrow invalidation point; immutable releases are never
purged. This prevents a cache rebuild from making the site unavailable.

## Release Trigger

The API release worker polls the durable `PublicationEvent` ledger for
PUBLISHED, UNPUBLISHED, and ROLLED_BACK actions. It sends a minimal,
authenticated GitHub `repository_dispatch` whose deterministic idempotency key
is `publication-<event-id>`. Event metadata records PENDING/DISPATCHING,
TRIGGERED, RETRY_SCHEDULED, or FAILED state, attempts, request ID, sanitized
last error, and retry time. `GET /admin/public-releases` exposes this state to
authenticated CMS operators without exposing credentials.

`.github/workflows/public-release.yml` accepts only `cms-publication`, ignores
the payload's API URL, and reads the trusted API/Vercel values from the
protected `production` environment. It generates the content-addressed
snapshot, runs delivery and secret checks, builds with an explicitly pinned Vercel CLI,
and deploys only the validated prebuilt output. Workflow concurrency is keyed
by publication event and never cancels an in-progress release.

Retries are safe: the same public data produces the same content hash, release
directory, and manifest. A repeated Vercel deployment may create another
deployment record but cannot publish partial snapshot content.
