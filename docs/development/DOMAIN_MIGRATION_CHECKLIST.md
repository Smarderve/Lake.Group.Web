# Official Domain Migration Checklist

Lake Group remains English-only and intentionally non-indexable on temporary or preview deployments until the official production domain is confirmed. `SITE_URL` is the one public-origin setting for canonical URLs, sitemap entries, robots sitemap references, Open Graph URLs and images, JSON-LD identifiers and URLs, BreadcrumbList URLs, and `llms.txt` links.

## Before the cutover

1. Confirm the final official domain with Lake Group.
2. Configure DNS for that domain.
3. Connect the official domain to the production deployment.
4. Confirm HTTPS and the preferred host resolve successfully.
5. Set `SITE_URL=https://FINAL-OFFICIAL-DOMAIN` in the production environment.
6. Add genuine `GOOGLE_SITE_VERIFICATION` and/or `BING_SITE_VERIFICATION` values only after they are issued.
7. Redeploy with the official domain configuration.
8. Verify each canonical URL uses the official origin.
9. Verify every `sitemap.xml` URL uses the official origin.
10. Verify `robots.txt` allows public crawling and references the official sitemap.
11. Verify Open Graph URLs and absolute image URLs use the official origin.
12. Verify JSON-LD `@id`, `url`, logo and breadcrumb URLs use the official origin.
13. Test Home, About, Corporate, each vertical and priority company pages on desktop and mobile.
14. Test every redirect and confirm it reaches the equivalent official-domain route in one permanent hop.

## Search-engine activation

15. Verify the official domain in Google Search Console.
16. Verify the official domain in Bing Webmaster Tools.
17. Submit the official `/sitemap.xml` to both services.
18. Inspect priority URLs and request indexing where appropriate.
19. Monitor indexing, crawl errors and canonical reports.
20. Monitor Core Web Vitals after the cutover.
21. Keep the public site English-only until real, reviewed localized equivalents are published.

## Temporary-domain strategy

Do not redirect preview, review or development deployments now: doing so can break normal workflows. At the official-domain cutover, configure the temporary public deployment to return a permanent redirect for every legitimate path to the same path on the official domain. Do not redirect every legacy path to the homepage. Preview-only hosts should stay blocked from indexing and must not emit canonical, sitemap, Open Graph URL or JSON-LD identity claims for the official site.

## Validation commands

Run `npm run build`, `npm run test:seo` and `npm run test:crawl` with `SITE_URL` set in the production environment. Then inspect the rendered page source and sitemap before submitting either webmaster property.
