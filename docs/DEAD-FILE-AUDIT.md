# Dead-File Audit

Audit date: 2026-09-07  
Branch: `main`  
Restore point: `restore-before-dead-file-audit-20260907-194947`  
Audit baseline: `762e838` (`fix(globe): use cross-browser country flag assets`)

## Scope and method

This is an analysis-only audit. No files were deleted, moved, or discarded.
The existing dirty worktree was preserved.

The audit checked tracked paths, visible untracked QA artifacts, root HTML
pages, Markdown files, scripts, build/deploy/test references, Vercel rules,
service-worker references, backend/CMS references, repository history, and
SHA-256 duplicate groups. A filename alone was not treated as evidence of
deadness.

The repository currently contains 2,363 tracked files. The working tree also
contains existing user changes and untracked artifacts; those were not treated
as disposable unless independently classified below.

## 1. SAFE DEAD FILES

There are no additional non-duplicate application files that can be called
dead with high confidence. The candidates below are limited to exact copies or
reproducible local QA state.

## 2. EXACT DUPLICATES SAFE TO REMOVE

All candidates below have an exact SHA-256 match at the canonical replacement,
no runtime/build/deployment reference to the candidate path, and a repository
structure record identifying the organized replacement.

### Candidate: `chat.md`

- Type: root historical planning Markdown
- Why it existed: session handoff kept at the repository root
- Why no longer needed: exact duplicate of `docs/project/chat.md`; the
  organized copy is the canonical project record
- References found: only migration/audit documentation and the canonical copy
- Canonical replacement: `docs/project/chat.md`
- Risk level: Low
- Safe to delete: YES

### Candidate: `FLAGSHIP_DESIGN.md`

- Type: root design Markdown
- Why it existed: early design-system reference at the repository root
- Why no longer needed: exact duplicate of the organized design reference
- References found: generated documentation prose and migration records refer
  to the organized path; no runtime consumer uses the root path
- Canonical replacement: `docs/design/FLAGSHIP_DESIGN.md`
- Risk level: Low
- Safe to delete: YES

### Candidate: `QA_REPORT.md`

- Type: root QA Markdown
- Why it existed: early QA report at the repository root
- Why no longer needed: exact duplicate of the organized QA report
- References found: migration records and generated documentation only; no
  runtime or test path requires the root copy
- Canonical replacement: `docs/qa/QA_REPORT.md`
- Risk level: Low
- Safe to delete: YES

### Candidate: `DEVELOPER_GUIDE.pdf`

- Type: root generated PDF reference
- Why it existed: earlier exported developer guide location
- Why no longer needed: exact duplicate of the current organized PDF; the
  maintained generator writes `docs/DEVELOPER_GUIDE.pdf`/the organized guide
  location, not the root copy
- References found: historical chat and migration prose only; no deployment,
  build, test, or runtime reference requires the root file
- Canonical replacement: `docs/development/DEVELOPER_GUIDE.pdf`
- Risk level: Low
- Safe to delete: YES

### Candidate: `pages-map.png`

- Type: root QA image
- Why it existed: earlier page-map capture
- Why no longer needed: exact duplicate of the organized QA capture; the live
  CSS reference resolves to `assets/images/pages-map.png`, which is a different
  file and remains untouched
- References found: audit/migration documentation only; no runtime reference
  to the root path
- Canonical replacement: `docs/qa/pages-map.png` for QA reference
- Risk level: Low
- Safe to delete: YES

### Candidate: `_probe_styles.js`

- Type: root one-off diagnostic script
- Why it existed: exploratory style inspection
- Why no longer needed: exact duplicate of the script-owned copy and not part
  of any package, CI, build, test, deployment, backend, or CMS contract
- References found: migration/audit documentation only
- Canonical replacement: `scripts/_probe_styles.js`
- Risk level: Low
- Safe to delete: YES

### Candidate: `_run_grep.js`

- Type: root one-off diagnostic script
- Why it existed: exploratory repository search helper
- Why no longer needed: exact duplicate of the script-owned copy and not part
  of any package, CI, build, test, deployment, backend, or CMS contract
- References found: migration/audit documentation only
- Canonical replacement: `scripts/_run_grep.js`
- Risk level: Low
- Safe to delete: YES

## 3. TEMP / QA OUTPUT SAFE TO REMOVE

### Candidate: `test-results/.last-run.json`

- Type: untracked Playwright test state
- Why it existed: records the last local test-run position
- Why no longer needed: reproducible local state, untracked, and not consumed
  by build/deploy/runtime/CI configuration
- References found: none
- Canonical replacement: none; it is regenerated when needed
- Risk level: Low
- Safe to delete: YES

The ignored local browser profile `scripts/_chrome_profile_globe/` is also
reproducible QA state, but it is a directory rather than a tracked file and is
therefore recorded as a cleanup item for a later explicit cleanup pass, not as
part of the tracked-file count.

## 4. STALE MARKDOWN SAFE TO REMOVE

The three root Markdown files below are the stale root copies already listed in
the exact-duplicate section:

- `chat.md`
- `FLAGSHIP_DESIGN.md`
- `QA_REPORT.md`

`chat-summary.md` and `DATA_GAPS.md` are not exact duplicates of their
organized counterparts and are retained for review/reference purposes.

## 5. DEAD HTML SAFE TO REMOVE

None found.

The permanently retired concepts (News, Investor Relations, and Operations
Map) have no corresponding root HTML file in the current tree. Related paths
remain in redirects, tests, migration records, assistant/build history, or
backend/CMS domains and must not be removed from those layers by this audit.
The current `404.html`, `offline.html`, public company pages, and redirect
compatibility rules are retained.

## 6. DEAD SCRIPTS SAFE TO REMOVE

The two safe script candidates are the exact duplicate root probes:

- `_probe_styles.js` → `scripts/_probe_styles.js`
- `_run_grep.js` → `scripts/_run_grep.js`

`verify_careers.py` is an unreferenced one-off diagnostic, but it is not an
exact duplicate and may still be useful as a manual verification tool. It is
classified `REVIEW`, not safe to delete.

`_hero_original.js` is an old hero implementation/reference and is retained as
`KEEP — REFERENCE/HISTORICAL` until its restoration value is explicitly
resolved.

## 7. BACKUPS SAFE TO REMOVE

None.

`assets/i18n-content.js.bak` is stale as runtime content, but it is referenced
by tests, backend metric documentation/seeds, and historical audit evidence.
It is not safe to delete in this audit.

## 8. REVIEW — NOT SAFE ENOUGH YET

- `chat-summary.md`: differs from `docs/project/chat-summary.md`; not an
  exact duplicate.
- `DATA_GAPS.md`: differs from `docs/reports/DATA_GAPS.md` and is referenced by
  documentation and content workflows.
- `verify_careers.py`: unreferenced manual diagnostic, but not duplicated.
- `_hero_original.js`: historical hero source with possible restoration value.
- `Lake_Group_Company_Profile.docx`: exact duplicate of
  `docs/reference/company/Lake_Group_Company_Profile.docx`, but another
  generated company-profile copy exists under `docs/` and the document is
  canonical company reference material; resolve canonical ownership first.
- `LAKE_GROUP_PRESENTATION.pptx`: exact duplicate of the organized reference
  copy, but `scripts/build_presentation.py` writes the root path; deleting it
  without changing the generator would break the documented build output.
- `assets/images/logos/companies/*-new.*`: duplicate hashes and “new” names do
  not prove redundancy; active HTML and navbar mappings must be resolved per
  path before any asset cleanup.
- Exact duplicate image groups under `assets/images/`: most have distinct
  URL/context ownership (company, history, gallery, or fallback usage).
- `scripts/_coverage.json`: generated-looking, but actively consumed by the
  i18n build script.
- `scripts/_verify_*.json`, `scripts/_live_verify_out.json`, and related
  diagnostic outputs: some are historical evidence and some may be used by
  verification scripts; classify individually before cleanup.

## 9. KEEP — FUTURE NEEDED

- `backend/`, `cms/`, `public-content/`, Prisma schema/migrations, CMS types,
  seed data, and snapshot generation sources.
- `assets/i18n-content.js`, `assets/i18n-content.json`, translation builders,
  and local route/config sources.
- `sw.js`, `manifest.webmanifest`, `robots.txt`, `sitemap.xml`, `vercel.json`,
  `404.html`, and `offline.html`.
- `lake-3d/` and other explicitly documented future/reconnect or prototype
  material unless separately proven dead.

## 10. KEEP — COMPATIBILITY

- Vercel redirect rules for retired or renamed public URLs.
- Compatibility route metadata and tests that assert removed pages stay
  removed.
- Existing leadership/company route files and service-worker compatibility
  behavior.

## 11. KEEP — REFERENCE/HISTORICAL

- `docs/` audit, recovery, security, migration, QA, and release records.
- `docs/project/chat-summary.md`, `docs/project/chat.md`, and non-identical
  root planning/data-gap references until explicitly consolidated.
- `assets/i18n-content.js.bak` because tests and historical metric audits still
  reference it.
- Root/company reference documents until generator ownership and canonical
  storage are explicitly resolved.
- QA screenshots that document prior acceptance or regression evidence.

## Summary

Counts below are unique tracked/untracked file candidates; category counts for
Markdown and scripts are subsets of the duplicate count.

| Measure | Count |
|---|---:|
| Total repository files checked | 2,363 tracked files, plus visible untracked QA state |
| True dead files | 0 outside the explicit duplicate/temp candidates |
| Safe duplicate candidates | 7 |
| Reproducible temp/QA candidates | 1 file (`test-results/.last-run.json`) |
| Stale Markdown candidates | 3 |
| Dead HTML candidates | 0 |
| Dead script candidates | 2 |
| Backup candidates | 0 |
| Review items | 10 groups/items |
| Keep-future items | 5 grouped areas |

Unique high-confidence removal candidates: **8 files**.

The seven exact duplicates are the three stale Markdown files, the developer
guide PDF, `pages-map.png`, and the two root probe scripts. The eighth is the
untracked Playwright state file. No deletion was performed.

## Top safest files to delete first

1. `test-results/.last-run.json`
2. `_run_grep.js`
3. `_probe_styles.js`
4. `pages-map.png`
5. `QA_REPORT.md`
6. `FLAGSHIP_DESIGN.md`
7. `chat.md`
8. `DEVELOPER_GUIDE.pdf`

There are only eight high-confidence candidates. No additional file is listed
in the top-20 section because doing so would lower the required confidence
threshold.

## Data-source policy check

This audit made no content/data changes and did not alter public delivery.
The frontend remains independent of CMS/backend/snapshot delivery. Backend,
CMS, seeds, migrations, and future reconnect architecture were preserved.
