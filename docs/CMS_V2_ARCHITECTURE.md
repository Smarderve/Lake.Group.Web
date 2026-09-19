# CMS V2 architecture — current milestone

## Scope implemented

`/control` is a separate React route and shell under the existing authenticated CMS application. It does not import the previous dashboard, sidebar, or page editor. The previous `/app` routes remain available while the replacement is built and verified.

The V2 frontend reads `/admin/v2/pages`, `/admin/v2/content/:documentKey`, and `/admin/v2/releases`. The backend catalog derives its rows from the developer owned `CMS_V2_PAGE_DEFINITIONS` registry and reads each document's actual draft and published revision pointers. The UI contains no sample metrics or invented page records.

The editor fetches registered public HTML through `/admin/v2/page-source/:documentKey` and renders it as a script-free `srcdoc` canvas. The composition renderer annotates and updates the real page sections, preserving the public markup and CSS. The canvas supports selection, double-click text editing, section drag reorder, horizontal span resize, viewport switching and generated insertion when a new section has no static counterpart. Layers and inspector use the same composition IDs.

The backend stores immutable content revisions in PostgreSQL and writes CMS V2 artifacts under `public-content/cms-v2/`. Composition, global data, media reference replacements, and navigation use the same validation, review, digest and release mechanisms. Multi-document draft changes use one database transaction.

## Boundaries

- Authentication and CMS administrator authorization are enforced by backend session guards. The React guard only controls navigation.
- The old CMS remains intact and accessible for operations not yet ported.
- No database migration was added in this milestone.
- The old `/app` CMS remains available; governed media records are reused rather than duplicated.

## Next implementation gates

1. Continue adding public adapters to the remaining registered pages after parity review.
2. Add uploaded preview thumbnails for reusable section templates.
3. Add a server-maintained reverse index when reference volume makes on-demand draft scanning too expensive.
