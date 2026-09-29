# Technical SEO Crawl Audit

Date: 2026-09-02
Scope: Phase 4 indexing, crawlability and search-engine readiness for the English-only public site.

## Canonical source and public index

- Canonical production URL: intentionally unset until Lake Group confirms its official domain.
- Single source: deployment `SITE_URL` (or `NEXT_PUBLIC_SITE_URL`) in `scripts/seo-config.mjs`.
- Indexed public English routes: 35 after the official domain is configured; preview builds are deliberately non-indexable.
- Non-indexable public/utility routes: 12
- Locale routes published: none; English remains the only public language.
- With `SITE_URL` configured, `sitemap.xml` contains only canonical English routes generated from the route registry.
- Without it, `sitemap.xml` remains empty and `robots.txt` blocks crawling so temporary deployments cannot become the corporate canonical identity.

## Code-side checks and fixes

- Added a repeatable static internal-link, redirect-chain, sitemap and indexability validator: `npm run test:crawl`.
- Flattened five legacy leadership redirect chains to their final canonical destination.
- Removed a conflicting redirect from the canonical Ally Edha Awadh leadership profile, which is now internally linked from the Leadership page.
- Added natural contextual discovery links for the Lake Group story, Lake Trans fleet, Lake Oil station locator and Sustainability page.
- Kept `media-center.html` public but marked it non-indexable and removed it from the sitemap because it is not exposed through approved site navigation.
- Regenerated `llms.txt` exclusively from verified public metadata and canonical URLs; it no longer links to internal CMS or API endpoints.
- Added optional deployment-environment support for real Google Search Console and Bing Webmaster verification tokens. No verification code is committed.

## Local validation completed

- `npm run build:seo`
- `npm run test:seo`
- `npm run test:crawl`
- Rendered metadata/mobile inspection of 12 representative routes at 430, 390, 375, 360 and 320px.
- Invalid and unpublished locale routes (`/sw/`, `/fr/`, `/ar/`, `/pt/`) return 404 in the local production-style server.

## Historical external deployment finding

The earlier domain observations are superseded by the pre-domain-migration plan. Do not treat any temporary or previous deployment host as Lake Group's permanent canonical identity.

## Required external actions

Follow [the official-domain migration checklist](../development/DOMAIN_MIGRATION_CHECKLIST.md) after the official domain is confirmed. Set webmaster verification tokens only after receiving genuine values, and submit the sitemap only after the domain cutover passes validation.

No Google Search Console or Bing verification/submission has been performed from this repository.
