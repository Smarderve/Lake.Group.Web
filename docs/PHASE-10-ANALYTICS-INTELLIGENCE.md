# Phase 10 — Analytics & Intelligence

> Source of truth for scope: *Lake Group Digital Platform — Master Delivery Plan v1.1*,
> Section 8 ("Data Quality / Intelligence") and the Phase 10 summary: website
> analytics, chatbot analytics, search analytics, content health, contradiction
> detection, data quality scores and recommendations. Phases 8–9 are complete
> (`docs/PHASE-8-PUBLIC-WEBSITE-MIGRATION.md`, `docs/PHASE-9-AI-KNOWLEDGE.md`).

---

## Objective

The platform must **actively identify** (blueprint §8): stale facts, missing
verification, missing sources, conflicting statistics, broken links, missing
translations, missing SEO metadata, unused/outdated media, and frequently-asked
unanswered questions — then present a **Content Health / Data Quality dashboard**
of current, due-soon, overdue and conflicting information, with per-domain
quality scores. Everything is first-party and GDPR-light: no third-party
trackers, no cookies; the beacon is a fire-and-forget POST that never blocks the
site.

## Prerequisites

- [x] Phases 8–9 complete (governed entities, PUBLISHED workflow, assistant
      knowledge, unanswered-question tracking).
- [x] Real stack running: PostgreSQL 18 + backend on :4000 (`.env` live creds).

## Scope & status

### 10.1 — First-party event capture ✅

- **`backend/prisma/migrations/0009_analytics/`** — `AnalyticsEvent` model
  (type, page, query, language, sessionId, detail JSONB, createdAt; indexed by
  type/page/query). Types are plain strings so new event kinds need no migration.
- **`backend/src/lib/analytics.js`** — `normalizeEvent` (PAGE_VIEW requires a
  page; CHAT_QUESTION/CHAT_NO_MATCH/SEARCH require a query), `trackEvent`
  (best-effort, never throws), `analyticsSummary` (page views by page, chat
  questions, no-match rate, top queries).
- **`backend/src/routes/public.js`** — `POST /api/public/analytics/events`
  (validated, 400 on bad payload, CORS-preflight friendly).
- **`backend/src/routes/admin.js`** — `GET /admin/analytics/summary?days=N`.

### 10.2 — Website + chatbot + search analytics (frontend) ✅

- **`assets/analytics.js`** — one-defer script, added to all 46 pages that carry
  the assistant (mechanical, idempotent tag insert). Fires a PAGE_VIEW per load,
  exposes `window.LakeAnalytics.track(type, opts)`; silent no-op unless a
  backend is configured (`LAKE_API_BASE`).
- **`assets/assistant.js`** — reports every chat answer as CHAT_QUESTION and
  every honest no-match as CHAT_NO_MATCH (with query + language + page). The
  backend then knows what visitors ask, what it can answer, and what it can't.

### 10.3 — Content Health / Data Quality engine ✅

**`backend/src/lib/content-health.js`** — the nine blueprint checks:

| Check | Implementation |
| --- | --- |
| Stale facts | `metricStaleness` buckets CURRENT / DUE_SOON (>70% of window) / OVERDUE; reuses the Phase 3 stale window (180 d, configurable). |
| Missing verification | metrics not VERIFIED or without a verification date. |
| Missing sources | metrics with no `source`. |
| Conflicting statistics | a metric whose value changed across its published version history (current vs previous values). |
| Broken links | internal asset URLs verified on disk (query-string cache-busters stripped — 20 false positives caught in live verification); external URLs format-validated, optional HEAD check via `LAKE_CHECK_EXTERNAL_LINKS=true`. |
| Missing translations | loads the real `assets/i18n-content.js` dictionary; per-language missing + empty keys vs `en`. |
| Missing SEO metadata | published news without metaTitle/metaDescription; pages without `<title>` / meta description / `lang`. |
| Unused media | media with no entity reference, usage row, or gallery/news tag. |
| FAQ unanswered | repeated `UnansweredQuestion` rows grouped by normalized question, with open count. |

**Scores** (`computeScores`) — per-domain 0–100 (metrics, media, i18n, seo,
links) + weighted overall; unscored domains report `null` instead of guessing.

### 10.4 — Dashboard (admin API + CLI) ✅

- **`backend/src/routes/admin.js`** — `GET /admin/content-health` (full report;
  `LAKE_SITE_ROOT` / `LAKE_I18N_PATH` envs enable the filesystem checks).
- **`backend/scripts/content-health-report.js`** — `npm run health:report`:
  prints the whole dashboard from the real database (scores + every check with
  itemized findings).

### 10.5 — Verification ✅ (real stack)

- **Backend suite: 99 passed (99)** — incl. `tests/analytics-content-health.test.js`
  (14 tests: event validation/aggregation, admin auth, staleness buckets, link
  existence, translation gaps, SEO scan, media orphans, FAQ grouping, scores,
  full report) and the real-PostgreSQL integration test.
- **`scripts/_verify_live_backend.js` — 9/9 PASS** on the live stack: baseline,
  metrics hydration, services 18/18, news 41, map 31, assistant cited answer,
  no-invention guard, and **analytics events verified in real PostgreSQL**
  (page views, chat questions and no-match queries all recorded).
- Live `health:report` on the real DB found and fixed real issues:
  - `?v=80` cache-buster query strings broke internal-link checks → stripped.
  - 7 news items had null `metaDescription` (empty bundle descriptions) → seed
    now falls back to body/title first sentence; reseeded, **SEO score 99.5**.
  - `seed:content --force` failed on a populated DB (FK RESTRICT) → added a
    reverse-dependency cleanup; force reseed now works.
- Assistant gate tightened by the live no-match analytics: short queries (≤ 3
  distinctive words) must now match **every** distinctive word ("what is the
  share price" no longer answers with a workshop list), and the single-word
  API-fact rescue only fires when the query has exactly one distinctive word
  ("…xyzzy zorbonium **office**" no longer answers with the HQ contact fact).
  Missing English auxiliaries (have/has/had/get/…) added to the stopword list.

## Live dashboard (real database, 2026-08-11)

```
QUALITY SCORES   metrics 66.7 · media 100 · i18n 99.7 · seo 99.5 · links 100
                 OVERALL 93.2
```

- **Metrics 66.7** — `subsidiaries` is OVERDUE + UNVERIFIED: the contested
  figure flagged for client sign-off in Phase 8 (the check is working as
  designed).
- **i18n 99.7** — 3 missing + 2 empty keys per non-English language
  (`footer.question`, `footer.connect`, `hero.cta` …).
- **seo 99.5** — only `offline.html` lacks a meta description (offline page —
  human decision whether to add).
- **FAQ** — the live recorded gaps ("what is lake group revenue" etc.) surface
  for triage in the admin tracker.

## Explicitly Out of Scope

- **Third-party analytics** (GA/Plausible) — first-party beacon only.
- **In-browser admin dashboard page** — the API + CLI dashboard are the
  deliverable; a dashboard UI lands with the (still dormant) `dashboard.html`
  console work.
- **Automatic fixes** — the engine identifies and scores; remediation stays a
  human/governed-publishing decision (blueprint's governance model).

## Needs client/human sign-off

- The 5 non-English translation gaps and the `offline.html` meta description.
- Whether the subsidiaries metric should be verified (fixing the metrics score)
  or retired.
- `backend/` remains untracked in git — recommend committing as its own unit.
