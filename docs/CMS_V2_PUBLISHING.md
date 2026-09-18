# CMS V2 publishing — current milestone

Saving a page creates an immutable `ContentRevision` through `PUT /admin/v2/content/:key/draft` with optimistic revision matching. Creating a release calls `POST /admin/v2/releases` and stores a release record and snapshot artifact. The new snapshot carries forward verified documents from the current release, replacing only the selected document, so a later page release does not drop earlier published pages. A prior release can be restored over an existing draft as a new revision and release.

The public website still serves its static HTML. Its CMS V2 runtime adapter is disabled by default and only recognizes a Lake Aviation pilot. Filesystem release storage is not yet a durable cross deployment delivery channel, and concurrent releases across backend instances still need serialization. Operators must not assume a content release is live on Vercel. The editor says “Create release” rather than “Publish website” for this reason.
