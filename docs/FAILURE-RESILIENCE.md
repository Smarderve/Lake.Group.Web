# Public Website Failure Resilience

## CMS Failure

Employees cannot edit or publish while the CMS is unavailable. Visitors keep
receiving the current Vercel deployment and its immutable published snapshot.

## Backend Failure

New publishing and write-only features such as analytics/content-gap reporting
may pause. Public pages, navigation, companies, geography, projects, news,
leadership, contacts, history, gallery, metrics, map data, approved assistant
facts, media paths, and SEO remain in the static deployment. Public content
loaders make no live public-content API request.

## Database Failure

CMS/backend reads and publication stop. The last successful static deployment
does not query PostgreSQL and remains available.

## First-Time Visitors

A new browser requests HTML, assets, `public-content/current.json`, and the
selected immutable release directly from Vercel. Browser cache, local storage,
service workers, and prior visits are not required. The automated browser
acceptance test blocks service workers, uses a new context, returns failures
from the disposable live API, and verifies the current release ID and content.

## No Published Version

The snapshot generator refuses to promote a release without companies,
metrics, and map countries. If a deployment genuinely has no valid release,
the loader reports an unavailable state and the server should return a minimal
service message. It must not fabricate company facts. Production must not
delete the prior Vercel deployment or immutable release.

## Publication Failure

Failed source retrieval, non-2xx responses, malformed collections, missing
required content, write errors, browser-test failures, or deployment failures
stop promotion. `current.json` remains unchanged and the prior release
directory remains present. Unit tests exercise this failure explicitly.

## Media Failure

Repository media ships with the static deployment. Governed external media
URLs are included in the release but depend on their own public host. Media
still referenced by any retained release must not be deleted. Authenticated
CMS media endpoints are never used as visitor image URLs.

## Recovery

1. Restore PostgreSQL/backend/CMS.
2. Resolve and approve any interrupted content change.
3. Generate a new snapshot.
4. Validate that the content hash changed when expected.
5. Run unit and clean-browser outage tests.
6. Deploy and verify `current.json` points at the new release.
7. Confirm media, map, and SEO on representative pages.

No full-site cache purge is needed. The current manifest revalidates; the new
content-addressed release has a new URL.
