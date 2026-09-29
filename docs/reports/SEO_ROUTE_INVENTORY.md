# SEO Route Inventory — 2026-09-02

## Delivery architecture

- Static root HTML served by Vercel (`cleanUrls: false`)
- Canonical production origin: `https://www.lakeoilgroup.com`
- English is the only published crawl locale
- Search metadata is generated into source HTML by `scripts/build-seo-foundation.mjs`

## Indexable public routes (36)

`/`, `/about.html`, `/africa-network.html`, `/agrinova-tech.html`, `/aficd.html`, `/aill.html`, `/assembly-tech.html`, `/careers.html`, `/contact.html`, `/cross-country.html`, `/csr.html`, `/fleet.html`, `/gallery.html`, `/gulf-aggregates.html`, `/history.html`, `/investors.html`, `/lake-agro.html`, `/lake-aviation.html`, `/lake-buildings.html`, `/lake-cylinders.html`, `/lake-gas.html`, `/lake-lubes.html`, `/lake-oil.html`, `/lake-pipes.html`, `/lake-premix-cement.html`, `/lake-steel.html`, `/lake-trans.html`, `/leadership.html`, `/leadership-ally-edha-awadh.html`, `/media-center.html`, `/news.html`, `/nextdrive-motors.html`, `/our-story.html`, `/projects.html`, `/station-locator.html`, `/sustainability.html`.

## Excluded routes (11)

`/404.html`, `/offline.html`, `/dashboard.html`, `/acfs.html`, `/atl.html`, `/la-home.html`, `/la-projects.html`, `/ocean-galleria.html`, `/news-article.html`, `/lake-group-financial-dashboard.html`, `/lake-group-org-chart.html`.

These pages are either error/utility views, redirect sources, generic client-driven article shells, or non-public internal tools. They remain available only where existing routing requires them and receive `noindex,nofollow`.

## Pre-implementation findings

- Canonical and Open Graph URLs were split between the production domain and a Vercel preview domain.
- Sitemap discovery exposed only two URLs.
- JSON-LD existed on many pages but was inconsistent and did not share stable organization/website identifiers.
- Client-side dictionaries contain several languages, but the active runtime supports English only; these are not crawlable localized documents and must not be advertised with `hreflang`.
- The visible language selector remains intentionally hidden.

## Follow-up audit queue

- Publish reviewed Swahili pages before enabling `/sw/` URLs or hreflang.
- Resolve non-visual heading hierarchy findings page by page without changing approved layouts.
- Audit dynamic news-detail URLs when a stable canonical article-route model is available.
