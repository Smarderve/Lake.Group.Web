# Lake Group SEO, AEO and Internationalization Foundation

## Current production model

The public site is static HTML served from the repository root. `scripts/seo-config.mjs` is the canonical search configuration and `scripts/build-seo-foundation.mjs` writes crawler-visible metadata into each root HTML document. It is not a client-side metadata system.

- Production origin: `https://www.lakeoilgroup.com`
- Source language: English (`lang="en"`)
- Indexable pages: configured in `INDEXABLE_ROUTES`
- Utility, legacy and redirect-source pages: configured in `NON_INDEXABLE_ROUTES`
- Parent entity: `https://www.lakeoilgroup.com/#organization`
- Website entity: `https://www.lakeoilgroup.com/#website`

Each indexable page receives one canonical URL, unique source-page title and description, Open Graph/Twitter metadata, robots directives and valid JSON-LD. Company pages receive a related Organization entity and breadcrumbs connect the public hierarchy: Home → Business Verticals → Sector → Company.

## Locale publication policy

English is currently the only published search locale. The `/en/` and `/sw/` route prefixes are registered in `LOCALES`, but intentionally are **not** published or linked yet. This avoids duplicate English pages, false hreflang, and unreviewed translation content.

When a locale is ready, the publication change must be made in one review:

1. Create the actual equivalent static route at `/en/...` or `/sw/...` with reviewed native-language primary content.
2. Set `html lang` to the locale code and self-canonicalize the localized URL.
3. Register that exact route in the locale's `routes` list and set the locale to `published: true`.
4. Run `node scripts/build-seo-foundation.mjs` to emit reciprocal `hreflang` and `x-default` links.
5. Run `node scripts/verify-seo-foundation.mjs`, then verify every alternate returns 200 and contains equivalent content.
6. Regenerate the sitemap only after localized routes are public and approved.

The language selector remains hidden; this foundation does not alter language UX or automatically redirect visitors by IP/location.

## Commands

```powershell
node scripts/build-seo-foundation.mjs
node scripts/build-sitemap.js --domain=https://www.lakeoilgroup.com
node scripts/verify-seo-foundation.mjs
npm.cmd run test:public-delivery
```

## AEO guardrails

Use page-native semantic sections and verified company copy to answer business questions. Do not add fabricated FAQs, keyword blocks, translated pages, locations, certifications, metrics or social profiles. The visual globe remains supplemental; indexable company and operational information must also be present as ordinary HTML text.
