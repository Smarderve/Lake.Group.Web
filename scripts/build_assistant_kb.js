#!/usr/bin/env node
/* Build the offline Assistant V2 index from current, publicly published sources. */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const parse5 = require('parse5');
const I18N_CONTENT = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'assets', 'i18n-content.json'), 'utf8'));

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'assets', 'assistant-kb.js');
const MIN_TEXT = 48;
const SKIP_TAGS = new Set(['script', 'style', 'template', 'noscript', 'svg', 'nav', 'footer', 'header', 'button', 'input', 'select', 'textarea', 'iframe', 'canvas']);
const BLOCK_TAGS = new Set(['p', 'li', 'blockquote', 'address', 'figcaption', 'dt', 'dd']);
const HEADING_TAG = /^h[1-6]$/;
const STOP_CONTENT = /\b(?:lorem ipsum|placeholder text|coming soon|under construction|currently preparing this section|sample text|demo content)\b/i;

function sha(value, length = 16) {
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, length);
}

function attrs(node) {
  return Object.fromEntries((node.attrs || []).map(({ name, value }) => [name.toLowerCase(), value]));
}

function isHiddenOrChrome(node) {
  if (!node.tagName) return false;
  const a = attrs(node);
  const classes = String(a.class || '').toLowerCase();
  const id = String(a.id || '').toLowerCase();
  return SKIP_TAGS.has(node.tagName) || Object.hasOwn(a, 'hidden') || a['aria-hidden'] === 'true' ||
    ['navigation', 'contentinfo'].includes(a.role) ||
    /(?:^|\s)(?:site-nav|site-header|mobile-nav|nav-mobile|mobile-menu|nav-menu|main-nav|site-footer|cookie-banner|chat-widget|chatbot|modal-overlay)(?:\s|$)/.test(classes) ||
    /(?:^|[-_])(?:site-header|site-nav|mobile-nav|mobile-menu|main-nav|site-footer|footer-nav)(?:$|[-_])/.test(id) ||
    /display\s*:\s*none|visibility\s*:\s*hidden/i.test(a.style || '');
}

function cleanNodeText(node) {
  if (!node) return '';
  if (node.nodeName === '#text') return node.value || '';
  if (isHiddenOrChrome(node)) return '';
  return (node.childNodes || []).map(cleanNodeText).join(' ');
}

function cleanText(value) {
  return String(value || '').replace(/\u00a0/g, ' ').replace(/[\u200b\u200e\u200f\ufeff]/g, '')
    .replace(/\s+/g, ' ').trim();
}

function findNode(root, predicate) {
  if (predicate(root)) return root;
  for (const child of root.childNodes || []) {
    const found = findNode(child, predicate);
    if (found) return found;
  }
  return null;
}

function findNodes(root, predicate, result = []) {
  if (predicate(root)) result.push(root);
  for (const child of root.childNodes || []) findNodes(child, predicate, result);
  return result;
}

function pageMetadata(route, html, tree) {
  const titleNode = findNode(tree, (node) => node.tagName === 'title');
  const title = cleanText(cleanNodeText(titleNode)) || path.basename(route, '.html');
  const meta = findNodes(tree, (node) => node.tagName === 'meta').map(attrs);
  const robots = meta.find((item) => item.name === 'robots')?.content || '';
  const description = cleanText(meta.find((item) => item.name === 'description')?.content || '');
  return { title, description, robots };
}

function contentBlocks(tree, metadata, route) {
  const root = findNode(tree, (node) => node.tagName === 'main') || findNode(tree, (node) => node.tagName === 'body') || tree;
  const blocks = [];
  let activeHeading = metadata.title;
  const seen = new Set();
  function add(text, heading, kind) {
    text = cleanText(text);
    if (text.length < MIN_TEXT || STOP_CONTENT.test(text)) return;
    const key = text.toLocaleLowerCase('en');
    if (seen.has(key)) return;
    seen.add(key);
    blocks.push({ text, heading: cleanText(heading || metadata.title), kind });
  }
  function walk(node) {
    if (!node || isHiddenOrChrome(node)) return;
    if (node.tagName && HEADING_TAG.test(node.tagName)) {
      const heading = cleanText(cleanNodeText(node));
      if (heading) {
        activeHeading = heading;
        add(heading, heading, 'heading');
      }
      return;
    }
    if (node.tagName && BLOCK_TAGS.has(node.tagName)) {
      add(cleanNodeText(node), activeHeading, node.tagName);
      return;
    }
    // A number of the current pages use copy inside div/span groups rather
    // than paragraphs. Capture direct inline text only, avoiding nested blocks.
    if (node.tagName && ['div', 'section', 'article'].includes(node.tagName)) {
      const inline = (node.childNodes || []).filter((child) => child.nodeName === '#text' ||
        (child.tagName && ['span', 'strong', 'em', 'b', 'small', 'a'].includes(child.tagName)))
        .map(cleanNodeText).join(' ');
      add(inline, activeHeading, 'copy');
    }
    for (const child of node.childNodes || []) walk(child);
  }
  walk(root);
  return blocks;
}

function classify(heading, text, route, type = '') {
  const value = `${heading} ${text} ${type}`.toLowerCase();
  if (/contact|telephone|phone|e-mail|email|headquarters|address/.test(value)) return 'contact';
  if (/career|vacanc|job application|recruit|workforce opportunities/.test(value) || route === 'careers.html') return 'careers';
  if (/sustainab|environment|community|csr|social responsibility/.test(value) || ['csr.html', 'sustainability.html'].includes(route)) return 'sustainability';
  if (/leadership|chairman|director|management|executive|founder/.test(value) || route.startsWith('leadership')) return 'leadership';
  if (/history|founded|founding|timeline|milestone|established/.test(value) || ['history.html', 'our-story.html'].includes(route)) return 'history';
  if (/station|dealer|retail network/.test(value) || route === 'station-locator.html') return 'stations';
  if (/location|located|based|headquarters|countries|markets|footprint|where we|airport|port|region|operate in/.test(value)) return 'locations';
  if (/product|manufactur|produce|range|portfolio|model|cylinder|steel bar|pipe|vehicle|equipment/.test(value)) return 'products';
  if (/service|services|provide|supply|offering|solution|capabilit|operation|logistics|transport|quarry|fleet/.test(value)) return 'services';
  return 'overview';
}

function normalizeRoute(value) {
  let route = String(value || '');
  try { if (/^https?:\/\//i.test(route)) route = new URL(route).pathname; } catch { return ''; }
  route = route.split(/[?#]/, 1)[0].replace(/^\/+/, '');
  return route === '' ? 'index.html' : route;
}

function publishedStaticPages(routes, companyRegistry, sitemapLastmod) {
  const pages = [];
  const docs = [];
  const companyRoutes = new Set(Object.keys(companyRegistry));
  for (const route of routes) {
    const file = path.resolve(ROOT, route);
    if (!file.startsWith(`${ROOT}${path.sep}`) || !fs.existsSync(file)) continue;
    const html = fs.readFileSync(file, 'utf8');
    const tree = parse5.parse(html);
    const meta = pageMetadata(route, html, tree);
    if (/noindex/i.test(meta.robots)) continue;
    const company = companyRegistry[route] || null;
    const blocks = contentBlocks(tree, meta, route);
    const h1 = findNodes(tree, (node) => node.tagName === 'h1').map((node) => cleanText(cleanNodeText(node))).filter(Boolean);
    const version = sha(html, 20);
    const page = { route, title: meta.title, description: meta.description, lastmod: sitemapLastmod[route] || null, contentVersion: version, blockCount: blocks.length, company: company?.name || null };
    pages.push(page);
    const aliases = company ? [...new Set([company.name, path.basename(route, '.html').replace(/-/g, ' '), ...h1])].filter(Boolean) : [];
    blocks.forEach((block, ordinal) => {
      const topic = classify(block.heading, block.text, route);
      const hash = sha(`${route}\n${block.heading}\n${block.text}`, 14);
      docs.push({
        id: `page:${path.basename(route, '.html')}:${hash}`,
        t: block.heading || meta.title,
        s: block.text,
        u: route,
        k: [meta.title, block.heading, company?.name || '', topic].filter(Boolean).join(' '),
        f: 0,
        entityType: company ? 'company' : route === 'index.html' || route === 'about.html' ? 'group' : topic === 'careers' ? 'career' : topic === 'contact' ? 'contact' : topic === 'locations' || topic === 'stations' ? 'location' : topic,
        entity: company?.name || 'Lake Group',
        category: topic,
        title: block.heading || meta.title,
        text: block.text,
        keywords: [meta.title, block.heading, topic, company?.sector || ''].filter(Boolean).join(' '),
        aliases,
        page: route,
        source: 'published-static-html',
        priority: 100,
        verification: 'PUBLISHED',
        updatedAt: page.lastmod,
        contentVersion: version,
        ordinal,
      });
    });
    if (route === 'index.html' && meta.description && !STOP_CONTENT.test(meta.description)) {
      const text = cleanText(meta.description);
      docs.push({
        id: `page:index:description:${sha(text, 14)}`, t: meta.title, s: text, u: route,
        k: `${meta.title} Lake Group corporate overview`, f: 0, entityType: 'group', entity: 'Lake Group',
        category: 'overview', title: meta.title, text, keywords: `${meta.title} Lake Group corporate overview`,
        aliases: ['Lake Group', 'Lake Oil Group'], page: route, source: 'published-static-html', priority: 100,
        verification: 'PUBLISHED', updatedAt: page.lastmod, contentVersion: version, ordinal: -1,
      });
    }
  }
  return { pages, docs };
}

function metricClaims(text) {
  const source = cleanText(text).toLowerCase();
  const claims = [];
  const patterns = [
    ['stations', /(?:\b(\d[\d,]*)\s*(\+)??\s*(?:fuel\s+)?stations?\b|\bstations?\s*[:\-]\s*(\d[\d,]*)\s*(\+)?)/g],
    ['trucks', /(?:\b(\d[\d,]*)\s*(\+)??\s*(?:purpose[- ]built\s+|heavy[- ]duty\s+|fleet\s+)?(?:trucks?|vehicles?)\b|\bfleet\D{0,24}(\d[\d,]*)\s*(\+)?)/g],
    ['countries', /(?:\b(\d[\d,]*)\s*(\+)??\s+countries\b|\bcountries\D{0,20}(\d[\d,]*)\s*(\+)?)/g],
    ['employees', /(?:\b(\d[\d,]*)\s*(\+)??\s+(?:employees|people|staff|workforce|professionals|colleagues)\b|\b(?:employees|people|staff|workforce|professionals|colleagues)\D{0,20}(\d[\d,]*)\s*(\+)?)/g],
    ['nationalities', /(?:\b(\d[\d,]*)\s*(\+)??\s+nationalities\b|\bnationalities\D{0,20}(\d[\d,]*)\s*(\+)?)/g],
    ['storage', /\b(\d[\d,.]*)\s*(million\s+)?(litres?|liters?|mt|teu|tonnes?|tons?|m³|m3)\b/g],
  ];
  for (const [kind, regex] of patterns) {
    let match;
    while ((match = regex.exec(source))) {
      const number = match[1] || match[3];
      if (!number) continue;
      const plus = match[2] === '+' || match[4] === '+';
      claims.push({ kind, value: Number(number.replace(/,/g, '')), raw: `${number}${plus ? '+' : ''}`, unit: kind === 'storage' ? `${match[2] || ''}${match[3]}`.trim() : kind });
    }
  }
  return claims;
}

function readPublicSnapshot(routes) {
  const base = path.join(ROOT, 'public-content');
  const pointerFile = path.join(base, 'current.json');
  if (!fs.existsSync(pointerFile)) return null;
  try {
    const pointer = JSON.parse(fs.readFileSync(pointerFile, 'utf8'));
    const relative = String(pointer.snapshotUrl || '');
    if (pointer.schemaVersion !== 1 || !relative || relative.includes('..') || path.isAbsolute(relative)) return null;
    const file = path.resolve(base, relative);
    if (!file.startsWith(`${base}${path.sep}`) || !fs.existsSync(file)) return null;
    const snapshot = JSON.parse(fs.readFileSync(file, 'utf8'));
    const payload = { schemaVersion: snapshot.schemaVersion, entities: snapshot.entities, map: snapshot.map, knowledge: snapshot.knowledge };
    const { validatePayload } = require(path.join(ROOT, 'scripts', 'public-snapshot.js'));
    validatePayload(payload);
    const integrity = `sha256-${crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex')}`;
    if (pointer.releaseId !== snapshot.releaseId || pointer.integrity !== snapshot.integrity || integrity !== pointer.integrity) {
      console.warn(`Ignored public-content snapshot ${pointer.releaseId}: pointer/payload integrity mismatch; current static pages remain authoritative.`);
      return null;
    }
    return { pointer, snapshot, eligibleRoutes: new Set(routes), source: `public-content/releases/${pointer.releaseId}/content.json` };
  } catch (error) {
    console.warn(`Ignored invalid public-content snapshot: ${error.message}`);
    return null;
  }
}

function currentStaticClaims(docs, cmsTimestamp) {
  const claims = [];
  for (const doc of docs) {
    if (doc.source !== 'published-static-html') continue;
    const date = doc.updatedAt ? Date.parse(doc.updatedAt) : 0;
    if (date && cmsTimestamp && date < cmsTimestamp) continue;
    for (const claim of metricClaims(doc.text)) claims.push({ ...claim, page: doc.page, entity: doc.entity });
  }
  return claims;
}

function publicSnapshotDocs(source, staticDocs, routes) {
  if (!source) return { docs: [], conflicts: [] };
  const snapshot = source.snapshot;
  const timestamp = Date.parse(snapshot.generatedAt || '') || 0;
  const claims = currentStaticClaims(staticDocs, timestamp);
  const docs = [];
  const conflicts = [];
  const records = snapshot.knowledge?.facts || [];
  for (const fact of records) {
    const route = normalizeRoute(fact.url || '');
    if (!routes.includes(route) || fact.verification !== 'VERIFIED' || !cleanText(fact.text)) continue;
    const factClaims = metricClaims(fact.text);
    const mismatch = factClaims.map((claim) => ({ claim, matches: claims.filter((current) => current.kind === claim.kind) }))
      .find(({ claim, matches }) => matches.some((current) => current.value !== claim.value));
    if (mismatch) {
      conflicts.push({ metric: mismatch.claim.kind, olderValue: mismatch.claim.raw, olderSource: source.source, currentValues: [...new Set(mismatch.matches.map((item) => item.raw))], currentPages: [...new Set(mismatch.matches.map((item) => item.page))], resolution: 'Excluded the older snapshot claim; current indexable page copy is retained.' });
      continue;
    }
    const text = cleanText(fact.text);
    const pageCompany = (source.companyRegistry || {})[route];
    const hash = sha(`${fact.id || fact.type}\n${route}\n${text}`, 14);
    docs.push({
      id: `snapshot:${hash}`, t: cleanText(fact.title || fact.type || 'Lake Group information'), s: text, u: route, f: 1,
      entityType: pageCompany ? 'company' : route === 'index.html' || route === 'about.html' ? 'group' : classify(fact.title, text, route),
      entity: pageCompany?.name || 'Lake Group', category: classify(fact.title, text, route, fact.type), title: cleanText(fact.title || fact.type || 'Lake Group information'),
      text, keywords: `${fact.type || ''} ${fact.title || ''} ${text}`, aliases: pageCompany ? [pageCompany.name, path.basename(route, '.html').replace(/-/g, ' ')] : ['Lake Group'],
      page: route, source: 'published-public-snapshot', priority: 55, verification: 'VERIFIED', updatedAt: snapshot.generatedAt || null, contentVersion: source.pointer.releaseId,
    });
  }
  return { docs, conflicts };
}

function publicSnapshotCompanies(source, companyRegistry) {
  if (!source) return {};
  const aliases = {};
  for (const item of source.snapshot.entities?.companies || []) {
    const route = normalizeRoute(item.website || item.route || `${item.slug || ''}.html`);
    if (!companyRegistry[route]) continue;
    aliases[route] = [item.name, item.shortName, item.slug].filter(Boolean).map((x) => String(x).replace(/-/g, ' '));
  }
  return aliases;
}

function cmsV2Snapshot(routes, companyRegistry) {
  const base = path.join(ROOT, 'public-content', 'cms-v2');
  const pointerFile = path.join(base, 'current.json');
  if (!fs.existsSync(pointerFile)) return { docs: [], releaseId: null };
  try {
    const pointer = JSON.parse(fs.readFileSync(pointerFile, 'utf8'));
    const relative = String(pointer.snapshotUrl || '');
    if (relative.includes('..') || path.isAbsolute(relative)) return { docs: [], releaseId: null };
    const file = path.resolve(base, relative);
    if (!file.startsWith(`${base}${path.sep}`) || !fs.existsSync(file)) return { docs: [], releaseId: null };
    const snapshot = JSON.parse(fs.readFileSync(file, 'utf8'));
    require(path.join(ROOT, 'scripts', 'cms-v2-deployment-snapshot.js')).verifyBundle({ pointer, snapshot });
    const routesByKey = new Map(routes.map((route) => [path.basename(route, '.html'), route]));
    routesByKey.set('home', 'index.html');
    const docs = [];
    const add = (id, title, text, route, category) => {
      route = normalizeRoute(route);
      text = cleanText(text);
      if (!routes.includes(route) || text.length < MIN_TEXT || STOP_CONTENT.test(text)) return;
      const company = companyRegistry[route];
      docs.push({ id: `cms-v2:${sha(`${id}\n${text}`, 14)}`, t: title, s: text, u: route, f: 1,
        entityType: company ? 'company' : 'group', entity: company?.name || 'Lake Group', category: category || classify(title, text, route),
        title, text, keywords: `${title} ${text}`, aliases: company ? [company.name, path.basename(route, '.html').replace(/-/g, ' ')] : ['Lake Group'],
        page: route, source: 'approved-cms-v2-release', priority: 110, verification: 'PUBLISHED', contentVersion: pointer.releaseId });
    };
    for (const [key, data] of Object.entries(snapshot.documents || {})) {
      const route = routesByKey.get(key);
      if (route && data && typeof data === 'object') {
        add(`${key}:hero`, data.hero?.heading || key, data.hero?.description || '', route, 'overview');
        add(`${key}:intro`, data.introduction?.heading || key, data.introduction?.body || '', route, 'overview');
        for (const section of data.sections || []) add(`${key}:${section.key}`, section.heading, section.body, route);
      } else if (key === 'global' && data.organization) {
        const org = data.organization;
        add('global:organization', org.name || 'Lake Group', [org.description, org.headquarters, org.email, org.phone].filter(Boolean).join(' '), 'about.html', 'overview');
        for (const statistic of data.statistics || []) add(`global:stat:${statistic.label}`, statistic.label, `${statistic.label}: ${statistic.value} (${statistic.scope})`, 'about.html', classify(statistic.label, statistic.value, 'about.html'));
      } else if (key === 'business-verticals') {
        for (const vertical of data.verticals || []) add(`vertical:${vertical.name}`, vertical.name, `${vertical.description} Companies: ${(vertical.companies || []).join(', ')}.`, 'index.html', 'overview');
      }
    }
    return { docs, releaseId: pointer.releaseId };
  } catch (error) {
    console.warn(`Ignored unavailable or invalid CMS V2 snapshot: ${error.message}`);
    return { docs: [], releaseId: null };
  }
}

function buildEntities(companyRegistry, staticPages, snapshotCompanyAliases) {
  return Object.entries(companyRegistry).map(([route, company]) => {
    const page = staticPages.find((item) => item.route === route);
    const aliases = [...new Set([
      company.name,
      path.basename(route, '.html').replace(/-/g, ' '),
      ...(page?.title ? [page.title] : []),
      ...((snapshotCompanyAliases || {})[route] || []),
    ].map(cleanText).filter(Boolean))];
    return { name: company.name, route, sector: company.sector, aliases };
  });
}

function removeDuplicateRecords(records) {
  const seen = new Set();
  return records.filter((doc) => {
    const key = `${doc.page}|${String(doc.entity).toLowerCase()}|${cleanText(doc.text).toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// The current static English page inventory remains authoritative for coverage.
// This mapping only retains translations that the existing locale dictionary
// actually supplies; it never decides which pages are public or searchable.
const I18N_PAGE_PREFIXES = {
  index: 'index.html', hero: 'index.html', stat: 'index.html', about: 'about.html',
  ose: 'our-story.html', history: 'history.html', leadership: 'leadership.html',
  fuel: 'lake-oil.html', lpg: 'lake-gas.html', aviation: 'lake-aviation.html',
  lubricants: 'lake-lubes.html', steel: 'lake-steel.html', concrete: 'lake-premix-cement.html',
  pipes: 'lake-pipes.html', logistics: 'lake-trans.html', container_services: 'aficd.html',
  station_locator: 'station-locator.html', fleet: 'fleet.html', careers: 'careers.html',
  csr: 'csr.html', sustainability: 'sustainability.html', gallery: 'gallery.html', contact: 'contact.html',
};

function localizedRecords(lang, routes, companyRegistry, staticDocs) {
  const locale = I18N_CONTENT[lang];
  if (!locale) return { docs: [], conflicts: [] };
  const currentClaims = new Map();
  for (const doc of staticDocs) {
    if (!currentClaims.has(doc.page)) currentClaims.set(doc.page, []);
    currentClaims.get(doc.page).push(...metricClaims(doc.text));
  }
  const docs = [];
  const conflicts = [];
  const seen = new Set();
  for (const [key, raw] of Object.entries(locale)) {
    const prefix = key.split('.')[0];
    const route = I18N_PAGE_PREFIXES[prefix];
    if (!route || !routes.includes(route) || /\.alt(?:\.|$)|\balt\d*$/i.test(key) || typeof raw !== 'string') continue;
    const fragment = parse5.parseFragment(raw);
    const text = cleanText(cleanNodeText(fragment));
    if (text.length < MIN_TEXT || STOP_CONTENT.test(text)) continue;
    const signature = `${route}|${text.toLocaleLowerCase(lang)}`;
    if (seen.has(signature)) continue;
    seen.add(signature);
    const claims = metricClaims(text);
    const groupMetrics = new Set(['employees', 'nationalities', 'stations', 'countries']);
    const currentForRoute = currentClaims.get(route) || [];
    const groupCurrent = [...currentClaims.entries()].filter(([currentRoute]) => ['index.html', 'about.html', 'our-story.html', 'station-locator.html'].includes(currentRoute)).flatMap(([, values]) => values);
    const clash = claims.find((claim) => currentForRoute.concat(groupMetrics.has(claim.kind) ? groupCurrent : []).some((current) => current.kind === claim.kind && current.value !== claim.value));
    if (clash) {
      conflicts.push({ metric: clash.kind, locale: lang, page: route, olderValue: clash.raw, resolution: 'Excluded translated numeric claim that differs from the current English page.' });
      continue;
    }
    const company = companyRegistry[route];
    const heading = key.split('.').slice(1).join(' ') || path.basename(route, '.html');
    const category = classify(heading, text, route);
    docs.push({
      id: `i18n:${lang}:${path.basename(route, '.html')}:${sha(`${key}\n${text}`, 12)}`,
      t: heading, s: text, u: route, f: 0, entityType: company ? 'company' : route === 'index.html' || route === 'about.html' ? 'group' : category,
      entity: company?.name || 'Lake Group', category, title: heading, text, keywords: `${heading} ${company?.name || ''} ${category}`,
      aliases: company ? [company.name, path.basename(route, '.html').replace(/-/g, ' ')] : ['Lake Group'], page: route,
      source: 'published-i18n-content', priority: 65, verification: 'PUBLISHED_LOCALE_COPY', locale: lang,
      updatedAt: null, contentVersion: sha(`${route}\n${lang}\n${text}`, 16),
    });
  }
  return { docs, conflicts };
}

async function main() {
  const seo = await import(require('node:url').pathToFileURL(path.join(ROOT, 'scripts', 'seo-config.mjs')).href);
  const routes = [...new Set(seo.INDEXABLE_ROUTES)].filter((route) => route.endsWith('.html')).sort();
  const sitemapLastmod = {};
  const sitemapFile = path.join(ROOT, 'sitemap.xml');
  if (fs.existsSync(sitemapFile)) {
    const xml = fs.readFileSync(sitemapFile, 'utf8');
    for (const match of xml.matchAll(/<url>\s*<loc>[^<]*\/([^/<]*)<\/loc>\s*(?:<lastmod>([^<]*)<\/lastmod>)?/g)) {
      sitemapLastmod[normalizeRoute(match[1])] = match[2] || null;
    }
  }
  const companyRegistry = seo.COMPANY_ENTITIES;
  const statics = publishedStaticPages(routes, companyRegistry, sitemapLastmod);
  const groupMetrics = new Set(['employees', 'nationalities', 'stations', 'countries']);
  const groupClaims = currentStaticClaims(statics.docs, 0).filter((claim) => ['index.html', 'about.html', 'our-story.html', 'station-locator.html'].includes(claim.page));
  const staticConflicts = [];
  for (const page of statics.pages) {
    const descriptionClaims = metricClaims(page.description || '');
    for (const claim of descriptionClaims) {
      if (!groupMetrics.has(claim.kind)) continue;
      const matches = groupClaims.filter((current) => current.kind === claim.kind && current.value !== claim.value);
      if (matches.length) staticConflicts.push({ metric: claim.kind, olderValue: claim.raw, olderSource: `${page.route} meta description`, currentValues: [...new Set(matches.map((item) => item.raw))], currentPages: [...new Set(matches.map((item) => item.page))], resolution: 'Metadata was excluded from searchable records; current group-page body copy is retained pending content-owner review.' });
    }
  }
  const cms1 = readPublicSnapshot(routes);
  if (cms1) cms1.companyRegistry = companyRegistry;
  const cms2 = cmsV2Snapshot(routes, companyRegistry);
  const snapshot = publicSnapshotDocs(cms1, statics.docs, routes);
  const companyAliases = publicSnapshotCompanies(cms1, companyRegistry);
  const entities = buildEntities(companyRegistry, statics.pages, companyAliases);
  const companyNames = entities.map((entity) => entity.name);
  const directory = {
    id: 'directory:companies', t: 'Lake Group companies', s: `The current public company pages cover ${companyNames.join(', ')}.`, u: 'index.html', f: 1,
    entityType: 'group', entity: 'Lake Group', category: 'overview', title: 'Lake Group companies', text: `The current public company pages cover ${companyNames.join(', ')}.`,
    keywords: 'Lake Group companies business verticals subsidiaries group company list', aliases: ['Lake Group'], page: 'index.html', source: 'current-public-page-inventory', priority: 90, verification: 'PUBLISHED',
  };
  const docs = removeDuplicateRecords([...cms2.docs, ...statics.docs, ...snapshot.docs, directory]);
  const pagesWithContent = new Set(statics.docs.map((doc) => doc.page));
  const langs = { en: { docs } };
  const localizationConflicts = [];
  for (const locale of Object.keys(I18N_CONTENT)) {
    if (locale === 'en') continue;
    const localized = localizedRecords(locale, routes, companyRegistry, statics.docs);
    localizationConflicts.push(...localized.conflicts);
    const localizedPages = new Set(localized.docs.map((doc) => doc.page));
    langs[locale] = { docs: removeDuplicateRecords([...localized.docs, ...statics.docs.filter((doc) => !localizedPages.has(doc.page))]) };
  }
  const kb = {
    version: 2,
    source: 'current-indexable-site-pages-and-verified-public-snapshots',
    pages: statics.pages,
    entities,
    audit: {
      pageCount: routes.length,
      pagesWithAnswerableContent: pagesWithContent.size,
      companyCount: entities.length,
      publicSnapshot: cms1 ? { releaseId: cms1.pointer.releaseId, generatedAt: cms1.snapshot.generatedAt } : null,
      cmsV2ReleaseId: cms2.releaseId,
      conflicts: [...snapshot.conflicts, ...localizationConflicts, ...staticConflicts],
    },
    langs,
  };
  const payload = `/* Generated by scripts/build_assistant_kb.js. Do not edit by hand. */\nwindow.__LAKE_ASSISTANT_KB__ = ${JSON.stringify(kb)};\n`;
  fs.writeFileSync(OUT, payload, 'utf8');
  console.log(`Published route inventory: ${routes.length} pages; ${pagesWithContent.size} contain answerable content; ${entities.length} company pages.`);
  console.log(`Knowledge records: ${docs.length} (${statics.docs.length} current HTML, ${snapshot.docs.length} eligible public-snapshot, ${cms2.docs.length} CMS V2).`);
  console.log(`Public snapshot: ${cms1 ? `${cms1.pointer.releaseId} (${cms1.snapshot.generatedAt})` : 'not present/valid'}; CMS V2: ${cms2.releaseId || 'no local published release'}.`);
  for (const conflict of [...snapshot.conflicts, ...staticConflicts]) console.warn(`Audited ${conflict.metric} figure ${conflict.olderValue}; current published pages show ${conflict.currentValues.join(', ')} (${conflict.currentPages.join(', ')}).`);
  console.log(`wrote assets/assistant-kb.js (${(Buffer.byteLength(payload) / 1024).toFixed(1)} KB)`);
}

main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
