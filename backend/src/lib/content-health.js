/**
 * Phase 10 — Content Health / Data Quality engine.
 *
 * Actively identifies (blueprint §8): stale facts, missing verification,
 * missing sources, conflicting statistics, broken links, missing translations,
 * missing SEO metadata, unused/outdated media, and frequently-asked
 * unanswered questions — then scores each domain (0–100) for the
 * content-health dashboard.
 *
 * All checks read through the passed `db` (real Prisma or the hermetic fake),
 * so the whole engine is unit-testable without a live database. Filesystem
 * checks (link existence, i18n dictionary, SEO scan) take explicit paths —
 * tests inject fixtures.
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { EVENT_TYPES } from './analytics.js';
import { safeFetch as defaultSafeFetch } from './ssrf-guard.js';

/** Whether a metric's fact is stale relative to `now` (ms). */
export function metricStaleness(metric, staleDays, now = Date.now()) {
  const windowMs = staleDays * 24 * 60 * 60 * 1000;
  if (metric.verificationStatus !== 'VERIFIED' || !metric.verificationDate) {
    return 'OVERDUE';
  }
  const age = now - new Date(metric.verificationDate).getTime();
  if (age > windowMs) return 'OVERDUE';
  if (age > windowMs * 0.7) return 'DUE_SOON';
  return 'CURRENT';
}

/** Metric-domain checks: staleness, verification, sources, conflicts. */
export async function checkMetrics(db, { staleDays = 180, now = Date.now() } = {}) {
  const metrics = await db.metric.findMany({ where: { status: { not: 'ARCHIVED' } } });
  const stale = { current: 0, dueSoon: [], overdue: [] };
  const missingVerification = [];
  const missingSource = [];

  for (const m of metrics) {
    const level = metricStaleness(m, staleDays, now);
    if (level === 'CURRENT') stale.current += 1;
    else if (level === 'DUE_SOON') stale.dueSoon.push({ key: m.key, value: m.value, verificationDate: m.verificationDate });
    else stale.overdue.push({ key: m.key, value: m.value, verificationDate: m.verificationDate });
    if (m.verificationStatus !== 'VERIFIED' || !m.verificationDate) {
      missingVerification.push({ key: m.key, value: m.value });
    }
    if (!m.source || !String(m.source).trim()) {
      missingSource.push({ key: m.key });
    }
  }

  // Conflicting statistics: a metric whose PUBLISHED value has changed across
  // its version history (the fact contradicts its own previous published truth).
  const conflicts = [];
  for (const m of metrics) {
    const versions = await db.metricVersion.findMany({ where: { metricId: m.id } });
    const distinct = new Set(versions.map((v) => String(v.value))).size;
    if (distinct > 1) {
      const values = [...new Set(versions.map((v) => String(v.value)))].slice(0, 5);
      conflicts.push({ key: m.key, currentValue: m.value, previousValues: values });
    }
  }

  return {
    total: metrics.length,
    stale,
    missingVerification,
    missingSource,
    conflicts,
  };
}

/* ------------------------------------------------------------------ */
/* Broken links                                                        */
/* ------------------------------------------------------------------ */

const INTERNAL_PREFIX = 'assets/';

/** Classify a URL: 'internal' (site asset) or 'external'. */
export function classifyUrl(url) {
  if (!url || typeof url !== 'string') return 'external';
  const trimmed = url.trim();
  if (trimmed.startsWith(INTERNAL_PREFIX) || trimmed.startsWith('/')) return 'internal';
  return 'external';
}

/** Gather every URL the governed entities reference. */
export async function collectUrls(db) {
  const urls = [];
  const companies = await db.company.findMany({});
  for (const c of companies) {
    if (c.website) urls.push({ kind: 'company.website', value: c.website, owner: c.slug });
    if (c.logo) urls.push({ kind: 'company.logo', value: c.logo, owner: c.slug });
  }
  const leadership = await db.leadership.findMany({});
  for (const l of leadership) {
    if (l.photo) urls.push({ kind: 'leadership.photo', value: l.photo, owner: l.name });
  }
  const media = await db.media.findMany({});
  for (const md of media) {
    urls.push({ kind: 'media.url', value: md.url, owner: md.caption || md.url });
  }
  return urls;
}

/**
 * Broken-link check. Internal asset paths are verified against the repo on
 * disk (repoRoot). External URLs are format-validated by default; pass
 * checkExternal:true to also HEAD-request them (network dependent — off in
 * hermetic tests). External HEAD requests go through the SSRF guard
 * (ssrf-guard.js — private/DNS-unsafe destinations are blocked, redirects
 * re-validated, per-hop timeouts). `fetcher` is injectable for tests.
 */
export async function checkLinks(db, { repoRoot, checkExternal = false, fetcher = defaultSafeFetch } = {}) {
  const urls = await collectUrls(db);
  const internal = { checked: 0, missing: [] };
  const external = { checked: 0, invalid: [], unreachable: [] };

  for (const u of urls) {
    if (classifyUrl(u.value) === 'internal') {
      internal.checked += 1;
      // Strip cache-busting query strings / fragments (?v=80, #foo).
      const clean = u.value.startsWith('/') ? u.value.slice(1) : u.value;
      const pathOnly = clean.split(/[?#]/)[0];
      if (repoRoot) {
        // SECURITY (Phase 14): DB-controlled asset paths (media.url,
        // company.logo, leadership.photo) must never probe outside
        // repoRoot — resolve and require separator-aware containment
        // (rejects ".." escapes AND sibling dirs sharing the root prefix).
        const root = path.resolve(repoRoot);
        const resolved = path.resolve(root, pathOnly);
        const inside = resolved === root || resolved.startsWith(root + path.sep);
        if (!inside || !fs.existsSync(resolved)) {
          internal.missing.push({ ...u, value: u.value });
        }
      }
    } else {
      external.checked += 1;
      let parsed;
      try {
        parsed = new URL(u.value);
      } catch {
        parsed = null;
      }
      if (!parsed || !/^https?:$/.test(parsed.protocol)) {
        external.invalid.push(u);
        continue;
      }
      if (checkExternal) {
        const res = await fetcher(u.value);
        if (res.status === 0) {
          external.unreachable.push({ ...u, status: null, blocked: res.blocked });
        } else if (!res.ok) {
          external.unreachable.push({ ...u, status: res.status });
        }
      }
    }
  }

  return { internal, external };
}

/* ------------------------------------------------------------------ */
/* Missing translations                                                */
/* ------------------------------------------------------------------ */

/**
 * Compare every language against `en`: report keys absent entirely and keys
 * present with an empty string. `dictionaries` is `{ en: {..}, fr: {..} }`.
 */
export function checkTranslations(dictionaries) {
  const languages = Object.keys(dictionaries);
  const en = dictionaries.en || {};
  const missing = {};
  const empty = {};
  for (const lang of languages) {
    if (lang === 'en') continue;
    const dict = dictionaries[lang] || {};
    missing[lang] = Object.keys(en).filter((k) => !(k in dict));
    empty[lang] = Object.keys(en).filter((k) => k in dict && String(dict[k]).trim() === '');
  }
  return { languages, enKeys: Object.keys(en).length, missing, empty };
}

/** Load the frontend i18n dictionary file (vm — it assigns to `window`). */
export function loadI18nDictionaries(i18nPath) {
  const src = fs.readFileSync(i18nPath, 'utf8');
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  return ctx.window.__LAKE_I18N_CONTENT__ || {};
}

/* ------------------------------------------------------------------ */
/* Missing SEO metadata                                                */
/* ------------------------------------------------------------------ */

export async function checkSeo(db, { repoRoot } = {}) {
  const news = await db.news.findMany({ where: { status: 'PUBLISHED' } });
  const missingMeta = news
    .filter((n) => !n.metaTitle || !n.metaDescription)
    .map((n) => ({ slug: n.slug, title: n.title, missingTitle: !n.metaTitle, missingDescription: !n.metaDescription }));

  const pages = { checked: 0, missingTitle: [], missingDescription: [], missingLang: [] };
  if (repoRoot) {
    const files = fs.readdirSync(repoRoot).filter((f) => f.endsWith('.html') && !f.startsWith('_'));
    for (const file of files) {
      pages.checked += 1;
      const html = fs.readFileSync(path.join(repoRoot, file), 'utf8');
      if (!/<title[^>]*>[\s\S]*?<\/title>/i.test(html)) pages.missingTitle.push(file);
      if (!/<meta[^>]+name=["']description["'][^>]*>/i.test(html)) pages.missingDescription.push(file);
      if (!/<html[^>]+lang=["'][a-zA-Z-]+["']/i.test(html)) pages.missingLang.push(file);
    }
  }

  return { news: { checked: news.length, missingMeta }, pages };
}

/* ------------------------------------------------------------------ */
/* Unused media                                                        */
/* ------------------------------------------------------------------ */

export async function checkMedia(db) {
  const media = await db.media.findMany({});
  const usages = await db.mediaUsage.findMany({});

  const entityRefs = await Promise.all([
    db.news.findMany({}),
    db.company.findMany({}),
    db.leadership.findMany({}),
    db.project.findMany({}),
    db.historyEvent.findMany({}),
    db.cSREntry.findMany({}),
  ]);
  const [news, companies, leadership, projects, historyEvents, csrEntries] = entityRefs;
  const referenced = new Set(usages.map((u) => u.mediaId));
  for (const n of news) if (n.heroMediaId) referenced.add(n.heroMediaId);
  for (const c of companies) if (c.logoMediaId) referenced.add(c.logoMediaId);
  for (const l of leadership) if (l.photoMediaId) referenced.add(l.photoMediaId);
  for (const p of projects) if (p.coverMediaId) referenced.add(p.coverMediaId);
  for (const h of historyEvents) if (h.imageMediaId) referenced.add(h.imageMediaId);
  for (const c of csrEntries) if (c.imageMediaId) referenced.add(c.imageMediaId);

  // Media seeded for the site's gallery/news surfaces carry a tag even though
  // no join row exists — they are used, not orphaned.
  const unused = media
    .filter((m) => {
      if (referenced.has(m.id)) return false;
      const tags = Array.isArray(m.tags) ? m.tags : [];
      return !tags.includes('gallery') && !tags.includes('news');
    })
    .map((m) => ({ id: m.id, url: m.url, caption: m.caption }));

  return { total: media.length, referenced: referenced.size, unused };
}

/* ------------------------------------------------------------------ */
/* Frequently-asked unanswered questions                               */
/* ------------------------------------------------------------------ */

export async function checkFaq(db) {
  const rows = await db.unansweredQuestion.findMany({});
  const counts = {};
  for (const r of rows) {
    const norm = String(r.question || '').toLowerCase().replace(/\s+/g, ' ').trim();
    if (!norm) continue;
    counts[norm] = (counts[norm] || 0) + 1;
  }
  const top = Object.entries(counts)
    .map(([question, count]) => ({ question, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  return { total: rows.length, open: rows.filter((r) => !r.answered).length, top };
}

/* ------------------------------------------------------------------ */
/* Scores                                                              */
/* ------------------------------------------------------------------ */

function percent(ok, total) {
  if (total === 0) return null; // no data → not scored
  return Math.round((ok / total) * 1000) / 10;
}

/** Per-domain 0–100 quality scores + overall, derived from the checks. */
export function computeScores(checks) {
  const m = checks.metrics;
  const metrics = percent(
    m.total - m.missingVerification.length - m.missingSource.length - m.conflicts.length - m.stale.overdue.length,
    m.total,
  );

  const mediaScore = percent(checks.media.total - checks.media.unused.length, checks.media.total);

  let i18n = null;
  const i18nChecks = checks.i18n;
  if (i18nChecks && i18nChecks.enKeys > 0) {
    const langs = (i18nChecks.languages || []).filter((l) => l !== 'en');
    const totalSlots = langs.length * i18nChecks.enKeys;
    let issues = 0;
    for (const l of langs) {
      issues += (i18nChecks.missing[l] || []).length;
      issues += (i18nChecks.empty[l] || []).length;
    }
    i18n = totalSlots > 0 ? Math.round((1 - issues / totalSlots) * 1000) / 10 : 100;
  }

  let seo = null;
  const seoNews = checks.seo.news;
  const seoPages = checks.seo.pages;
  if (seoNews.checked + seoPages.checked > 0) {
    const issues =
      seoNews.missingMeta.length +
      seoPages.missingTitle.length +
      seoPages.missingDescription.length +
      seoPages.missingLang.length;
    seo = Math.round((1 - issues / (seoNews.checked + seoPages.checked * 3)) * 1000) / 10;
  }

  const linkScore = (() => {
    const internal = checks.links.internal.checked;
    const external = checks.links.external.checked;
    const total = internal + external;
    if (total === 0) return null;
    const issues = checks.links.internal.missing.length + checks.links.external.invalid.length;
    return Math.round((1 - issues / total) * 1000) / 10;
  })();

  const scored = [metrics, mediaScore, i18n, seo, linkScore].filter((s) => s !== null);
  const overall = scored.length ? Math.round((scored.reduce((a, b) => a + b, 0) / scored.length) * 10) / 10 : null;

  return {
    overall,
    metrics,
    media: mediaScore,
    i18n,
    seo,
    links: linkScore,
  };
}

/* ------------------------------------------------------------------ */
/* Full report                                                         */
/* ------------------------------------------------------------------ */

/**
 * Assemble the complete content-health report. Options:
 *   { db, staleDays, now, repoRoot, i18nPath, checkExternal }
 */
export async function buildHealthReport(db, opts = {}) {
  const {
    staleDays = 180,
    now = Date.now(),
    repoRoot = null,
    i18nPath = null,
    checkExternal = false,
  } = opts;

  const checks = {
    metrics: await checkMetrics(db, { staleDays, now }),
    links: await checkLinks(db, { repoRoot, checkExternal }),
    i18n: i18nPath ? checkTranslations(loadI18nDictionaries(i18nPath)) : null,
    seo: await checkSeo(db, { repoRoot }),
    media: await checkMedia(db),
    faq: await checkFaq(db),
  };
  const scores = computeScores(checks);

  return {
    generatedAt: new Date(now).toISOString(),
    staleDays,
    scores,
    checks,
  };
}

export { EVENT_TYPES };
