# CMS V2 content model

`backend/src/lib/cms-v2-content.js` remains the closed document registry. Page documents keep their imported `hero`, `introduction`, `cta`, `media`, `sections`, and `seo` compatibility fields and can now contain a validated `composition` tree. The tree stores stable component IDs and keys, visibility and lock state, typed content, 12 column layout, approved style presets, sparse tablet/mobile overrides, reusable keys, global references and children.

`ContentDocument` points to current draft and published revisions. `ContentRevision` stores immutable JSON content. `CmsRelease` and `CmsReleaseDocument` record release identity. See `backend/prisma/schema.prisma` for authoritative fields and relations.

Layout remains JSON inside immutable `ContentRevision` rows; it is not written into arbitrary HTML and is not over-normalized into style tables. `POST /admin/v2/global-data/transaction` validates every participating document before one Prisma transaction creates all revisions and advances all draft pointers. Any stale pointer or invalid document rolls the transaction back.
