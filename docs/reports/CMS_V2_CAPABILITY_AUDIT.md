# CMS V2 capability audit

Checked against the current control center, backend routes, and the active sitemap on 2026-09-24. `COMPLETE` means the control exists and has a working path in the current CMS model; it does not mean the CMS changes production static HTML.

| Capability | Status | Evidence / remaining gap |
|---|---|---|
| Dashboard | COMPLETE | Draft changes and direct workspace actions. |
| Page catalog | COMPLETE | All 31 active sitemap routes are registered; six nonactive routes are excluded in the launch matrix. |
| Visual editor | PARTIAL | Live source page canvas, selection, inline text, and structured changes exist; representation is limited to extracted composition nodes. |
| Layers | COMPLETE | Synchronized structured node tree and selection. |
| Insert library | COMPLETE | Structured node insertion. |
| Content inspector | COMPLETE | Text, actions, and media fields for supported nodes. |
| Layout inspector | COMPLETE | Structured width, columns, spacing, alignment, and height controls. |
| Style inspector | COMPLETE | Supported style fields and background controls. |
| Responsive settings | COMPLETE | Desktop, tablet, and mobile overrides with previews. |
| Media manager | PARTIAL | Search, upload, metadata, usage links, and atomic replacement exist; legacy static HTML media are not governed CMS references. |
| Navigation manager | COMPLETE | Nested items, reorder, label, destination, visibility, and desktop/mobile preview. |
| Global Data Hub | PARTIAL | Canonical fields, reference discovery, selection, overrides, and atomic draft propagation exist; static public pages are not connected to this data. |
| Global Components | PARTIAL | Reusable structured instances can be synchronized; coverage depends on registered reusable keys. |
| SEO controls | COMPLETE | Title, description, canonical, image, indexability; Home noindex is blocked at review. |
| Social metadata | COMPLETE | OG title, OG description, social image. |
| Draft/autosave | COMPLETE | Revision based draft saving and editor autosave. |
| Undo/redo | COMPLETE | Editor session history. |
| History | COMPLETE | Revision and release lists. |
| Diff | COMPLETE | Structured composition change summary. |
| Restore | COMPLETE | Restore an old revision as draft; restore an immutable release through the backend route. |
| Preview | PARTIAL | Canvas uses the real static source page plus composition edits; complete production parity depends on adapter coverage. |
| Publish/release model | PARTIAL | Review and immutable CMS releases work; releases do not rewrite production static pages. |
| Backup/export | COMPLETE | Release snapshot JSON export. |
| Audit/system status | COMPLETE | Existing audit and system screens. |

The main launch boundary is deliberate: production pages remain static and independent of CMS/backend availability. The CMS stores and reviews structured drafts and releases, but it cannot truthfully promise that every static HTML text or image is directly editable and published into the live site. The route matrix establishes page registration and static safety, not full content parity.
