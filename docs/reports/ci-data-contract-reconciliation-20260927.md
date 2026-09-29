# CI data-contract reconciliation — 2026-09-27

The backend seed tests were comparing current source data to retired fixed
counts. The canonical sources are the currently shipped public pages and the
seed modules that ingest them; no public content was changed for this repair.

- Employees: `backend/scripts/seed-metrics.js` and current public copy use
  `10,000+`; the test's `30,000+` assertion was stale.
- Companies: the current `CONTENT_SEED.companies` registry has 20 approved
  entries. No twenty-first company is present in the current public registry.
- Metadata: 40 public pages currently provide publishable metadata. The test
  now validates the extracted records instead of requiring an arbitrary count.
- News: `assets/news-data.js` currently exposes 42 articles. The bundle is
  ingested directly, so a fixed count would make approved publications fail CI.
- Gallery: `gallery.html` currently exposes 23 approved tiles. The seeder
  ingests those tiles directly; no placeholder media was added.
- Projects: `projects.html` and the former project records were retired.
  `CONTENT_SEED.projects` remains an intentional empty compatibility
  collection, and the verifier now records that domain without accepting an
  empty array for any active domain.
- Leadership: the current seed registry contains six approved profiles. The
  stale seventh-profile count was corrected without adding a placeholder.
- Network locations: this is not a published metric seed, so the test no
  longer asserts a nonexistent `network_locations` metric.
