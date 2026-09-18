# CMS V2 security — current milestone

The `/control` route uses the existing session restoration guard. All new data reads and mutations use `/admin/v2` routes guarded by `requireAuth` and `requireCmsAdmin`. The new page catalog uses the same guards. Draft saves are schema validated by the existing V2 content service and reject stale base revision IDs. The interface renders content through React text and form values; it does not inject CMS HTML into the page.

The public website iframe is a view of the deployed site and receives no draft payload. No public website runtime or script was changed in this milestone. Backend tests cover unauthorized access to the new catalog. Full CMS V2 threat testing remains required before production readiness.
