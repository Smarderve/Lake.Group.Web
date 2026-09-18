# CMS V2 migration — current milestone

The existing `backend/src/lib/cms-v2-seed.js` extracts a limited content document from registered static pages. It does not map all website sections or preserve a complete visual composition model. The new page catalog reads the current registry and identifies pages without imported drafts. The old CMS, static pages, and public release snapshots remain untouched.

Before any production migration, take a database backup, inventory live pages against the registry, map component sections and shared references, validate sample pages against baseline screenshots, and rehearse rollback. No production database migration or content import was executed for this milestone.
