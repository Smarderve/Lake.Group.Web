# CMS V2 QA — composition milestone

## Completed

- CMS and backend builds pass.
- Backend V2 route tests cover authentication and page catalog revision state.
- Content service tests cover multi-page snapshot preservation, integrity, and restoring an older release over an existing draft.
- The V2 storage test proves a legacy public snapshot pointer cannot be replaced; the disabled Lake Aviation adapter and existing public delivery tests pass after namespace separation.
- Release review tests cover field diffs, safe internal destinations, warnings, blocking URLs, duplicate section keys, and backend enforcement. Browser QA opens the release review and creates a validated release.
- Deployment tests cover bearer authorization, the no-release fallback, digest verification, immutable export, and the Lake Aviation adapter's isolated release path.
- The CMS authentication guard tests pass with the test runner's explicit disabled bypass value.
- Browser test covers sign in, overview, page search, editor, autosave, and the actual public page source in a script-free canvas at 1440px. It checks Lake Aviation draft text, canvas-to-inspector selection, and hero image loading.
- Browser test covers the overview at 390px and checks horizontal overflow.
- Screenshots are saved under `docs/qa/cms-v2-control-center/`.
- Focused composition tests cover registry migration, CRUD, protected deletion, invalid nesting, reorder, responsive inheritance, 12 column span validation and structured differences.
- Backend component tests cover server schema validation, protected nodes, global/navigation schemas, and validate-before-write behavior for atomic transactions.

## Not yet verified

Browser QA for the composition milestone must cover the real canvas at 1440, 1366, 1536, 1920 and 390, plus desktop/tablet/mobile iframe widths. Production rollback continues to use immutable release restore. The root repository's two preexisting media placeholder failures and old mirror secret findings are tracked separately and are unrelated to CMS V2.
