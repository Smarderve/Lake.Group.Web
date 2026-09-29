# Domain Reference Audit

Date: 2026-09-02
Scope: pre-official-domain-migration SEO identity and URL generation.

## Centralized and safe

- Generated canonical, Open Graph URL/image, JSON-LD, sitemap, robots sitemap and `llms.txt` URLs now derive only from `SITE_URL` (or the compatible `NEXT_PUBLIC_SITE_URL` fallback) in `scripts/seo-config.mjs`.
- No default host is committed. Without an official HTTPS origin, generated preview output is `noindex,nofollow`, has no canonical or JSON-LD identity URLs, provides an empty sitemap and blocks crawling in `robots.txt`.
- Optional Google and Bing verification metadata reads only genuine deployment values. No token is stored in source.

## Valid non-canonical references retained

- `mailto:admin@lakeoilgroup.com` references are published contact details, not site-identity URLs.
- `http://127.0.0.1` content-security-policy entries are local development allowances, not canonical or crawler configuration.
- External official social links and third-party service URLs remain untouched because they are not Lake Group canonical URLs.

## Development-only or historical references

- `vercel.app`, `localhost`, `127.0.0.1` and old-domain mentions in QA screenshots, archived reports, deployment notes and test fixtures are classified as development-only or historical documentation.
- These references must never be reused for canonicals, sitemaps, robots sitemap lines, Open Graph URLs or JSON-LD identifiers.

## Migration action

After the official domain is confirmed, set one HTTPS origin in `SITE_URL`, rebuild the SEO artifacts, and complete [the migration checklist](../development/DOMAIN_MIGRATION_CHECKLIST.md). Do not activate permanent redirects from temporary hosts until deployment ownership and preview workflow requirements are confirmed.
