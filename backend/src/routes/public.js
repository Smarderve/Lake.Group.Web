import { Router } from 'express';
import { z } from 'zod';
import { publishedMetric, publicMetric } from '../lib/metrics.js';
import { knowledgeFacts } from '../lib/knowledge.js';
import { trackEvent } from '../lib/analytics.js';
import { publicWriteLimiter } from '../middleware/rate-limit.js';
import { unansweredQuestionSchema, validationErrorBody } from '../validators/auth.js';
import { CMS_ENTITIES } from '../lib/cms-config.js';
import { promoteDueScheduled } from '../lib/publisher.js';

/**
 * Public API — unauthenticated by design.
 *
 *   GET /api/public/metrics/:key        — current PUBLISHED metric value
 *   GET /api/public/:entity             — published records (list)
 *   GET /api/public/:entity/:idOrSlug   — one published record
 *
 * Only PUBLISHED records are ever reachable here, regardless of the key,
 * id, slug or query parameters supplied — and only if the entity's
 * visibility hook passes (News scheduling, Contact.publicDisplay,
 * CareerListing OPEN). No draft/in-review/archived data ever leaks.
 *
 * CORS is permissive because this data is public and read by the static
 * frontend from another origin.
 */

// public route name → { model, lookupField?, visible? }
// lookupField drives single-record matching by id OR that field (id only
// when null). visible() is an extra server-side gate beyond PUBLISHED.
const PUBLIC_ENTITIES = {
  // Phase 4 registry.
  countries: { model: 'country', lookupField: 'name' },
  regions: { model: 'region', lookupField: 'name' },
  locations: { model: 'location', lookupField: 'name' },
  // Facilities serve the location/company names the station-locator and map
  // need without forcing the frontend into N+1 lookups.
  facilities: {
    model: 'facility',
    lookupField: 'name',
    include: { location: true, company: true },
    format: (row) => {
      const { status, createdAt, ...rest } = row;
      void createdAt;
      return {
        ...rest,
        address: row.location?.name ?? null,
        locationName: row.location?.name ?? null,
        companyName: row.company?.name ?? null,
        location: undefined,
        company: undefined,
      };
    },
  },
  categories: { model: 'category', lookupField: 'name' },
  companies: { model: 'company', lookupField: 'slug' },
  'product-services': { model: 'productService', lookupField: 'name' },
  'company-relationships': { model: 'companyRelationship', lookupField: null },
  // Phase 5 CMS core.
  pages: { model: 'page', lookupField: 'slug' },
  'content-blocks': { model: 'contentBlock', lookupField: 'key' },
  // News serves consumable fields the static frontend renderer expects:
  // `category` (name) and `bannerImage` (hero media url) — the row's raw
  // categoryId/heroMediaId stay internal.
  news: {
    model: 'news',
    lookupField: 'slug',
    visible: CMS_ENTITIES.news.publicVisible,
    include: { category: true, heroMedia: true },
    format: (row) => {
      const { status, createdAt, ...rest } = row;
      void createdAt;
      return {
        ...rest,
        category: row.category?.name ?? null,
        bannerImage: row.heroMedia?.url ?? null,
        categoryId: undefined,
        heroMedia: undefined,
        heroMediaId: undefined,
      };
    },
  },
  projects: { model: 'project', lookupField: 'title' },
  leadership: { model: 'leadership', lookupField: 'name' },
  // SECURITY_ROADMAP Phase 9 — the public contact shape drops internal
  // verification-workflow and sort metadata; the directory fields (name,
  // type, phone, email) plus content refs stay.
  contacts: {
    model: 'contact',
    lookupField: 'name',
    visible: CMS_ENTITIES.contacts.publicVisible,
    format: (row) => {
      const { status, createdAt, verificationStatus, verificationDate, order, ...rest } = row;
      void status; void createdAt;
      return rest;
    },
  },
  'history-events': { model: 'historyEvent', lookupField: 'title' },
  'career-listings': { model: 'careerListing', lookupField: 'jobTitle', visible: CMS_ENTITIES['career-listings'].publicVisible },
  'csr-entries': { model: 'cSREntry', lookupField: 'title' },
  // Phase 6 — map & media.
  'map-categories': { model: 'mapCategory', lookupField: 'slug' },
  // SECURITY_ROADMAP Phase 9 — excessive-data-exposure lockdown: the public
  // media shape drops administrative metadata (uploader user id, internal
  // folder) while keeping the gallery-facing fields the site renders
  // (url, altText, caption, tags, variants, license/copyright).
  media: {
    model: 'media',
    lookupField: null, // gallery: by id only
    format: (row) => {
      const { status, createdAt, uploadedBy, folderId, ...rest } = row;
      void status; void createdAt;
      return rest;
    },
  },
};

/** Parse a facility's "lat,lng" coordinates string; null when absent/invalid. */
function parseCoords(coordinates) {
  if (!coordinates) return null;
  const parts = coordinates.split(',').map((p) => parseFloat(p.trim()));
  if (parts.length !== 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) return null;
  return { latitude: parts[0], longitude: parts[1] };
}

/**
 * Operations map payload (Phase 6) — published countries → regions →
 * locations → facilities, with only map-visible facilities that carry
 * coordinates (own string, or inherited from their location). Markers are
 * fully database-driven; the frontend just renders this.
 */
async function publicMap(db) {
  const [categories, countries, regions, locations, facilities] = await Promise.all([
    db.mapCategory.findMany({ where: { status: 'PUBLISHED' }, orderBy: { sortOrder: 'asc' } }),
    db.country.findMany({ where: { status: 'PUBLISHED' } }),
    db.region.findMany({ where: { status: 'PUBLISHED' } }),
    db.location.findMany({ where: { status: 'PUBLISHED' } }),
    db.facility.findMany({ where: { status: 'PUBLISHED' } }),
  ]);

  const byRegion = new Map(); // regionId → locations
  const byCountry = new Map(); // countryId → regions
  for (const region of regions) {
    if (!byCountry.has(region.countryId)) byCountry.set(region.countryId, []);
    byCountry.get(region.countryId).push(region);
  }
  for (const location of locations) {
    if (!location.regionId) continue; // no region → not part of the country tree
    if (!byRegion.has(location.regionId)) byRegion.set(location.regionId, []);
    byRegion.get(location.regionId).push(location);
  }

  const tree = countries.map((country) => ({
    id: country.id,
    name: country.name,
    isoCode: country.isoCode,
    regionGrouping: country.regionGrouping ?? null,
    regions: (byCountry.get(country.id) ?? []).map((region) => ({
      id: region.id,
      name: region.name,
      locations: (byRegion.get(region.id) ?? []).map((location) => {
        const locCoords = Number.isFinite(location.latitude) && Number.isFinite(location.longitude)
          ? { latitude: location.latitude, longitude: location.longitude }
          : null;
        return {
          id: location.id,
          name: location.name,
          type: location.type ?? null,
          latitude: locCoords?.latitude ?? null,
          longitude: locCoords?.longitude ?? null,
          facilities: facilities
            .filter((f) => f.locationId === location.id && f.mapVisible !== false)
            .map((f) => {
              const own = parseCoords(f.coordinates);
              const coords = own ?? locCoords;
              return {
                id: f.id,
                name: f.name,
                category: f.category ?? null,
                operationalStatus: f.operationalStatus ?? null,
                mapCategoryId: f.mapCategoryId ?? null,
                markerLabel: f.markerLabel ?? null,
                companyId: f.companyId ?? null,
                ...(coords ? { latitude: coords.latitude, longitude: coords.longitude } : {}),
              };
            })
            .filter((f) => f.latitude != null), // only markers with coordinates
        };
      }),
    })),
  }));

  return {
    categories: categories.map((c) => ({
      id: c.id, name: c.name, slug: c.slug, description: c.description ?? null,
      color: c.color ?? null, icon: c.icon ?? null, sortOrder: c.sortOrder,
    })),
    countries: tree,
  };
}

/** Strip governance-internal fields from a public record. */
function publicRow(row) {
  const { status, createdAt, ...rest } = row;
  void createdAt; // keep the response lean; updatedAt stays for freshness
  return rest;
}

/** PUBLISHED + entity visibility hook (scheduling, display flags). */
function isPubliclyVisible(entry, row) {
  if (row.status !== 'PUBLISHED') return false;
  if (entry.visible) return entry.visible(null, row);
  return true;
}

// SECURITY_ROADMAP Phase 10 — pagination caps on public list reads: an
// explicit limit (1-100) and offset (0-10000), rejected when malformed.
// Absent params preserve the existing uncapped behavior (these are small
// content tables today, but the cap exists before they grow).
const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1, 'limit must be >= 1').max(100, 'limit must be <= 100').optional(),
  offset: z.coerce.number().int().min(0, 'offset must be >= 0').max(10000, 'offset too large').optional(),
});

export function publicRouter({ db } = {}, writeLimiter = publicWriteLimiter()) {
  const router = Router();

  router.use((req, res, next) => {
    res.set('Access-Control-Allow-Origin', '*');
    next();
  });

  // CORS preflight: the public endpoints are deliberately read cross-origin
  // (static site → API) and the unanswered-question POST sends a JSON body,
  // which triggers a preflight. Express's default OPTIONS response lacks the
  // Allow-Methods/Allow-Headers headers, so the browser would silently block
  // the POST — answer preflights explicitly.
  router.options('/*splat', (req, res) => {
    res.set({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    });
    res.sendStatus(204);
  });

  // Phase 7 — lazy scheduled publishing: any APPROVED entity whose
  // scheduled publishAt has arrived goes live on this read (no cron). A
  // promotion failure must never break the public read that triggered it.
  router.use(async (req, res, next) => {
    try {
      await promoteDueScheduled(db, req.log);
    } catch (err) {
      req.log?.warn?.({ err }, 'scheduled promotion failed on public read');
    }
    next();
  });

  // GET /api/public/map — database-driven operations map (must precede the
  // generic /:entity route so 'map' isn't treated as an entity name).
  router.get('/map', async (req, res, next) => {
    try {
      res.json(await publicMap(db));
    } catch (err) {
      next(err);
    }
  });

  // Phase 9 — AI / Corporate Knowledge.
  //
  // GET /api/public/knowledge/facts — the structured fact bundle the chatbot
  // consumes (PUBLISHED-only, each fact carrying its source + a site URL for
  // citations). Must precede the generic /:entity route.
  router.get('/knowledge/facts', async (req, res, next) => {
    try {
      const facts = await knowledgeFacts(db);
      res.json({ facts, generatedAt: new Date().toISOString() });
    } catch (err) {
      next(err);
    }
  });

  // POST /api/public/analytics/events — first-party analytics beacon
  // (page views, chat questions, searches). Best-effort: invalid payloads are
  // dropped silently — analytics must never break or slow the site.
  router.post('/analytics/events', writeLimiter, async (req, res, next) => {
    try {
      const row = await trackEvent(db, req.body);
      if (!row) {
        return res.status(400).json({
          error: { code: 'VALIDATION', message: 'invalid analytics event (valid type + required fields)' },
        });
      }
      res.status(201).json({ ok: true, id: row.id });
    } catch (err) {
      next(err);
    }
  });

  // POST /api/public/assistant/unanswered — record a question the chatbot
  // could not answer from approved content (content-gap tracking, blueprint
  // §7). Best-effort feedback channel: validation only, no auth.
  router.post('/assistant/unanswered', writeLimiter, async (req, res, next) => {
    try {
      const parsed = unansweredQuestionSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json(validationErrorBody(parsed.error.issues));
      }
      const { question, language, page } = parsed.data;
      await db.unansweredQuestion.create({
        data: {
          question: question.slice(0, 500),
          language: language ? language.slice(0, 3).toLowerCase() : 'en',
          page: page ? page.slice(0, 200) : null,
        },
      });
      res.status(201).json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  router.get('/metrics/:key', async (req, res, next) => {
    try {
      const metric = await publishedMetric(db, req.params.key);
      if (!metric) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'No published metric for this key' },
        });
      }
      res.json({ metric: publicMetric(metric) });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/public/:entity — published + visible records only.
  router.get('/:entity', async (req, res, next) => {
    try {
      const entry = PUBLIC_ENTITIES[req.params.entity];
      if (!entry) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: `Unknown public entity: ${req.params.entity}` },
        });
      }
      const parsed = listQuerySchema.safeParse(req.query);
      if (!parsed.success) return res.status(400).json(validationErrorBody(parsed.error.issues));
      const rows = await db[entry.model].findMany({
        where: { status: 'PUBLISHED' },
        include: entry.include,
        orderBy: { createdAt: 'desc' },
        take: parsed.data.limit,
        skip: parsed.data.offset ?? 0,
      });
      res.json({
        [entry.model]: rows
          .filter((r) => isPubliclyVisible(entry, r))
          .map((r) => (entry.format ? entry.format(r) : publicRow(r))),
      });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/public/:entity/:idOrSlug — one published, visible record.
  router.get('/:entity/:idOrSlug', async (req, res, next) => {
    try {
      const entry = PUBLIC_ENTITIES[req.params.entity];
      if (!entry) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: `Unknown public entity: ${req.params.entity}` },
        });
      }
      const { idOrSlug } = req.params;
      const lookup = entry.lookupField
        ? { OR: [{ id: idOrSlug }, { [entry.lookupField]: idOrSlug }] }
        : { id: idOrSlug };
      const row = await db[entry.model].findFirst({ where: { status: 'PUBLISHED', ...lookup }, include: entry.include });
      if (!row || !isPubliclyVisible(entry, row)) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'No published record for this key' },
        });
      }
      res.json({ [entry.model]: entry.format ? entry.format(row) : publicRow(row) });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
