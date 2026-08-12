#!/usr/bin/env node
/**
 * Phase 8 — Public Website Migration: content seed.
 *
 * Onboards the *existing* live-site truth as PUBLISHED (same convention as
 * seed-metrics.js — the workflow governs future *changes*, not today's
 * onboarding). Sources:
 *
 *   - backend/scripts/content-seed-data.js  — companies, countries, regions,
 *     locations, facilities, projects, leadership, contacts, history, CSR,
 *     careers, map categories (mirrors the live pages + verified dataset)
 *   - assets/news-data.js                    — 41 news articles (canonical bundle)
 *   - assets/gallery.html                    — 44 gallery tiles (canonical markup)
 *
 * News and gallery media are ingested from the frontend bundles directly so
 * the backend copy can never drift from the site's current source of truth.
 *
 * Usage:
 *   npm run seed:content              # create if missing, never overwrite
 *   npm run seed:content -- --force   # overwrite existing records
 *
 * Notes:
 *   - Facility coordinates are approximate anchors from the live pages/map;
 *     Task 8.10 re-verifies geocoding before relying on them.
 *   - News `description` paragraphs and `images`/`video` fields have no
 *     backend columns (body + heroMedia only) — the frontend news-api.js
 *     maps the API shape back to the renderer's expected shape.
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createDb } from '../src/db.js';
import { writeAudit } from '../src/lib/audit.js';
import { CONTENT_SEED } from './content-seed-data.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_ROOT = path.resolve(__dirname, '..', '..');
const NEWS_BUNDLE = path.join(FRONTEND_ROOT, 'assets', 'news-data.js');
const GALLERY_HTML = path.join(FRONTEND_ROOT, 'gallery.html'); // page lives at site root

const PUBLISHED = 'PUBLISHED';

/* ------------------------------------------------------------------ */
/* Frontend bundle ingestion                                            */
/* ------------------------------------------------------------------ */

/** Evaluate assets/news-data.js (window.LAKE_NEWS = [...]) → array. */
export function loadNewsBundle(file = NEWS_BUNDLE) {
  const src = fs.readFileSync(file, 'utf8');
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: 'news-data.js' });
  const list = sandbox.window.LAKE_NEWS;
  if (!Array.isArray(list)) throw new Error('news-data.js did not expose window.LAKE_NEWS array');
  return list;
}

/** Parse assets/gallery.html tiles → [{ url, caption, category }]. */
export function loadGalleryTiles(file = GALLERY_HTML) {
  const html = fs.readFileSync(file, 'utf8');
  const tiles = [];
  const re = /<article\s+class="gallery-tile"([\s\S]*?)<\/article>/g;
  let m;
  while ((m = re.exec(html))) {
    const attrs = m[1];
    const src = attrs.match(/data-src="([^"]+)"/);
    const caption = attrs.match(/data-caption="([^"]+)"/);
    const cat = attrs.match(/data-cat="([^"]+)"/);
    if (!src) continue;
    tiles.push({
      url: src[1],
      caption: caption ? decodeHtml(caption[1]) : null,
      category: cat ? cat[1] : null,
    });
  }
  return tiles;
}

function decodeHtml(s) {
  return s.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
}

function slugify(text, id) {
  const base = String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);
  return `${base || 'item'}-${id}`;
}

/**
 * Bundle dates → Date. Accepts "15 Feb, 2026", "Apr, 2014" and bare "2014".
 * Falls back to Jan 1 of the year when only a year is present.
 */
export function parseBundleDate(str) {
  if (!str) return null;
  const s = String(str).trim();
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

  const full = s.match(/(\d{1,2})\s+(\w+)[,\s]*(\d{4})/);
  if (full) {
    const mi = months.indexOf(full[2].slice(0, 3).toLowerCase());
    if (mi !== -1) return new Date(Date.UTC(Number(full[3]), mi, Number(full[1])));
  }

  const monthYear = s.match(/(\w+)[,\s]*(\d{4})/);
  if (monthYear) {
    const mi = months.indexOf(monthYear[1].slice(0, 3).toLowerCase());
    if (mi !== -1) return new Date(Date.UTC(Number(monthYear[2]), mi, 1));
  }

  const year = s.match(/(\d{4})/);
  if (year) return new Date(Date.UTC(Number(year[1]), 0, 1));
  return null;
}

/* ------------------------------------------------------------------ */
/* Seed helper                                                          */
/* ------------------------------------------------------------------ */

/**
 * Idempotent governed-record seed.
 *
 * - keyField set → the model has a unique column (upsert path).
 * - keyField null → no unique column (findFirst + create; force deletes).
 *
 * Writes one version row + one audit entry per seeded record, matching the
 * metrics-seed convention. `refs[key]` is set to the created row id so
 * later entities can reference it.
 */
async function seedEntity(db, opts) {
  const { model, versionModel, key, seed, refs, force, keyField, findWhere, versionFkField } = opts;
  let existing = null;
  if (keyField) {
    existing = await db[model].findUnique({ where: { [keyField]: key } });
  } else {
    existing = await db[model].findFirst({ where: findWhere });
  }
  if (existing && !force) {
    console.log(`[skip] ${model}.${key} (exists)`);
    refs[key] = existing.id;
    return existing;
  }

  const data = { ...seed, status: PUBLISHED };
  let row;
  if (existing) {
    await db[model].delete({ where: { id: existing.id } });
  }
  row = await db[model].create({ data });

  await db[versionModel].create({
    data: {
      // CSREntry's camelCase name breaks the `${model}Id` convention — the
      // version table calls the FK csrEntryId.
      [versionFkField || `${model}Id`]: row.id,
      data: row,
      status: PUBLISHED,
      changedBy: null,
      reason: 'Initial seed of the live-site content (Phase 8 migration)',
    },
  });
  await writeAudit(db, {
    actorId: null,
    action: `${model.toUpperCase()}_PUBLISHED`,
    resource: 'seed/content',
    ip: null,
    metadata: { key, id: row.id, fromStatus: null, toStatus: PUBLISHED, reason: 'Initial seed (system)' },
  });
  console.log(`[seed] ${model}.${key}`);
  refs[key] = row.id;
  return row;
}

/* ------------------------------------------------------------------ */
/* Main                                                                 */
/* ------------------------------------------------------------------ */

/**
 * Reverse-dependency cleanup for --force: governed rows reference each other
 * with RESTRICT/SET-NULL FKs, so a forced reseed must clear children before
 * parents (a plain per-row delete fails on a populated database).
 */
async function cleanupForReseed(db) {
  const order = [
    'mediaUsage', 'pageContentBlock', 'historyEventCompany',
    'milestone', 'leadershipEvent', 'companyRelationship', 'productService',
    'media', 'facility', 'location',
    'news', 'project', 'leadership', 'contact', 'historyEvent', 'careerListing', 'cSREntry',
    'company', 'region', 'category', 'mapCategory', 'country',
  ];
  for (const model of order) {
    try {
      await db[model].deleteMany({});
    } catch (e) {
      console.warn(`[force] could not clear ${model}: ${e.message.slice(0, 120)}`);
    }
  }
  // Version tables reference their parents; clear them after parents are gone.
  const versionModels = [
    'metricVersion', 'countryVersion', 'regionVersion', 'locationVersion', 'facilityVersion',
    'categoryVersion', 'companyVersion', 'productServiceVersion', 'companyRelationshipVersion',
    'mediaVersion', 'contentBlockVersion', 'pageVersion', 'newsVersion', 'projectVersion',
    'leadershipVersion', 'contactVersion', 'historyEventVersion', 'careerListingVersion',
    'cSREntryVersion', 'mapCategoryVersion',
  ];
  for (const model of versionModels) {
    try {
      await db[model].deleteMany({});
    } catch { /* already empty */ }
  }
  console.log('[force] cleared governed content');
}

export async function seedContent(db, { force = false } = {}) {
  if (force) await cleanupForReseed(db);
  const refs = {};

  /* --- Map categories + content categories --- */
  for (const c of CONTENT_SEED.mapCategories) {
    const row = await seedEntity(db, { model: 'mapCategory', versionModel: 'mapCategoryVersion', key: c.slug, keyField: 'slug', seed: c, refs, force });
    refs[`mapCategory:${c.slug}`] = row.id;
  }
  for (const c of CONTENT_SEED.categories) {
    const row = await seedEntity(db, { model: 'category', versionModel: 'categoryVersion', key: c.name, keyField: 'name', seed: { name: c.name, description: c.description }, refs, force });
    refs[`category:${c.slug}`] = row.id;
  }

  /* --- Countries → regions --- */
  for (const c of CONTENT_SEED.countries) {
    const row = await seedEntity(db, { model: 'country', versionModel: 'countryVersion', key: c.isoCode, keyField: 'isoCode', seed: { name: c.name, isoCode: c.isoCode, regionGrouping: c.regionGrouping }, refs, force });
    refs[`country:${c.isoCode}`] = row.id;
  }
  for (const r of CONTENT_SEED.regions) {
    await seedEntity(db, {
      model: 'region', versionModel: 'regionVersion', key: `region:${r.key}`, force,
      findWhere: { name: r.name, countryId: refs[`country:${r.countryIso}`] },
      seed: { name: r.name, countryId: refs[`country:${r.countryIso}`] },
      refs,
    });
  }

  /* --- Companies (need category + HQ country) --- */
  for (const co of CONTENT_SEED.companies) {
    await seedEntity(db, {
      model: 'company', versionModel: 'companyVersion', key: co.slug, keyField: 'slug', force,
      seed: {
        slug: co.slug,
        name: co.name, description: co.description, logo: co.logo, website: co.website,
        categoryId: refs[`category:${co.categorySlug}`],
        headquartersCountryId: refs['country:TZ'],
        foundedDate: co.foundedYear ? new Date(`${co.foundedYear}-01-01T00:00:00.000Z`) : null,
      },
      refs,
    });
    refs[`company:${co.slug}`] = refs[co.slug];
  }

  /* --- Locations (need region) → facilities (need location + company + map category) --- */
  for (const l of CONTENT_SEED.locations) {
    await seedEntity(db, {
      model: 'location', versionModel: 'locationVersion', key: `location:${l.key}`, force,
      findWhere: { name: l.name },
      seed: {
        name: l.name, regionId: refs[`region:${l.regionKey}`],
        latitude: l.latitude, longitude: l.longitude, type: l.type,
      },
      refs,
    });
  }
  for (const f of CONTENT_SEED.facilities) {
    await seedEntity(db, {
      model: 'facility', versionModel: 'facilityVersion', key: `facility:${f.key}`, force,
      findWhere: { name: f.name },
      seed: {
        name: f.name,
        locationId: refs[`location:${f.locationKey}`],
        // Facility.companyId is required in the schema — operations-map
        // assets without an explicit company belong to the flagship (Lake Oil).
        companyId: refs[`company:${f.companySlug || 'lake-oil'}`],
        category: f.category,
        coordinates: f.coordinates,
        operationalStatus: f.operationalStatus,
        mapCategoryId: refs[`mapCategory:${f.mapCategorySlug}`],
        mapVisible: true,
        markerLabel: f.markerLabel,
      },
      refs,
    });
  }

  /* --- Projects (need company + location) --- */
  for (const p of CONTENT_SEED.projects) {
    await seedEntity(db, {
      model: 'project', versionModel: 'projectVersion', key: `project:${slugify(p.title, p.companySlug)}`, force,
      findWhere: { title: p.title },
      seed: {
        title: p.title, sector: p.sector, description: p.description,
        companyId: p.companySlug ? refs[`company:${p.companySlug}`] : null,
        locationId: refs[`location:${p.locationKey}`] ?? null,
      },
      refs,
    });
  }

  /* --- Leadership (needs company) --- */
  for (const ld of CONTENT_SEED.leadership) {
    await seedEntity(db, {
      model: 'leadership', versionModel: 'leadershipVersion', key: `leadership:${slugify(ld.name, ld.order)}`, force,
      findWhere: { name: ld.name },
      seed: {
        name: ld.name, position: ld.position, bio: ld.bio, photo: ld.photo, order: ld.order,
        companyId: ld.companySlug ? refs[`company:${ld.companySlug}`] : null,
        currentStatus: 'ACTIVE',
      },
      refs,
    });
  }

  /* --- Contacts (need company) --- */
  for (const ct of CONTENT_SEED.contacts) {
    await seedEntity(db, {
      model: 'contact', versionModel: 'contactVersion', key: `contact:${ct.key}`, force,
      findWhere: { name: ct.name },
      seed: {
        name: ct.name, type: ct.type,
        companyId: ct.companySlug ? refs[`company:${ct.companySlug}`] : null,
        phone: ct.phone, email: ct.email,
        publicDisplay: true, order: ct.order,
        verificationStatus: ct.verificationStatus, verificationDate: new Date(),
      },
      refs,
    });
  }

  /* --- History events (need company) --- */
  for (const h of CONTENT_SEED.historyEvents) {
    const row = await seedEntity(db, {
      model: 'historyEvent', versionModel: 'historyEventVersion', key: `history:${h.year}`, force,
      findWhere: { title: h.title },
      seed: {
        title: h.title,
        date: new Date(`${h.year}-06-15T00:00:00.000Z`),
        description: h.description,
        order: h.order,
      },
      refs,
    });
    if (h.companySlug && refs[`company:${h.companySlug}`]) {
      await db.historyEventCompany.upsert({
        where: { historyEventId_companyId: { historyEventId: row.id, companyId: refs[`company:${h.companySlug}`] } },
        update: {},
        create: { historyEventId: row.id, companyId: refs[`company:${h.companySlug}`] },
      });
    }
  }

  /* --- CSR entries (need company) --- */
  for (const csr of CONTENT_SEED.csrEntries) {
    await seedEntity(db, {
      model: 'cSREntry', versionModel: 'cSREntryVersion', key: `csr:${slugify(csr.title, csr.category)}`, force,
      versionFkField: 'csrEntryId',
      findWhere: { title: csr.title },
      seed: {
        title: csr.title, description: csr.description, category: csr.category,
        companyId: csr.companySlug ? refs[`company:${csr.companySlug}`] : null,
      },
      refs,
    });
  }

  /* --- Career listings (need location) --- */
  for (const cl of CONTENT_SEED.careerListings) {
    await seedEntity(db, {
      model: 'careerListing', versionModel: 'careerListingVersion', key: `career:${slugify(cl.jobTitle, cl.department)}`, force,
      findWhere: { jobTitle: cl.jobTitle },
      seed: {
        jobTitle: cl.jobTitle, department: cl.department, description: cl.description,
        locationId: refs[`location:${cl.locationKey}`] ?? null,
        employmentType: cl.employmentType,
        listingStatus: 'OPEN',
      },
      refs,
    });
  }

  /* --- News + gallery media (ingested from the frontend bundles) --- */
  const news = loadNewsBundle();
  const tiles = loadGalleryTiles();

  // Media rows: every unique news banner + every gallery tile.
  const mediaByUrl = new Map();
  const upsertMedia = async (url, caption, tags) => {
    if (mediaByUrl.has(url)) return mediaByUrl.get(url);
    const key = `media:${mediaByUrl.size}`;
    const row = await seedEntity(db, {
      model: 'media', versionModel: 'mediaVersion', key, force,
      findWhere: { url },
      seed: { url, caption, altText: caption, tags, license: '© Lake Group' },
      refs: mediaRefs,
    });
    mediaByUrl.set(url, row.id);
    return row.id;
  };
  const mediaRefs = {};

  // News categories: create on the fly from the bundle's category strings.
  const newsCategoryIds = new Map();
  for (const n of news) {
    const cat = String(n.category || 'News').trim();
    if (!newsCategoryIds.has(cat)) {
      const row = await seedEntity(db, {
        model: 'category', versionModel: 'categoryVersion', key: cat, keyField: 'name', force,
        seed: { name: cat, description: null },
        refs: mediaRefs,
      });
      newsCategoryIds.set(cat, row.id);
    }
  }

  for (const n of news) {
    const heroId = n.bannerImage ? await upsertMedia(n.bannerImage, n.title, ['news']) : null;
    await seedEntity(db, {
      model: 'news', versionModel: 'newsVersion', key: slugify(n.title, n.id), keyField: 'slug', force,
      seed: {
        slug: slugify(n.title, n.id),
        title: n.title,
        // Some social/gallery items ship with an empty description array —
        // keep the record readable by falling back to the title.
        body: Array.isArray(n.description) && n.description.length ? n.description.join('\n\n') : String(n.description || n.title || ''),
        categoryId: newsCategoryIds.get(String(n.category || 'News').trim()),
        publicationDate: parseBundleDate(n.date),
        heroMediaId: heroId,
        metaTitle: n.title,
        // SEO hygiene (Phase 10): a bundle item with no description falls
        // back to the body's first sentence, then the title — never null.
        metaDescription: (Array.isArray(n.description) && n.description[0])
          ? String(n.description[0]).slice(0, 160)
          : String(n.body || n.title || '').replace(/\s+/g, ' ').trim().slice(0, 160),
      },
      refs: mediaRefs,
    });
  }

  for (const t of tiles) {
    await upsertMedia(t.url, t.caption, ['gallery', t.category].filter(Boolean));
  }

  return { companies: CONTENT_SEED.companies.length, news: news.length, galleryTiles: tiles.length };
}

async function main() {
  const db = createDb(process.env.DATABASE_URL);
  if (!db) {
    console.error('DATABASE_URL is not set. Copy .env.example to .env and fill in your connection string.');
    process.exit(1);
  }
  try {
    const counts = await seedContent(db, { force: process.argv.includes('--force') });
    console.log(`\nContent seed complete: ${counts.companies} companies, ${counts.news} news items, ${counts.galleryTiles} gallery tiles.`);
  } finally {
    await db.$disconnect();
  }
}

/* Run only when invoked directly, so tests can import the helpers. */
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main();
}
