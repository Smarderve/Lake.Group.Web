# Governed-Entity Pattern (Phases 3 & 4)

Every piece of corporate content on this platform is a **governed entity**:
it lives through `DRAFT → IN_REVIEW → APPROVED → PUBLISHED → ARCHIVED`, every
mutation is versioned (history is never overwritten), every mutation is
audited, and only `PUBLISHED` data is ever served publicly.

The workflow is implemented **once** and shared — a new entity never writes
bespoke draft/review/approve logic. Phase 3 proved the pattern with `Metric`;
Phase 4 applied it to all eight registry entities (Country, Region, Location,
Facility, Category, Company, ProductService, CompanyRelationship); Phase 5
applied it to all nine CMS entities (Page, ContentBlock, News, Project,
Leadership, Contact, HistoryEvent, CareerListing, CSREntry); Phase 6applied it to the media library (`Media`, full DRAFT→PUBLISHED lifecycle) and map
layers (`MapCategory`). Phase 7 added the governance layer AROUND the workflow:
review queues, reject, scheduled publishing, impact analysis, in-app
notifications, and a publication-event ledger.

---

## How it works

```
          create / edit (reopens)
   ┌──────────────┴──────────────┐
   │                             │
  DRAFT ──submit──▶ IN_REVIEW ──approve(≠submitter)──▶ APPROVED ──publish──▶ PUBLISHED
   ▲                             │                                              │
   └────────────────────────── archive (any status; optional dependency guard) ──┘
                                          │
                                    rollback (SUPER_ADMIN) → new PUBLISHED version
                                          │
                                          ▼
                              previous PUBLISHED snapshot restored
```

**Every mutation does three things, atomically in intent:**
1. Updates the entity row (status transition and/or field values).
2. Appends an immutable row to the entity's `<Entity>Version` table — a JSON
   snapshot of the entity's fields (`data`, plus any side-table ids via
   `snapshotExtra`), the new `status`, `changedBy` (server-side, from the
   session), `reason`, and `createdAt`.
3. Writes an `AuditLog` row: `{PREFIX}_CREATED|EDITED|SUBMITTED|APPROVED|
   PUBLISHED|UNPUBLISHED|ROLLED_BACK|ARCHIVED` with `previousData` → `newData`
   snapshots, status transitions, actor id, and reason.

**Rules enforced everywhere (shared, not per entity):**
- Only `PUBLISHED` rows are readable publicly (`/api/public/:entity[/:id]`),
  and only when the entity's `publicVisible` hook passes — News hides items
  whose `publicationDate` is still in the future (scheduling), Contacts hide
  when `publicDisplay: false`, CareerListings hide unless `listingStatus:
  OPEN`. The PUBLISHED filter and the hooks are enforced server-side in the
  public router; a client can never reach draft/in-review/archived data.
- Approval requires a role of `REVIEWER`+ **and** the approver must differ
  from the submitter (separation of duties, enforced from the latest
  `IN_REVIEW` version's `changedBy`).
- Rollback restores the most recent previously-PUBLISHED snapshot as a *new*
  PUBLISHED version — nothing is rewritten. For entities with side tables
  (Page blocks, HistoryEvent companies) the snapshot includes the join ids,
  so rollback restores composition too, not just scalar fields.
- `POST /:id/unpublish` (PUBLISHED → DRAFT) pulls a record off the public
  surface and reopens a change cycle — used for News take-downs.
- Every mutation requires an authenticated session authenticated within the
  recent-auth window (default 15 min).

---

## Files

| File | Role |
|---|---|
| `src/lib/governed.js` | The generic workflow: `createGoverned`, `editGoverned`, `submitGoverned`, `approveGoverned`, `publishGoverned`, `unpublishGoverned`, `rollbackGoverned`, `archiveGoverned`, `findGoverned`, `pickFields`. |
| `src/lib/registry-config.js` | One entry per Phase 4 registry entity. |
| `src/lib/cms-config.js` | One entry per Phase 5 CMS entity (adds side-table hooks + `publicVisible`). |
| `src/lib/map-config.js` | One entry per Phase 6 entity (media, map-categories). |
| `src/lib/media-usage.js` | Phase 6 usage tracking: hooks factory for media-bearing entities, `MEDIA_IN_USE` archive guard, uploader injection. |
| `src/lib/governed-registry.js` | Phase 7: all governed entity configs merged (route → config, model → config) + `labelOf`. |
| `src/lib/publisher.js` | Phase 7: `promoteDueScheduled` — lazy scheduled publishing (no cron). |
| `src/lib/notify.js` | Phase 7: in-app notifications (role-scoped + user-targeted). |
| `src/lib/impact.js` | Phase 7: impact analysis — current vs pending diff + dependent entities. |
| `src/routes/governed.js` | `governedRouter(config)` — produces the full admin API for one entity. |
| `src/routes/children.js` | `childRouter(...)` — simple CRUD for non-governed child timelines (Milestone, LeadershipEvent) + the leadership `currentStatus` recompute. |
| `src/routes/media-usage.js` / `src/routes/media-folders.js` | Phase 6: `GET /admin/media/:id/usages` introspection; MediaFolder CRUD (not governed). |
| `src/routes/review-queue.js` / `src/routes/publish-schedules.js` / `src/routes/notifications.js` | Phase 7: cross-entity review queue; schedule list/cancel; in-app notifications. |
| `src/routes/public.js` | Published-only public reads (generic over the entity map, with visibility hooks). |
| `src/validators/registry.js` | Zod schemas for the registry + `transitionSchema` + `validationErrorBody`. |
| `src/validators/cms.js` | Zod schemas for the nine CMS entities, Media, and child resources. |

---

## Adding a new entity (Phase 5 recipe)

1. **Schema** (`prisma/schema.prisma`): add `model YourEntity { ... status GovernedStatus @default(DRAFT) ... }` plus
   `model YourEntityVersion { yourEntityId String, yourEntity YourEntity @relation(... onDelete: Cascade), data Json, status GovernedStatus, changedBy String?, reason String?, createdAt DateTime @default(now()), @@index([yourEntityId, createdAt]) }`.
   Generate the migration with `prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --script` (shadow DB handled by `prisma.config.ts`), save under `prisma/migrations/000N_*/migration.sql`, run `npm run db:migrate` + `npm run db:generate`.
2. **Validators**: `xxxCreateSchema` / `xxxUpdateSchema` (every create/edit requires `reason`; immutable identity fields — like `slug`, `isoCode`, `key` — are omitted from the update schema).
3. **Config** — add an entry to `registry-config.js` (Phase 4) or `cms-config.js` (Phase 5):
   ```js
   'your-entities': {
     entity: 'yourEntity',            // Prisma model name (db.<entity>)
     versionEntity: 'yourEntityVersion',
     fkField: 'yourEntityId',         // FK column on the version table
     route: 'your-entities',          // URL prefix (admin + public)
     prefix: 'YOUR_ENTITY',           // audit action prefix → YOUR_ENTITY_PUBLISHED
     label: 'Your entity',
     fields: ['name', '...'],         // snapshot field list
     createSchema, updateSchema,
     slugField: 'slug',               // optional: id-or-slug lookups + public slug match
     guardCreate, guardUpdate,        // optional async guards (see Company/Country)
     archiveGuard,                    // optional dependency guard (see Country)
     // Phase 5-only hooks (all optional):
     beforeCreate, afterCreate,       // side tables: resolve/validate join payload,
     beforeUpdate, afterUpdate,       //   write join rows with the new row id
     snapshotExtra,                   // include join ids in version snapshots
     afterRollback,                   // restore joins on rollback
     publicVisible,                   // extra public gate beyond PUBLISHED (scheduling,
   }                                  //   display flags, open/closed states)
   ```
   The router mounts automatically via the `app.js` loop over `REGISTRY_ENTITIES` / `CMS_ENTITIES` — **no route wiring needed**.
4. **Public projection**: `src/routes/public.js` `PUBLIC_ENTITIES` map — add `'your-entities': { model: 'yourEntity', lookupField: 'slug', visible }` (`lookupField` drives id-or-field single-record matching; `visible` is the `publicVisible` hook).

That's it — the full lifecycle, versioning, audit, RBAC, public read, unpublish,
and visibility hooks come for free.

## Non-governed extras

- **Child timelines** (`Milestone` under `Project`, `LeadershipEvent` under
  `Leadership`): timestamped events under a parent, not independently
  publishable — so they use `src/routes/children.js` `childRouter(...)`, which
  gives list/create/update/delete (hard delete is fine here; only governed
  entities are archive-only), audits every write, and supports an `afterWrite`
  hook. `LeadershipEvent` uses it to recompute the parent's derived
  `currentStatus` from the latest event (APPOINTED/PROMOTED/REPLACED → ACTIVE,
  DEPARTED → DEPARTED) — history is never erased.
- **MediaFolder** (Phase 6): organizational folders for the library — simple
  audited CRUD, never published.

## Governance & publishing (Phase 7)

- **Reject** — `POST /admin/:entity/:id/reject` (REVIEWER+, reason REQUIRED)
  sends an IN_REVIEW record back to DRAFT with an explanation; the resulting
  DRAFT version is attributed to the submitter (the audit row names the
  reviewer as actor), and the submitter is notified.
- **Review queue** — `GET /admin/review-queue` (REVIEWER+) aggregates every
  IN_REVIEW item, every APPROVED item awaiting publish, and every pending
  schedule across ALL governed entities + metrics in one place. The pull side
  of the workflow; notifications are the push side.
- **Scheduled publishing** — `POST /admin/:entity/:id/schedule { publishAt }`
  (EDITOR+, from APPROVED, future date) creates a `PublishSchedule`. The
  entity stays APPROVED (hidden publicly) until `publishAt`; **lazy
  promotion** (`src/lib/publisher.js`) publishes it on the next public read
  or review-queue fetch — no cron, no extra infrastructure. Rescheduling
  replaces the pending schedule; `POST /admin/publish-schedules/:id/cancel`
  (SUPER_ADMIN) cancels one.
- **Impact analysis** — `GET /admin/:entity/:id/impact` (and
  `GET /admin/metrics/:key/impact`) before publishing shows: the published
  snapshot, the pending in-flight snapshot, the field-by-field `diff`
  (`Employees 4,600+ → 4,850+`), and `references` — the dependent entities
  that consume the record (a metric's `consumers` list; a company's
  facilities/product-services/news/leadership; a media item's usages; a
  content block's pages; a map category's facilities; ...).
- **Notifications** — in-app only (self-hosted, no email/SMS): submit → every
  REVIEWER/SUPER_ADMIN except the actor; approve/reject/publish/scheduled-
  publish → the submitter. Read via `GET /admin/notifications` (unread
  first), `POST /admin/notifications/:id/read`, `POST /admin/notifications/read-all`.
- **Publication events** — a `PublicationEvent` ledger row is written on
  every PUBLISHED / SCHEDULED / UNPUBLISHED / ROLLED_BACK transition,
  separate from the AuditLog (which records all actions including drafts),
  so "when did this go live / when is it going live" is directly queryable.

## Media library & usage tracking (Phase 6)

`Media` is a governed entity like everything else (DRAFT → IN_REVIEW →
APPROVED → PUBLISHED → ARCHIVED, version rows, audit). Extra behaviors:

- **Replacement**: `PATCH /admin/media/:id` with a new `url`/`variants` reopens
  the cycle and keeps the **same id** — every surface referencing the media
  (by id) automatically shows the new file; the old URL stays in version
  history.
- **Usage tracking**: six media-bearing entities (`Company.logoMediaId`,
  `Leadership.photoMediaId`, `News.heroMediaId`, `Project.coverMediaId`,
  `HistoryEvent.imageMediaId`, `CSREntry.imageMediaId`) plug into
  `MediaUsage` via the `mediaUsageHooks(field, entityType)` factory in
  `src/lib/media-usage.js` — the same before/after hooks the pattern already
  supports, so usage rows follow creates, edits, and **rollbacks**
  automatically. `GET /admin/media/:id/usages` lists where a media item is
  used.
- **Archive protection**: a media item that is in use cannot be archived
  (`MEDIA_IN_USE`) — detach the referencing entities first, then archive.
  This keeps published surfaces from dangling under archived media.
- **Image optimization**: the `variants` JSON column stores optimized variant
  URLs (`thumb`/`medium`/… ) supplied by the upload pipeline. There is no
  server-side transcoding — that would require an external image service,
  which the platform deliberately avoids.

## Operations map (Phase 6)

`MapCategory` (map layers — name, slug, color, icon, sortOrder) is a governed
entity; archiving a layer still referenced by facilities is blocked
(`DEPENDENTS_EXIST`). `Facility` gained three map columns: `mapCategoryId`
(layer), `mapVisible` (default true), `markerLabel`. The public endpoint
`GET /api/public/map` assembles published countries → regions → locations →
facilities, with only `mapVisible` facilities that carry coordinates (own
`coordinates` string or inherited from their location). Markers are fully
database-driven — the frontend only renders this payload (Phase 8).

---

## Domain guards (Phase 4 examples)

- **Company parent cycle** (`guardUpdate`): walking up the parent chain from a
  proposed parent must never reach the company itself; self-parent is rejected
  (`INVALID_PARENT`).
- **CompanyRelationship self-link** (`guardCreate`/`guardUpdate`):
  `relatedCompanyId ≠ companyId` (`SELF_RELATIONSHIP`).
- **Country archive** (`archiveGuard`): archiving a Country with non-archived
  Regions is blocked (`DEPENDENTS_EXIST`) — chosen over cascading so published
  data never dangles under an archived parent; archive descendants first.

## Design decisions worth knowing

- **Version `data` is a JSON snapshot**, not per-field columns — generic enough
  for any entity while remaining diffable via `JSON.stringify` comparison
  (used by rollback). Phase 5 entities with side tables add the join ids via
  `snapshotExtra`, so rollback restores composition as well as fields.
- **No delete endpoint.** Governed entities are archived, never hard-deleted;
  version tables cascade-delete only if a row is removed manually. (Child
  resources are the exception — they are hard-deletable.)
- **Owner is not a column on registry entities** — ownership/trail is carried
  by `AuditLog.actorId` on every transition (Phase 3 `Metric` additionally has
  `ownerId` because it predates the shared pattern). `Media.uploadedBy` and
  `News.authorId` are set server-side from the session, never client input.
- **News scheduling is on-demand, not a cron**: a future `publicationDate`
  means the item is PUBLISHED in workflow but hidden by the public router's
  visibility hook until the date arrives. No scheduler to run or miss; the
  item simply becomes visible on the next read.
- **Nullable FKs**: media links (`logoMediaId` etc.) and `mapCategoryId` are
  nullable — sending `null` detaches the reference (needed to unblock media
  archiving), a string sets it, omitting leaves it unchanged.
- **Transitions are sequential awaits, not a DB `$transaction`** — a known
  hardening item if crash-atomicity matters (join writes, usage rows, and now
  notifications/publication events are the spots to watch first).
