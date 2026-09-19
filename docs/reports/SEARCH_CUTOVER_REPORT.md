# Search cutover report

## Source state prepared for deployment

| Signal | Prior public source | Current public source |
| --- | --- | --- |
| Home crawl directive | `noindex,nofollow` | `index,follow,max-image-preview:large` |
| Canonical hostname | absent or preview state | `https://www.lakeoilgroup.com/` |
| Sitemap | empty migration placeholder | 31 canonical HTTPS `www` URLs |
| Robots | global crawl block | allow crawling plus canonical sitemap |
| Home metadata | preview/old-state signals | current title, description, canonical, Open Graph and Twitter metadata |
| Organization identity | inconsistent legacy signal | current Lake Group Organization, WebSite, logo, market and company entities |
| Social image | inconsistent or absent page metadata | stable `assets/images/social/lake-group-og-v2.jpg` (1200 × 630 JPEG) |
| Legacy URL behavior | no controlled map | canonical HTTPS/`www` first, then mapped 301s or a normal 404 |

## Live audit recorded before deployment

On 2026-09-19, all four host variants returned `200` rather than converging by redirect. The live `robots.txt` returned `Disallow: /`, the live sitemap was empty, and the raw live Home response retained `noindex,nofollow`. This is an origin/proxy deployment issue, not a Google cache issue.

## Required IT completion

Deploy the current public files and `web.config`, point both hostname bindings to the same root, purge HTML/robots/sitemap at any CDN or reverse proxy, and validate direct HTTP headers. Then use Search Console Live Test, submit the sitemap, and request indexing for Home, About, Lake Oil, Lake Aviation, Careers, Contact, History, and CSR. Google search and image presentation will update only after recrawl.
