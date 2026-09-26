# CMS frontend Phase 1 verification

The existing `/control` frontend has been rebuilt on main. The legacy `/app`, static public delivery, approved home globe, and existing backend contracts remain in place. This report describes frontend scope only.

## Implemented workspaces

- Overview: real catalog, draft and release information, continue editing, and workspace actions.
- Pages: search, filters, sorting, grouping, desktop table and compact mobile rows.
- Visual editor: actual website preview, layers, component insertion, inspector, device widths, zoom, breakpoint overrides and reset, local undo/redo, protected components, and retained manual save/review/publish/revision hooks.
- Navigation: nested tree editing, drag and keyboard ordering, link controls, and desktop/mobile local previews.
- Global Data: canonical fields, discovered usages, reference-state explanations, and impact review.
- Media: grid/list, search, categories, details, copy path, discovered usages, and local upload selection.
- History: actual revision/release data and returned content comparison.
- Settings: website, publishing, backups and system information with honest unavailable operational states.
- Shared shell: responsive navigation, workspace context, account/logout, command palette, keyboard handling, loading/error/empty/permission states, and accessible dialogs.

## Phase 2 boundary

Navigation edits, new global transactions, media upload/replace/delete, backup restoration, operational health checks and configuration writes await Phase 2. Controls label local previews or disable unavailable writes. Existing editor persistence hooks remain connected to their existing contracts; no production publish was performed during QA. Automatic persistence and persistent undo history are deferred. Composition usage discovery does not prove every legacy static reference has been found.

Existing imported legacy content can contain imperfect text extraction; this rebuild displays the returned draft rather than silently replacing it. Content import cleanup remains outside this frontend change.

The sandbox editor pauses interactive website scripts and prevents preview links/forms from navigating. The approved live globe remains available through the website preview. Its public code and geometry were not changed by this rebuild.

## Validation

- CMS production build and application typecheck: passed.
- Test typecheck: passed.
- CMS unit tests: 13 files, 62 tests passed.
- Performance budget: passed; entry approximately 343.4 KiB raw / 109.2 KiB gzip and CSS 96.3 KiB. Shells and workspaces load in separate chunks; budgets were not relaxed.
- Public delivery: 3 tests passed.
- Public skeleton: 4 tests passed.
- Secret scan: passed.
- Root structure audit: passed with 24 existing unexpected-entry warnings; no unrelated structure migration was attempted.

## Browser evidence

The Playwright Chromium runner starts the actual Vite frontend, serves the actual static website files, and uses the existing isolated test API service. QA release/media records are explicitly test fixtures, not production activity.

All eight workspace views are checked at 1920×1080, 1440×900, 1366×768, 1280×800, 1024×768, 768×1024, 430×932, 390×844 and 360×800: 72 workspace/viewport checks. Checks include document overflow and axe WCAG A/AA rules. The final results and full-page screenshots are stored beside this report. No browser errors or axe violations were recorded.

Interaction checks cover page search, component insertion, breakpoint reset, undo/redo, canvas zoom, command palette, local nested navigation, upload-dialog focus trapping, global impact review, release comparison, protected globe inspection, media loading/empty/error states, mobile panels and navigation. Screenshots were visually inspected across desktop, tablet and phone widths.

The final matrix was completed in checkpointed runs after navigation/screenshot timeouts on this host; the runner uses a 60-second timeout and captures editor-loading failures. Passed checkpoints contain the final product source.

Run `npm run test:control --prefix cms` to reproduce the matrix. `CMS_QA_RESUME=true` resumes an interrupted matrix; default execution runs all checks.

## Change boundaries

Restore tag: `restore-cms-frontend-20260926`, created at the original main commit `1eaa8d4`. Only CMS source, CMS tests and this QA evidence are included in the frontend commit. Concurrent backend, public-site and unrelated documentation changes are excluded.
