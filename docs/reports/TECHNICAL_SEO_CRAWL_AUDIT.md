# Technical SEO Crawl Audit

Date: 2026-09-02
Scope: Phase 4 indexing, crawlability and search-engine readiness for the English-only public site.

## Canonical source and public index

- Canonical production URL: `https://www.lakeoilgroup.com`
- Single source: `SITE_URL` in `scripts/seo-config.mjs`
- Indexed public English routes: 35
- Non-indexable public/utility routes: 12
- Locale routes published: none; English remains the only public language.
- `sitemap.xml` contains only canonical English routes generated from the route registry.
- `robots.txt` allows public crawling, blocks only utility/private paths, and references the canonical sitemap.

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

## External deployment finding

On 2026-09-02, direct public requests showed that `https://www.lakeoilgroup.com/` and `/index.html` returned 200, while sampled routed pages plus `/robots.txt` and `/sitemap.xml` returned 404. The current Vercel deployment (`https://lakegroup.vercel.app`) served those sampled pages successfully.

This is a deployment/custom-domain routing issue, not a static-site source issue. It must be resolved before the configured canonical domain can be submitted to search engines.

## Required external actions

1. Attach and verify `www.lakeoilgroup.com` on the current Vercel production deployment, then confirm every sitemap URL returns 200 and self-canonicalizes.
2. Set `GOOGLE_SITE_VERIFICATION` and/or `BING_SITE_VERIFICATION` only after receiving genuine tokens, then rebuild and deploy.
3. Verify the domain in Google Search Console and Bing Webmaster Tools, submit `https://www.lakeoilgroup.com/sitemap.xml`, and monitor crawl/indexing reports.
4. Request re-indexing only after the custom-domain route checks pass.

No Google Search Console or Bing verification/submission has been performed from this repository.
