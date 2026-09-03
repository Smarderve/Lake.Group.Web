import { describe, it, expect } from 'vitest';
import { SEEDS } from '../scripts/seed-metrics.js';
import { CONTENT_SEED, CONTENT_SEED_KEYS } from '../scripts/content-seed-data.js';
import { loadNewsBundle, loadGalleryTiles, loadPageMetadata, parseBundleDate } from '../scripts/seed-content.js';

/**
 * Phase 8 · Task 8.1 — the seed is the onboarding of the *existing* verified
 * truth. These assertions pin the canonical values against the facts dataset
 * (scripts/_verified_lake_facts.md + docs/PHASE-0-AUDIT.md Task 0.1) so a
 * wrong figure can never be re-introduced as the authoritative default.
 */
describe('Phase 8 · canonical metric seeds (Corporate Truth)', () => {
  const keys = SEEDS.map((s) => s.key);

  it('seeds every metric with the required governed fields', () => {
    for (const seed of SEEDS) {
      expect(seed.key, `key for ${seed.label}`).toBeTruthy();
      expect(seed.label, `label for ${seed.key}`).toBeTruthy();
      expect(seed.value, `value for ${seed.key}`).toBeTruthy();
      expect(seed.source, `source for ${seed.key}`).toBeTruthy();
      expect(seed.verificationStatus, `verificationStatus for ${seed.key}`).toMatch(/^(VERIFIED|UNVERIFIED|SECONDARY|ESTIMATED)$/);
      expect(seed.status, `status for ${seed.key}`).toBe('PUBLISHED');
      expect(Array.isArray(seed.consumers) && seed.consumers.length > 0, `consumers for ${seed.key}`).toBe(true);
    }
  });

  it('uses unique keys', () => {
    expect(new Set(keys).size).toBe(SEEDS.length);
  });

  it('matches the verified-facts dataset (Task 0.1 canonical values)', () => {
    const byKey = Object.fromEntries(SEEDS.map((s) => [s.key, s.value]));
    expect(byKey.employees).toBe('30,000+'); // NOT 4,600+ (stale .bak)
    expect(byKey.trucks).toBe('1,600+'); // not 700+ / 750
    expect(byKey.stations).toBe('290+'); // public-facing group-wide figure
    expect(byKey.network_locations).toBe('250+'); // public figure for 253 locations across Africa
    expect(byKey.countries).toBe('10'); // not 9 / 8
    expect(byKey.nationalities).toBe('21');
  });

  it('flags contested figures as UNVERIFIED rather than asserting them as fact', () => {
    const subsidiaries = SEEDS.find((s) => s.key === 'subsidiaries');
    // The audit shows 20+ (index) vs 18+ (about/africa-network) vs 17 (services).
    expect(subsidiaries.verificationStatus).toBe('UNVERIFIED');
    expect(subsidiaries.verificationNote).toMatch(/confirm|pending|not externally/i);
  });

  it('records which live pages consume each metric (Phase 0 audit consumers)', () => {
    for (const seed of SEEDS) {
      expect(seed.consumers.join('\n'), `consumers of ${seed.key}`).toMatch(/\.html/);
    }
  });
});

/* ------------------------------------------------------------------ */
/* Phase 8 · Tasks 8.2–8.11 — content seeds (no database required)      */
/* ------------------------------------------------------------------ */

describe('Phase 8 · content seeds (registry + CMS entities)', () => {
  const { companies, countries, regions, locations, facilities, projects, leadership, contacts, historyEvents, csrEntries, careerListings, mapCategories } = CONTENT_SEED;

  it('every entity array is populated and has unique stable keys', () => {
    expect(companies).toHaveLength(21); // services.html directory (21 rows)
    expect(countries).toHaveLength(10); // verified "10 countries"
    expect(regions).toHaveLength(10); // one per operating country
    expect(locations.length).toBeGreaterThanOrEqual(16); // all verified address cities
    expect(facilities.length).toBeGreaterThanOrEqual(29); // 5 stations + 24 map assets
    expect(projects).toHaveLength(6); // projects.html prj-cards
    expect(leadership).toHaveLength(7); // leadership.html cards
    expect(contacts.length).toBeGreaterThanOrEqual(16); // HQ + verified country addresses
    expect(historyEvents.length).toBeGreaterThanOrEqual(10); // history.html timeline
    expect(csrEntries).toHaveLength(6); // csr.html pillars
    expect(careerListings).toHaveLength(5); // careers.html hiring areas
    expect(mapCategories).toHaveLength(7); // map marker layers

    for (const list of [companies, countries, regions, locations, facilities, projects, leadership, contacts, historyEvents, csrEntries, careerListings, mapCategories]) {
      const keys = list.map((x) => JSON.stringify(x));
      expect(new Set(keys).size, `${list.length} rows`).toBe(list.length);
    }
    expect(new Set(CONTENT_SEED_KEYS.companySlugs).size).toBe(21);
    expect(new Set(CONTENT_SEED_KEYS.countryIsos).size).toBe(10);
    expect(new Set(CONTENT_SEED_KEYS.facilityKeys).size).toBe(facilities.length);
  });

  it('all cross-references resolve to seeded keys', () => {
    const catSlugs = new Set(CONTENT_SEED_KEYS.categorySlugs);
    const countryIsos = new Set(CONTENT_SEED_KEYS.countryIsos);
    const regionKeys = new Set(CONTENT_SEED_KEYS.regionKeys);
    const locKeys = new Set(CONTENT_SEED_KEYS.locationKeys);
    const coSlugs = new Set(CONTENT_SEED_KEYS.companySlugs);
    const mapSlugs = new Set(mapCategories.map((m) => m.slug));

    for (const c of companies) expect(catSlugs.has(c.categorySlug), `company ${c.slug} category`).toBe(true);
    for (const r of regions) expect(countryIsos.has(r.countryIso), `region ${r.key} country`).toBe(true);
    for (const l of locations) expect(regionKeys.has(l.regionKey), `location ${l.key} region`).toBe(true);
    for (const f of facilities) {
      expect(locKeys.has(f.locationKey), `facility ${f.key} location`).toBe(true);
      expect(mapSlugs.has(f.mapCategorySlug), `facility ${f.key} map category`).toBe(true);
      if (f.companySlug) expect(coSlugs.has(f.companySlug), `facility ${f.key} company`).toBe(true);
    }
    for (const p of projects) {
      if (p.companySlug) expect(coSlugs.has(p.companySlug), `project ${p.title}`).toBe(true);
      expect(locKeys.has(p.locationKey), `project ${p.title} location`).toBe(true);
    }
    for (const l of leadership) if (l.companySlug) expect(coSlugs.has(l.companySlug), `leader ${l.name}`).toBe(true);
    for (const ct of contacts) {
      expect(countryIsos.has(ct.countryIso), `contact ${ct.key}`).toBe(true);
      if (ct.companySlug) expect(coSlugs.has(ct.companySlug), `contact ${ct.key} company`).toBe(true);
    }
    for (const h of historyEvents) if (h.companySlug) expect(coSlugs.has(h.companySlug), `history ${h.year}`).toBe(true);
    for (const csr of csrEntries) if (csr.companySlug) expect(coSlugs.has(csr.companySlug), `csr ${csr.title}`).toBe(true);
    for (const cl of careerListings) expect(locKeys.has(cl.locationKey), `career ${cl.jobTitle}`).toBe(true);
  });

  it('companies mirror the services.html directory (names + descriptions present)', () => {
    const names = companies.map((c) => c.name.toLowerCase());
    for (const expectName of ['lake oil', 'lake gas', 'lake steel', 'lake trans', 'aficd', 'lake agro', 'gulf aggregates', 'ocean galleria']) {
      expect(names.some((n) => n.includes(expectName)), `company ${expectName}`).toBe(true);
    }
    for (const c of companies) {
      expect(c.description, `description of ${c.slug}`).toBeTruthy();
      expect(c.logo, `logo of ${c.slug}`).toMatch(/^assets\/images\/logos\/companies\//);
    }
  });

  it('facility coordinates are lat,lng pairs (map markers need them)', () => {
    for (const f of facilities) {
      const [lat, lng] = f.coordinates.split(',').map(Number);
      expect(Number.isFinite(lat) && Number.isFinite(lng), `coords of ${f.key}`).toBe(true);
      expect(Math.abs(lat)).toBeLessThanOrEqual(90);
      expect(Math.abs(lng)).toBeLessThanOrEqual(180);
    }
  });

  it('contacts carry verification status and valid phones/emails where published', () => {
    for (const ct of contacts) {
      expect(['VERIFIED', 'SECONDARY', 'ESTIMATED', 'UNVERIFIED']).toContain(ct.verificationStatus);
      if (ct.email) expect(ct.email).toMatch(/@/);
      if (ct.phone) expect(ct.phone).toMatch(/^\+/);
    }
  });

  it('history events are chronological with 2006 as the founding year', () => {
    const years = historyEvents.map((h) => h.year);
    expect(years[0]).toBe(2006);
    for (let i = 1; i < years.length; i++) expect(years[i]).toBeGreaterThanOrEqual(years[i - 1]);
  });
});

describe('public page metadata migration', () => {
  it('extracts unique page titles and descriptions for governed SEO publication', () => {
    const pages = loadPageMetadata();
    expect(pages.length).toBeGreaterThan(40);
    expect(new Set(pages.map((page) => page.slug)).size).toBe(pages.length);
    expect(pages.find((page) => page.slug === 'home')).toMatchObject({
      layoutType: 'home',
    });
    for (const page of pages) {
      expect(page.title, page.slug).toBeTruthy();
      expect(page.metaTitle, page.slug).toBeTruthy();
      expect(page.metaDescription, page.slug).toBeTruthy();
    }
  });
});

describe('operations map route migration', () => {
  it('stores route coordinates as governed import data instead of frontend constants', () => {
    expect(CONTENT_SEED.mapRoutes).toHaveLength(3);
    for (const route of CONTENT_SEED.mapRoutes) {
      expect(route.name).toBeTruthy();
      expect(route.coords.length).toBeGreaterThan(1);
      expect(route.coords.every((point) =>
        Array.isArray(point) && point.length === 2 && point.every(Number.isFinite),
      )).toBe(true);
    }
  });
});

describe('Phase 8 · frontend bundle ingestion (news + gallery)', () => {
  it('news-data.js exposes a 41-article LAKE_NEWS bundle with renderer fields', () => {
    const news = loadNewsBundle();
    expect(news.length).toBe(41);
    for (const n of news) {
      expect(n.title, 'title').toBeTruthy();
      expect(n.date, `date of ${n.title}`).toBeTruthy();
      expect(n.category, `category of ${n.title}`).toBeTruthy();
      // Some social/gallery items ship with an empty description array — the
      // seed falls back to the title for the body, so an array is enough.
      expect(Array.isArray(n.description), `description of ${n.title}`).toBe(true);
    }
    expect(new Set(news.map((n) => n.id)).size).toBe(news.length);
  });

  it('bundle dates parse to real dates', () => {
    const news = loadNewsBundle();
    for (const n of news) {
      const d = parseBundleDate(n.date);
      expect(d, `date ${n.date}`).not.toBeNull();
      expect(d.getUTCFullYear()).toBeGreaterThan(2010);
    }
  });

  it('gallery.html exposes 44 tiles with src + caption', () => {
    const tiles = loadGalleryTiles();
    expect(tiles.length).toBe(44);
    for (const t of tiles) {
      expect(t.url).toMatch(/^assets\/images\//);
      expect(t.caption).toBeTruthy();
      expect(t.category).toBeTruthy();
    }
  });
});
