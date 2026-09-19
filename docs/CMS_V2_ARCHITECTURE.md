# CMS V2 architecture — current milestone

## Scope implemented

`/control` is a separate React route and shell under the existing authenticated CMS application. It does not import the previous dashboard, sidebar, or page editor. The previous `/app` routes remain available while the replacement is built and verified.

The V2 frontend reads `/admin/v2/pages`, `/admin/v2/content/:documentKey`, and `/admin/v2/releases`. The backend catalog derives its rows from the developer owned `CMS_V2_PAGE_DEFINITIONS` registry and reads each document's actual draft and published revision pointers. The UI contains no sample metrics or invented page records.

The editor fetches registered public page HTML through the authenticated `/admin/v2/page-source/:documentKey` endpoint and renders it as a script-free `srcdoc` canvas. This avoids the public site's frame restrictions while retaining its real HTML, CSS, and assets. It supports autosave, manual save, undo and redo for the current session, SEO fields, a revision list, revision restore, and content release creation. Lake Aviation has an initial explicit field-to-DOM mapping: hero and introduction text and hero image edits render in the canvas, and clicking a mapped field selects the inspector property. Other pages display the current public version and are labelled as awaiting field mapping. Section composition, canvas resize, and responsive property overrides remain incomplete.

The backend stores immutable content revisions in PostgreSQL and writes CMS V2 artifacts under the isolated `public-content/cms-v2/` namespace. Lake Aviation is the first connected public delivery pilot. A validated release creates a publication event, the existing worker dispatches the protected production workflow, and the workflow exports and verifies the V2 artifact before Vercel deployment. Other pages still require explicit field mapping and public adapters before their releases can affect the website.

## Boundaries

- Authentication and CMS administrator authorization are enforced by backend session guards. The React guard only controls navigation.
- The old CMS remains intact and accessible for operations not yet ported.
- No public HTML, styles, assets, or URLs were changed in this milestone.
- No database migration was added in this milestone.
- Media links currently lead to the previous CMS media workspace. Navigation and global reference editing are incomplete and labelled accordingly.

## Next implementation gates

1. Extend draft field mapping and safe canvas selection to all registered pages.
2. Structured section and component composition with layout schema, responsive overrides, and real public rendering.
3. First class navigation, global data reference graph, and media workspaces.
4. Durable public release storage and deployment invalidation, followed by migration and visual parity checks.
5. Security, accessibility, browser, database, and production delivery gates before default routing changes.
