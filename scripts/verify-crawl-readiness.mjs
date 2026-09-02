#!/usr/bin/env node
/** Static crawl-readiness audit for the English public website. */
import fs from 'node:fs';
import path from 'node:path';
import { INDEXABLE_ROUTES, NON_INDEXABLE_ROUTES, SITE, routePath } from './seo-config.mjs';

const root = path.resolve(import.meta.dirname, '..');
const errors = [];
const warnings = [];
const routeForPath = new Map(INDEXABLE_ROUTES.map((file) => [routePath(file), file]));
routeForPath.set('/index.html', 'index.html');
const redirects = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8')).redirects || [];
const redirectMap = new Map(redirects.map((redirect) => [redirect.source, redirect.destination]));
const incoming = new Map(INDEXABLE_ROUTES.map((file) => [file, new Set()]));

function resolveRedirect(source) {
  const seen = new Set([source]);
  let target = redirectMap.get(source);
  while (target && redirectMap.has(target)) {
    if (seen.has(target)) return { loop: true, target };
    seen.add(target);
    target = redirectMap.get(target);
  }
  return { loop: false, target };
}

for (const source of redirectMap.keys()) {
  const result = resolveRedirect(source);
  if (result.loop) errors.push(`redirect loop: ${source}`);
  if (redirectMap.has(redirectMap.get(source))) errors.push(`redirect chain: ${source}`);
}

for (const file of INDEXABLE_ROUTES) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  const markup = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  const anchors = [...markup.matchAll(/<a\b[^>]*\bhref=(['"])(.*?)\1/gi)].map((match) => match[2]);
  for (const href of anchors) {
    if (!href || /^(?:#|mailto:|tel:|javascript:|data:)/i.test(href)) continue;
    const url = new URL(href, `${SITE.origin}${routePath(file)}`);
    if (url.origin !== SITE.origin) continue;
    const targetPath = url.pathname === '/' ? '/' : url.pathname;
    const targetFile = routeForPath.get(targetPath);
    if (targetFile) {
      incoming.get(targetFile).add(file);
      if (url.hash) {
        const targetHtml = fs.readFileSync(path.join(root, targetFile), 'utf8');
        const fragment = decodeURIComponent(url.hash.slice(1)).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (!new RegExp(`(?:id|name)=["']${fragment}["']`, 'i').test(targetHtml)) warnings.push(`unverified fragment: ${file} -> ${href}`);
      }
      continue;
    }
    if (redirectMap.has(targetPath)) continue;
    if (!path.posix.extname(targetPath) || targetPath.endsWith('.html')) errors.push(`broken internal page link: ${file} -> ${href}`);
  }
}

for (const file of INDEXABLE_ROUTES.filter((file) => file !== 'index.html')) {
  if (!incoming.get(file).size) errors.push(`orphan indexable page: ${file}`);
}

const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
for (const file of INDEXABLE_ROUTES) {
  const expected = `${SITE.origin}${routePath(file)}`;
  if (!locations.includes(expected)) errors.push(`sitemap missing canonical route: ${expected}`);
}
for (const location of locations) {
  if (!location.startsWith(SITE.origin) || /\/(?:en|sw|fr|ar|pt)(?:\/|$)/i.test(location)) errors.push(`invalid sitemap location: ${location}`);
  const route = location.slice(SITE.origin.length) || '/';
  if (!routeForPath.has(route)) errors.push(`sitemap includes non-indexable route: ${location}`);
}

for (const file of NON_INDEXABLE_ROUTES) {
  if (locations.includes(`${SITE.origin}${routePath(file)}`)) errors.push(`sitemap includes noindex route: ${file}`);
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`Crawl readiness passed: ${INDEXABLE_ROUTES.length} indexable URLs, ${redirectMap.size} redirects, ${[...incoming.values()].filter((sources) => sources.size).length - 1} internally linked non-home routes.`);
if (warnings.length) console.warn(`Crawl readiness warnings (${warnings.length}):\n${warnings.slice(0, 20).join('\n')}`);
