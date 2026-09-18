# CMS V2 content model — current milestone

`backend/src/lib/cms-v2-content.js` is the current closed document registry. Registered page documents contain `hero`, `introduction`, `cta`, `media`, `sections`, and `seo`. Separate documents contain global organization information, companies, and business verticals. The backend validates the whole document on every draft save. This model is editorial only; it cannot represent arbitrary section composition or responsive layout yet.

`ContentDocument` points to current draft and published revisions. `ContentRevision` stores immutable JSON content. `CmsRelease` and `CmsReleaseDocument` record release identity. See `backend/prisma/schema.prisma` for authoritative fields and relations.

The frontend page catalog is returned by `GET /admin/v2/pages` from the same registry. A page without an imported draft is shown as “Not imported” rather than populated with example content.
