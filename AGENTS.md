# Agent Rules — Lake Group Repository

Rules for any agent working in this repository. See `docs/REPOSITORY_STRUCTURE_AUDIT.md`
for the full inventory and `docs/FILE_STRUCTURE_MIGRATION_MAP.md` for move records.

## File placement rules

1. **Do not place new application files at the repository root** unless they are
   explicitly required root-level configuration, a public website page (`.html`),
   or a web-root file (`sw.js`, `manifest.webmanifest`, `robots.txt`, `sitemap.xml`,
   `favicon.ico`, `404.html`, `offline.html`).
2. Before creating a file, ask: *which directory owns this category?* Then place it
   there:
   - Source code → existing app dirs (`cms/`, `backend/`, `src/` if present)
   - Public website page → root as `*.html` (it is a public URL)
   - Public asset → `assets/`
   - Documentation / reports / design notes → `docs/` (design → `docs/design/`,
     QA → `docs/qa/`, reports → `docs/reports/`, planning → `docs/project/`,
     company reference material → `docs/reference/company/`, guides → `docs/development/`)
   - Reusable or maintenance script → `scripts/`
   - Test → `tests/` or the existing test structure of the owning app
3. Company reference documents (DOCX/PPTX/PDF) belong under `docs/reference/company/`
   unless they are intentionally public downloads (then `public-content/`).
4. Do not create temporary/debug files at root; put them in `scripts/` with a
   leading `_` if one-off, and remove or relocate them when done.
5. Do not duplicate assets across `assets/`, `public-content/`, `lake-story-assets/`
   without a documented reason.

## URL and reference safety

6. The public website is **static HTML served from root by Vercel**. Every root
   `.html` file is a public URL — never move it into a subfolder without a redirect
   strategy in `vercel.json` and explicit approval.
7. `lighthouserc.json` must stay at root (`lhci autorun` discovers it there).
   `skills-lock.json` must stay at root (agent-skills lockfile).
8. Before moving any file, search the repo for references (`grep` across html/js/ts/
   css/json/md, excluding `node_modules`), and check `vercel.json` headers/redirects.
9. Preserve public URLs; use `vercel.json` redirects when a URL must change.
10. Never delete a file until references and build/deploy behavior are verified.
    Prefer `git mv` so history is preserved.

## Verification

11. After structure changes: run `npm run test:public-delivery`, `npm run test:skeleton`,
    `npm run secret:scan`, and `node scripts/check-root-structure.mjs`.
12. Do not mix unrelated code changes with file-structure migrations; keep them
    separate, reviewable changes.
