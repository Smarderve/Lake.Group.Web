# CMS V2 architecture — current milestone

## Scope implemented

`/control` is a separate React route and shell under the existing authenticated CMS application. It does not import the previous dashboard, sidebar, or page editor. The previous `/app` routes remain available while the replacement is built and verified.

The V2 frontend reads `/admin/v2/pages`, `/admin/v2/content/:documentKey`, and `/admin/v2/releases`. The backend catalog derives its rows from the developer owned `CMS_V2_PAGE_DEFINITIONS` registry and reads each document's actual draft and published revision pointers. The UI contains no sample metrics or invented page records.

The current editor displays the real public page in an iframe and edits the approved structured content document in a separate inspector. It supports autosave, manual save, undo and redo for the current session, SEO fields, a revision list, revision restore, and content release creation. The iframe currently shows the public version. It does **not** render draft content or offer canvas selection or resize. This is visible in the editor itself.

The backend's existing CMS V2 service stores immutable content revisions in PostgreSQL and writes release artifacts under `public-content/`. The current public hydration adapter is a disabled Lake Aviation pilot. Creating a CMS content release is **not yet equivalent to updating the deployed public site**. Public deployment and preview delivery must be connected before the new route replaces `/app` as the default landing page.

## Boundaries

- Authentication and CMS administrator authorization are enforced by backend session guards. The React guard only controls navigation.
- The old CMS remains intact and accessible for operations not yet ported.
- No public HTML, styles, assets, or URLs were changed in this milestone.
- No database migration was added in this milestone.
- Media links currently lead to the previous CMS media workspace. Navigation and global reference editing are incomplete and labelled accordingly.

## Next implementation gates

1. Draft capable actual website preview and safe field to DOM mapping on all registered pages.
2. Structured section and component composition with layout schema, responsive overrides, and real public rendering.
3. First class navigation, global data reference graph, and media workspaces.
4. Durable public release storage and deployment invalidation, followed by migration and visual parity checks.
5. Security, accessibility, browser, database, and production delivery gates before default routing changes.
