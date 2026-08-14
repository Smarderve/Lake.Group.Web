# Resilient Public Website Migration Status

Status date: 2026-08-13

| Phase | Result | Evidence |
| --- | --- | --- |
| 0 Inspect | complete | `PUBLIC-DELIVERY-ARCHITECTURE.md` records the real static/Vercel, CMS, backend, PostgreSQL, media, cache, and job state. |
| 1 Hardcoded audit | complete | `PUBLIC-DATA-AUDIT.md`; source material retained. |
| 2 Source of truth | complete | Existing governed Prisma models reused; no second database. |
| 3 Import | complete | Idempotent seeds, 16 seed-data tests, page SEO and map-route onboarding. |
| 4 Publishing model | complete | Existing DRAFT to PUBLISHED workflow retained; saves do not promote snapshots. |
| 5 Snapshot | complete | Content-addressed release generator and validation. |
| 6 Independent delivery | complete | Same-origin static release loader; zero live content API requests in browser test. |
| 7 Cache/revalidation | complete | Revalidating manifest and immutable version cache headers. |
| 8 Atomic releases | complete | Failed generation retains current manifest and old release in unit tests. |
| 9 Frontend connection | complete | Registry, news, metrics, map, assistant facts, SEO, and globe read the snapshot. |
| 10 First-time failure | complete locally | New Playwright context, service workers blocked, disposable API down, current release served. |
| 11 Failure conditions | complete locally | CMS/backend/database independence follows from static delivery; no-version validation fails deliberately. |
| 12 Publishing reliability | complete in repository | Validation and atomic promotion implemented; production trigger needs external CI/Vercel configuration. |
| 13 Media resilience | complete | Public media is in release/static hosting; authenticated media routes rejected. |
| 14 Operations map | complete | Facilities and routes are governed; frontend marker/route constants removed. |
| 15 SEO | complete | 47 page metadata records governed and included; static HTML remains crawler-readable. |
| 16 Recovery | complete locally | Unit test publishes changed content after a failed attempt and retains the prior version. |
| 17 Regression | complete with noted baseline | Browser entity/news/map checks, accessibility audit, SEO audit; seven pre-existing missing our-story scene images remain. |
| 18 Final hardcoded audit | complete | Runtime content constants removed/classified; generated bundle and presentation camera/colour configuration are valid artifacts/config. |
| 19 CMS UI guardrails | complete | Existing design retained; no new dashboard surfaces introduced. |
| 20 CMS copy | complete | Banned generic phrases absent; em dash removed from CMS source; typecheck and focused tests pass. |
| 21 Documentation | complete | All seven required public-delivery documents exist. |
| 22 End-to-end acceptance | local proof complete; staging blocked | Atomic tests and clean-browser outage test pass. Exact production-like staging deploy requires external credentials and authorization. |
| 23 Definition of done | repository complete; external gate open | Code/config/docs satisfy repository-controlled items. Production Vercel trigger and staging outage exercise remain release-owner actions. |

## Current Published Artifact

`public-content/current.json` selects an immutable content-addressed release.
Historical releases are retained so publication failure cannot delete the last
known-good version.

## Remaining Non-Code Inputs

1. Configure the production Vercel project/domain and protected deployment
   credentials.
2. Configure a trusted publication-event/release trigger.
3. Execute the exact Phase 22 sequence in staging, including disabling the real
   backend/database and opening separate clean browsers.
4. Restore the seven missing `assets/images/our-story/scene*.jpg` files or
   remove their pre-existing references after content-owner review.
