# CMS V2 operations — current milestone

Run `npm run build` in `cms/` and `backend/` to verify compilation. Run `node e2e/control-center.mjs` from `cms/` for browser QA; it starts in memory backend and static public website servers, authenticates a test administrator, exercises page search and autosave, and captures screenshots in `docs/qa/cms-v2-control-center/`. The test does not touch production data.

The current entry point is `/control`. `/app` remains the default and retains existing workflows. A release created through `/control` is an immutable CMS artifact; verify its downstream deployment separately because public delivery is not connected yet.
