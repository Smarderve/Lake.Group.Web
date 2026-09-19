# Lake Group static website deployment checklist

## IIS deployment

1. Deploy the current repository's public web-root files and `assets/` directory to the IIS site root. Do not deploy `backend/`, `cms/`, `node_modules/`, `.env*`, test artifacts, or private credentials as public content.
2. Install and enable the IIS URL Rewrite module. The supplied `web.config` permanently redirects every HTTP or non-`www` request to `https://www.lakeoilgroup.com` while preserving the path and query string.
3. Bind `www.lakeoilgroup.com` on HTTPS with the production TLS certificate. Keep `lakeoilgroup.com` bound long enough for IIS to issue its permanent redirect.
4. Point both DNS names at the same IIS site or reverse proxy. Do not host a second website on the apex domain.
5. Enable IIS Static Content and Static Compression. Confirm Brotli or gzip is active for HTML, CSS, JavaScript, JSON, and SVG.
6. Verify MIME responses for WebP, SVG, WOFF2, JavaScript, JSON, Web Manifest, ICO, JPEG, and PNG.
7. Confirm HTML revalidates, `/assets/` may use long browser caching, and `sw.js` returns `Cache-Control: no-cache, no-store, must-revalidate`.
8. Test the site with every CMS, API, Node.js process, and PostgreSQL service stopped.

## Search and previews after deployment

1. Verify the Google Search Console domain property for `lakeoilgroup.com`.
2. Use URL Inspection to test the live homepage and confirm crawling and indexing are allowed.
3. Confirm Google selects `https://www.lakeoilgroup.com/` as canonical.
4. Submit `https://www.lakeoilgroup.com/sitemap.xml`.
5. Request indexing for the homepage, About, Lake Oil, Lake Aviation, CSR, Careers, Contact, and History pages.
6. Monitor Pages, Sitemaps, HTTPS, and Core Web Vitals reports. Google search snippets update on Google's crawl schedule, not immediately after deployment.
7. Refresh cached social cards with LinkedIn Post Inspector and Meta Sharing Debugger. Confirm each inspected `og:image` opens directly with HTTP 200 and an `image/jpeg` response.
