# CMS V2 operations — current milestone

Run `npm run build` in `cms/` and `backend/` to verify compilation. Run `node e2e/control-center.mjs` from `cms/` for browser QA; it starts in memory backend and static public website servers, authenticates a test administrator, exercises page search and autosave, and captures screenshots in `docs/qa/cms-v2-control-center/`. The test does not touch production data.

The current entry point is `/control`. `/app` remains the default and retains existing workflows. The preview source defaults to `https://lake-group.vercel.app`; set `CMS_V2_PUBLIC_SITE_ORIGIN` on the backend to another HTTPS public origin when necessary. The CMS CSP must permit that origin for base, styles, fonts and images. Set `CMS_V2_RELEASE_DIR` to an isolated durable CMS V2 artifact directory, by default `../public-content/cms-v2` from the backend working directory. Do not point it at the existing `public-content/` directory; the storage adapter rejects a legacy pointer there.

Configure the same strong `CMS_V2_DEPLOYMENT_TOKEN` on the backend and the GitHub production environment. A validated CMS V2 release creates a publication event; the public release worker dispatches `.github/workflows/public-release.yml`, which runs `npm run cms-v2:snapshot -- "$PUBLIC_API_BASE_URL"` before the Vercel build. Check `/admin/public-releases` when a queued release does not deploy.
