#!/usr/bin/env node
// Audit CMS coverage without changing the independent public website.
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { CMS_V2_PAGE_DEFINITIONS } from '../backend/src/lib/cms-v2-content.js';
import { cmsV2PageFamily } from '../backend/src/lib/cms-v2-page-families.js';

const root = resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
const sitemap = await readFile(resolve(root, 'sitemap.xml'), 'utf8');
const redirects = JSON.parse(await readFile(resolve(root, 'vercel.json'), 'utf8')).redirects ?? [];
const activeRoutes = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => {
  const pathname = new URL(match[1]).pathname;
  return pathname === '/' ? 'index.html' : pathname.slice(1);
}));
const redirectedRoutes = new Set(redirects.filter((item) => item.permanent).map((item) => item.source.replace(/^\//, '')));
const registeredRoutes = new Set(CMS_V2_PAGE_DEFINITIONS.map((page) => page.route));
const missingRoutes = [...activeRoutes].filter((route) => !registeredRoutes.has(route));
const rows = [];

for (const page of CMS_V2_PAGE_DEFINITIONS) {
  const html = await readFile(resolve(root, page.route), 'utf8');
  const active = activeRoutes.has(page.route) && !redirectedRoutes.has(page.route);
  const assetUrls = [...html.matchAll(/(?:src|href|data-bg)=["']([^"']+)["']/gi)]
    .map((match) => match[1])
    .filter((value) => !/^\s*(?:https?:|data:|mailto:|tel:|#|javascript:)/i.test(value) && /\.(?:png|jpe?g|webp|gif|svg|avif|mp4|webm|pdf|docx?|xlsx?|pptx?)(?:[?#]|$)/i.test(value));
  const brokenAssets = [];
  if (active) for (const asset of new Set(assetUrls)) {
    try { await access(resolve(root, asset.replace(/^\//, '').split(/[?#]/)[0])); }
    catch { brokenAssets.push(asset); }
  }
  const staticIndependent = !/cms-content-v2(?:-config)?\.js|\/api\/|\/admin\/|\/control\//i.test(html);
  const title = /<title>\s*([^<]+)\s*<\/title>/i.exec(html)?.[1]?.trim();
  const description = /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i.exec(html)?.[1]?.trim();
  const noindex = /<meta\s+name=["']robots["']\s+content=["'][^"']*noindex/i.test(html);
  rows.push({ ...page, family: cmsV2PageFamily(page.key), active, excludedReason: active ? null : redirectedRoutes.has(page.route) ? 'Permanent redirect' : 'Outside sitemap', sections: (html.match(/<section\b/gi) ?? []).length, images: (html.match(/<img\b/gi) ?? []).length, links: (html.match(/<a\b/gi) ?? []).length, special: /hero-globe|timeline|station-map|webgl|three\.min|gallery-grid/i.test(html), brokenAssets, staticIndependent, seoReady: Boolean(title && description && !noindex) });
}

await mkdir(resolve(root, 'docs/reports'), { recursive: true });
const header = '# CMS V2 full-site launch matrix\n\nGenerated from the CMS registry, sitemap, redirects, and static production HTML. This audit never writes public pages.\n\n| Page | Route | Family | Status | Sections | Media | Links | Protected | CMS | SEO | Static independence | Assets |\n|---|---|---|---|---:|---:|---:|---|---|---|---|---|\n';
const lines = rows.map((row) => `| ${row.label} | ${row.route} | ${row.family} | ${row.active ? 'Active' : `Excluded: ${row.excludedReason}`} | ${row.sections} | ${row.images} | ${row.links} | ${row.special ? 'Yes' : 'No'} | ${row.active ? 'Mapped' : '—'} | ${row.active ? row.seoReady ? 'PASS' : 'FAIL' : '—'} | ${row.staticIndependent ? 'PASS' : 'FAIL'} | ${row.active ? row.brokenAssets.length ? 'FAIL' : 'PASS' : '—'} |`).join('\n');
await writeFile(resolve(root, 'docs/reports/CMS_V2_LAUNCH_MATRIX.md'), header + lines + '\n');
await writeFile(resolve(root, 'docs/reports/cms-v2-launch-matrix.json'), JSON.stringify({ generatedAt: new Date().toISOString(), activeRoutes: activeRoutes.size, missingRoutes, pages: rows }, null, 2) + '\n');
const failures = rows.filter((row) => row.active && (!row.staticIndependent || !row.seoReady || row.brokenAssets.length));
for (const row of failures) console.log(`FAIL ${row.route}: static=${row.staticIndependent}; seo=${row.seoReady}; broken assets=${row.brokenAssets.join(', ') || 'none'}`);
for (const route of missingRoutes) console.log(`FAIL unregistered sitemap route: ${route}`);
console.log(`CMS registry maps ${rows.filter((row) => row.active).length}/${activeRoutes.size} active sitemap pages; ${rows.length - rows.filter((row) => row.active).length} excluded aliases.`);
if (failures.length || missingRoutes.length) process.exitCode = 1;
