# Phase 9 — AI / Corporate Knowledge

> Source of truth for scope: *Lake Group Digital Platform — Master Delivery Plan v1.1*,
> Section 7 ("PHASE 9 — AI & Knowledge: Chatbot Synchronization"). This is the
> second vertical slice of the governed-data story: **an edit → review → publish
> cycle on any governed entity now flows to the chatbot on its next knowledge
> fetch — no rebuild, no redeploy of the site's knowledge base.**
>
> Phase 8 (Public Website Migration) is complete — `docs/PHASE-8-PUBLIC-WEBSITE-MIGRATION.md`.

---

## Objective

Make the website assistant a consumer of **approved published data**, not a
second, drifting copy of corporate facts. Per blueprint §7:

- the chatbot must receive **approved published data** (never drafts);
- it must **prefer structured facts with sources** and cite where an answer
  comes from;
- it must **avoid inventing statistics** — when no approved answer exists it
  says so instead of improvising;
- it must **track unanswered questions** so content gaps surface in the admin.

Everything is progressive enhancement: without a configured backend
(`window.LAKE_API_BASE`) the site, and the assistant, behave exactly as before
(build-time KB, canned fallbacks). No backend probe happens by default.

## Prerequisites

- [x] Phase 8 complete — public site hydrates from `/api/public/*`.
- [x] Backend Phases 1–7 complete — governed entities, PUBLISHED workflow,
      audit log, RBAC (SUPER_ADMIN can resolve tracked questions).
- [x] **A running backend** for end-to-end verification — PostgreSQL 18 on this
      machine (`backend/.env` updated with live credentials), migrations applied
      (0001–0008), seeds loaded. Live verification: `scripts/_verify_live_backend.js`
      drives the real stack (no stubs).

## Scope & status

### 9.1 — Structured fact ingestion (backend) ✅

- **`backend/prisma/migrations/0008_ai_knowledge/migration.sql`** — `UnansweredQuestion`
  table (question, language, page, answered, answerNote, indexed by
  `[answered, createdAt]`); model added to `backend/prisma/schema.prisma`.
- **`backend/src/lib/knowledge.js`** — `knowledgeFacts(db)` assembles the fact
  bundle from **PUBLISHED rows only**: metrics (with source + verification),
  countries (one aggregate fact), companies, leadership, history, projects, CSR,
  contacts (publicDisplay-gated, verification attached), news (headlines + lede).
  Every fact carries `{ id, type, text, source, verification, url, title }`.

### 9.2 — Fact retrieval + citation (backend → frontend) ✅

- **`backend/src/routes/public.js`**
  - `GET /api/public/knowledge/facts` → `{ facts, generatedAt }` (public, no auth).
  - `POST /api/public/assistant/unanswered` → validates question (required,
    ≤ 500 chars), normalizes language (`en` default), records the page.
- **`assets/assistant.js`** — fetches the fact bundle **only when
  `window.LAKE_API_BASE` is set** (4s timeout, silent failure). Answers prefer
  approved facts over the build-time KB when the match is clearly on-topic
  (≥ 2 distinctive words), and a single strong word rescues the case where the
  KB has no good answer. Fact answers render with a **citation line**
  (`Source: … · UNVERIFIED` when the fact is not verified) + a `Read more →`
  link to the governing page. Citations persist with chat history and survive
  language switches.

### 9.3 — No-invention guard (frontend) ✅

- **`assets/assistant.js`** — new **relevance gate**: the word-by-word KB
  fallback used to answer off-domain questions ("what is lake group revenue")
  with irrelevant chunks (a companies list, phone lines). The top KB doc must
  now cover ≥ 50% of the query's *distinctive* words (site-brand words
  "lake"/"group" are excluded from scoring — they match every chunk). Rejected
  questions get the honest "I couldn't find that" reply instead of an
  improvised answer, and are logged.

### 9.4 — Unanswered-question tracking + admin resolution ✅

- **`backend/src/routes/admin.js`** (authenticated)
  - `GET /admin/unanswered-questions` — newest first.
  - `PATCH /admin/unanswered-questions/:id` — mark answered, add an answerNote;
    writes an `UNANSWERED_QUESTION_RESOLVED` audit entry.
- **`backend/tests/knowledge.test.js`** — 5 tests: PUBLISHED-only bundle with
  source/verification/url, country aggregate, unanswered POST normalization,
  validation (400 + no row), admin list/resolve + audit, auth required.

### 9.5 — Verification ✅ (real stack)

- **Backend suite**: 85 passed, incl. the knowledge tests, the new CORS
  preflight test, and the real-PostgreSQL integration test (no longer skipped).
- **`scripts/_verify_live_backend.js`** — full live chain against PostgreSQL 18 +
  backend on :4000, headless Chrome on the real site: **8/8 PASS** — live API
  baseline (18 companies / 41 news / 111 facts / 31 map facilities), index metric
  hydration (30,000+), services 18/18, news retarget, map retarget, assistant
  cited-fact answer from live facts, no-invention guard, and the unanswered
  question verified **in the real `UnansweredQuestion` table**.
- `scripts/_verify_phase9_ai.js` (stub, offline-safe) kept for machines without a
  backend; Phase 8 stub harnesses also re-run green.

### 9.6 — Live-environment fixes found ✅

Running against the real database exposed what the fake DB could not:

- `Company.slug`, `News.slug` required → seed now passes them.
- `Facility.companyId` required → map assets without an explicit company fall
  back to the flagship (Lake Oil).
- `CSREntryVersion` FK is `csrEntryId` (not `cSREntryId`) → seed override.
- Prisma client must be regenerated after schema changes
  (`npm run db:generate`) — the live client lacked `UnansweredQuestion`.
- CORS preflight: the unanswered POST's JSON body triggers a preflight that
  Express 5's default OPTIONS can't satisfy → explicit `router.options`
  handler (Express 5 `/*splat` syntax) + regression test.

## Running the seed

```bash
cd backend
npm run db:migrate        # applies 0008_ai_knowledge
npm run seed:content      # Phase 8 entities + news + gallery (idempotent)
npm run seed:metrics      # governed metrics
```

The facts endpoint needs no seed of its own — it derives from published rows.

## Explicitly Out of Scope (Phase 9)

- **LLM generation.** Retrieval is verbatim; the assistant never generates text.
- **Multi-language fact serving.** The backend fact bundle is English (content
  is authored en); localized answers continue from the build-time KB.
- **Document retrieval / embeddings index.** The blueprint lists it; a real
  vector store deserves its own phase once the structured layer is proven.
- **Admin UI for the tracker.** API + audit exist; a dashboard view is a
  follow-up with the (still dormant) `dashboard.html` console.

## Needs client/human sign-off

- Whether the no-invention gate should be stricter (currently ≥ 50% distinctive
  word coverage) or configurable per deployment.
- The unanswered-question list should be triaged periodically; unanswered rows
  with `answered=false` are the content-gap backlog.
- `backend/` remains untracked in git — recommend committing as its own unit.
