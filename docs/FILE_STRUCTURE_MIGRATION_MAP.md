# File Structure Migration Map

**Date:** 2026-08-14
**Plan:** Professional Project File Structure Cleanup (Phases 21–24, 27)
**Method:** `git mv` for all moves (history preserved). Working-tree changes from
prior tasks were left untouched.

| Old path | New path | Reason | References updated | Public URL affected | Tested |
|---|---|---|---|---|---|
| `chat.md` | `docs/project/chat.md` | planning note; was publicly served | no refs | no | yes (moved; no refs) |
| `chat-summary.md` | `docs/project/chat-summary.md` | planning note | no refs | no | yes |
| `QA_REPORT.md` | `docs/qa/QA_REPORT.md` | QA report | `scripts/_update_stats_remove_ex.js`, `docs/developer-guide.html` | no (was not a page) | yes |
| `DATA_GAPS.md` | `docs/reports/DATA_GAPS.md` | content-gap report | prose mentions remain valid as names | no | yes |
| `FLAGSHIP_DESIGN.md` | `docs/design/FLAGSHIP_DESIGN.md` | design doc | `docs/developer-guide.html` tree/prose | no | yes |
| `DEVELOPER_GUIDE.pdf` | `docs/development/DEVELOPER_GUIDE.pdf` | exported developer guide | no refs | no | yes |
| `Lake_Group_Company_Profile.docx` | `docs/reference/company/Lake_Group_Company_Profile.docx` | stale duplicate; canonical generated copy lives at `docs/Lake_Group_Company_Profile.docx` | no refs (generator writes to `docs/`) | no | yes |
| `LAKE_GROUP_PRESENTATION.pptx` | `docs/reference/company/LAKE_GROUP_PRESENTATION.pptx` | company reference deck | no refs | no | yes |
| `_probe_styles.js` | `scripts/_probe_styles.js` | one-off diagnostic | no refs | no | yes |
| `_run_grep.js` | `scripts/_run_grep.js` | one-off diagnostic | no refs | no | yes |
| `pages-map.png` | `docs/qa/pages-map.png` | QA artifact; canonical image is `assets/images/pages-map.png` | no refs | no | yes |

## Reference updates applied

1. `scripts/_update_stats_remove_ex.js` — QA report write path now
   `docs/qa/QA_REPORT.md` (prevents root re-pollution on next run).
2. `docs/developer-guide.html` — production file-tree section updated:
   `FLAGSHIP_DESIGN.md` → `docs/design/FLAGSHIP_DESIGN.md`,
   `QA_REPORT.md` → `docs/qa/QA_REPORT.md`.

## Explicitly not moved (URL / tooling constraints)

- All root `.html` pages, `sw.js`, `manifest.webmanifest`, `robots.txt`,
  `sitemap.xml`, `favicon.ico`, `404.html`, `offline.html` — public web root.
- `lighthouserc.json` — `lhci autorun` auto-discovers it at repo root (CI).
- `skills-lock.json` — agent-skills lockfile expected at root.
- `package.json`, `package-lock.json`, `.gitignore`, `.env.local`, `vercel.json`,
  `README.md` — required root configuration.

## Validation performed

- `git mv` completed for all 11 files; renames detected by git.
- No reference audit failures (all external references searched before moving).
- Root-structure check script added: `scripts/check-root-structure.mjs`.
- Site delivery test suite (`npm run test:public-delivery`) PASS.
- Skeleton test (`npm run test:skeleton`) PASS.
- Secret scan (`npm run secret:scan`) PASS.
- Backend suite, CMS typecheck: unaffected (no backend/CMS paths touched).
