# CMS V2 security — current milestone

The `/control` route uses the existing session restoration guard. All new data reads and mutations use `/admin/v2` routes guarded by `requireAuth` and `requireCmsAdmin`. The new page catalog uses the same guards. Draft saves are schema validated by the existing V2 content service and reject stale base revision IDs. The interface renders content through React text and form values; it does not inject CMS HTML into the page.

The page source endpoint accepts only keys in the closed page registry and fetches from a configured HTTPS public site origin. The backend checks the destination with the existing SSRF guard, refuses redirects and non-HTML responses, and caps accepted HTML. The editor removes scripts and in-page CSP/refresh meta tags from the copied page before rendering a sandboxed `srcdoc` iframe without script permission. It applies approved draft fields through DOM text and image properties, not HTML insertion. The opt-in public pilot reader now resolves only CMS V2 artifact paths and remains disabled. Backend tests cover unauthorized access to the catalog and source endpoint. Full CMS V2 threat testing remains required before production readiness.

CMS V2 release files use their own namespace. Replacing a pointer belonging to the older public snapshot format fails closed with `RELEASE_NAMESPACE_CONFLICT`.

Release validation runs on the backend even after the editor review. It blocks unsafe or ambiguous public destinations and refuses a stale revision, so client-side UI state cannot bypass the release gate.
