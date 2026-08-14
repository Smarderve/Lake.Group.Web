# CMS API Contract Map

**Deliverable:** CMS Implementation Specification Phase 0 — repository and backend reconnaissance.
**Source of truth:** the running `backend/` (verified against the live server on `:4000`, 2026-08-12). Every endpoint below exists in `backend/src/` — nothing is invented.
**Reading this doc:** the CMS consumes the **admin** surface (`/admin/*`, `/auth/*`) for management and the **public** surface (`/api/public/*`) for previews. The backend enforces all authorization and workflow rules; the CMS only decides what to render.

---

## 1. Base facts

| Item | Value |
|---|---|
| API base (admin/auth) | `http://<host>:4000` (configurable via `VITE_API_BASE_URL`) |
| Public base | `http://<host>:4000/api/public` |
| Transport | JSON over HTTP, cookie sessions (cookie name `lakegroup.sid`) |
| Auth | session cookie + optional TOTP MFA (two-step login) |
| CORS | `*` on `/api/public/*` (credential-less); exact credentialed `CMS_ALLOWED_ORIGINS` on `/auth`, `/admin`, and `/health`; unknown preflights denied |
| Roles | `SUPER_ADMIN`, `EDITOR`, `REVIEWER`, `CONTACT_MANAGER`, `VIEWER` (source: `backend/src/validators/auth.js` `ROLES`) |
| DB | PostgreSQL via Prisma (`backend/prisma/schema.prisma`) |

### Authentication model

- Login writes a session cookie. `POST /auth/login` returns `{ user }` or `{ mfaRequired: true }` when the account has MFA; the second step is `POST /auth/mfa/verify` with the TOTP code.
- Every `/admin/*` and `/auth/me` request must carry the session cookie. Unauthenticated → `401 UNAUTHENTICATED`; insufficient role → `403 FORBIDDEN`; stale recent-auth window on privileged mutations → `403 REAUTH_REQUIRED`.
- The backend reloads the user from the DB on every request, so deactivated accounts and role changes take effect immediately. The CMS must treat a 401 as "session expired" and redirect to `/login`; treat 403 as "not allowed" (hide the action too, but never rely on hiding).
- Cross-origin CMS requests receive `Access-Control-Allow-Origin` only for an exact configured origin plus `Access-Control-Allow-Credentials: true`. Production requires every HTTPS `CMS_ALLOWED_ORIGINS` entry to also appear in `CSRF_ALLOWED_ORIGINS`; CORS and CSRF remain independent controls. The public API keeps wildcard CORS and never enables credentials.

### Error format (every endpoint)

```json
{ "error": { "code": "CODE", "message": "Human message", "details": [ { "path": "field.path", "message": "..." } ] } }
```

`details` is present only on validation failures. Known codes: `VALIDATION_ERROR` (400), `UNAUTHENTICATED` (401), `INVALID_CREDENTIALS` (401), `INVALID_MFA_CODE` (401), `FORBIDDEN` (403), `REAUTH_REQUIRED` (403), `CORS_ORIGIN_DENIED` (403 preflight), `NOT_FOUND` (404), `INVALID_STATE` (409), `DEPENDENTS_EXIST` (409), `INVALID_PARENT` (400), `SELF_RELATIONSHIP` (400), `ROLE_SELF_CHANGE` (400), `LAST_SUPER_ADMIN` (409), `WEAK_PASSWORD` (400), `PAYLOAD_TOO_LARGE` (413), `SERVICE_UNAVAILABLE` (503), `INTERNAL_ERROR` (500, generic message only).

### Pagination conventions

- **Admin lists:** `?limit=` (1–100, default 50) + `?offset=` (≥ 0, default 0). Response includes `{ total, limit, offset }` alongside the rows (see `GET /admin/audit-log`, `GET /admin/unanswered-questions`).
- **Public lists:** `?limit=` (1–100) + `?offset=` (0–10000), optional — absent = uncapped. Malformed values → 400.
- **Governed-entity admin lists and most small tables are currently uncapped** (small content tables). The CMS should always pass explicit `limit`/`offset` on the two capped endpoints and treat governed lists as full (paginate client-side if needed until backend caps land).

---

## 2. Public API — `GET /api/public/...` (no auth)

Cross-origin read surface for the public website and CMS previews. Only `PUBLISHED` records, filtered through per-entity visibility hooks (news `publicationDate`, contact `publicDisplay`, career listing `OPEN`). `status`/`createdAt` are stripped from list rows; `updatedAt` stays.

| Route | Returns |
|---|---|
| `GET /map` | operations map: `{ categories, countries[] }` — countries → regions → locations → facilities (map-visible, coordinate-bearing) |
| `GET /knowledge/facts` | `{ facts[], generatedAt }` — structured fact bundle for the assistant |
| `GET /metrics/:key` | `{ metric }` for a PUBLISHED metric by key; 404 when none |
| `GET /:entity` | list — entities: `countries`, `regions`, `locations`, `facilities`, `categories`, `companies`, `product-services`, `company-relationships`, `pages`, `content-blocks`, `news`, `projects`, `leadership`, `contacts`, `history-events`, `career-listings`, `csr-entries`, `map-categories`, `media` |
| `GET /:entity/:idOrSlug` | single record — matched by `id` **or** a per-entity lookup field (`name`, `slug`, `jobTitle`, `title`, `key`…); `media` and `company-relationships` are id-only |

**Response key is the Prisma model name**, not the route: e.g. `GET /api/public/news` → `{ news: [...] }`, `product-services` → `{ productService: [...] }`, `content-blocks` → `{ contentBlock: [...] }`, `csr-entries` → `{ cSREntry: [...] }`, `career-listings` → `{ careerListing: [...] }`.

**Formatting transforms (important for CMS preview):**
- `news` rows: `categoryId`/`heroMediaId` removed; `category` (name) and `bannerImage` (hero media url) added.
- `facilities` rows: `location`/`company` flattened to `locationName` + `companyName`; `address` = location name.
- `contacts` rows: internal verification-workflow + sort fields stripped.
- `media` rows: `uploadedBy`, `folderId`, `storageProvider`, `storageKey`,
  `status`, and `createdAt` stripped (gallery shape only).

**Writes on the public surface (both POST, rate-limited, no auth):**

| Route | Body | Returns |
|---|---|---|
| `POST /analytics/events` | analytics event (best-effort; invalid dropped) | `201 { ok, id }` or `400` |
| `POST /assistant/unanswered` | `{ question (1–500), language (2–3 letters, optional), page (≤200, optional) }` | `201 { ok }` |

### Authenticated preview

`GET /admin/preview/:entity/:id` requires a current CMS session and returns
the selected draft/review/published record in the exact field shape the public
API will use after publication:

```json
{
  "preview": {
    "route": "news",
    "entity": "news",
    "status": "DRAFT",
    "publiclyVisible": false,
    "visibilityReason": "DRAFT content is not public",
    "publicPath": "/api/public/news/example-slug",
    "record": {}
  }
}
```

It supports every public governed entity plus `metrics`. Responses are
`Cache-Control: private, no-store` and `X-Robots-Tag:
noindex, nofollow, noarchive`; unlike `/api/public/*`, this route has no public
CORS allowance. The `record` omits governance-only fields and applies the same
news/facility/contact/media formatters as the public route. The public route
continues to return 404 for drafts, review-state content, archived content, and
records blocked by entity visibility rules.

---

## 3. Auth API — `/auth/*`

| Route | Method | Auth | Body / Notes | Returns |
|---|---|---|---|---|
| `/login` | POST | — | `{ email, password }`; rate-limited | `{ user }` or `{ mfaRequired: true }` |
| `/mfa/verify` | POST | pending session (login step 2) **or** authenticated (MFA setup) | `{ code }` (6 digits); rate-limited | `{ user }` |
| `/mfa/setup` | POST | ✔ | — | `{ secret, otpauthUrl, qrCodeDataUrl }` (secret returned once) |
| `/logout` | POST | ✔ | — | `{ ok: true }` |
| `/me` | GET | ✔ | — | `{ user }` — session-restore endpoint; 401 when expired |
| `/change-password` | POST | ✔ | `{ currentPassword, newPassword }` | `{ ok: true }`; revokes other sessions |
| `/sessions` | GET | ✔ | — | `{ sessions: [{ sid, ip, userAgent, since, current }] }` |
| `/sessions/:sid` | DELETE | ✔ | — | `{ ok: true }` (never the current session) |
| `/revoke-sessions` | POST | ✔ | — | `{ ok: true, revokedSessions }` |

`publicUser(user)` shape (what the CMS sees): `{ id, email, name, role, active, mfaEnabled, createdAt, updatedAt }` — **never** `passwordHash`/`mfaSecret`.

---

## 4. Governed entity API — the content workflow core

**20 governed entities**, each served by the same generic router (`backend/src/routes/governed.js`) mounted at `/admin/:route`:

| Group | Routes (admin) | Model |
|---|---|---|
| Registry (Phase 4) | `countries`, `regions`, `locations`, `facilities`, `categories`, `companies`, `product-services`, `company-relationships` | country, region, location, facility, category, company, productService, companyRelationship |
| CMS core (Phase 5) | `pages`, `content-blocks`, `news`, `projects`, `leadership`, `contacts`, `history-events`, `career-listings`, `csr-entries` | page, contentBlock, news, project, leadership, contact, historyEvent, careerListing, cSREntry |
| Map & media (Phase 6) | `media`, `map-categories` | media, mapCategory |

**Workflow state machine (backend-enforced):**

```
DRAFT ──submit──▶ IN_REVIEW ──approve──▶ APPROVED ──publish──▶ PUBLISHED ──archive──▶ ARCHIVED
   ▲                 │                      │                                            │
   └──reject─────────┘                      └──schedule──▶ (publishSchedule)            │
   ▲                                        PUBLISHED ──unpublish──▶ DRAFT               │
   └─────────── edit (reopens to DRAFT) ◀────────────────────────────────────────────────┘
```

**Generic endpoints** (auth + role-gated, privileged mutations also require recent-auth):

| Method | Path | Role | Body | Returns |
|---|---|---|---|---|
| GET | `/admin/:route` | any auth | — | `{ [route]: rows[] }` (all statuses) |
| GET | `/admin/:route/:id` | any auth | — | `{ [entity]: row, versions[] }` (version history ascending) |
| POST | `/admin/:route` | EDITOR+ | create schema + `reason` | `201 { [entity]: row }` (lands DRAFT) |
| PATCH | `/admin/:route/:id` | EDITOR+ | update schema + `reason` | `{ [entity]: row }` (reopens DRAFT) |
| POST | `/admin/:route/:id/submit` | EDITOR+ | `{ reason? }` | `{ [entity]: row }` |
| POST | `/admin/:route/:id/approve` | REVIEWER+ | `{ reason? }` | `{ [entity]: row }` (approver ≠ submitter) |
| POST | `/admin/:route/:id/reject` | REVIEWER+ | `{ reason }` (required) | `{ [entity]: row }` |
| POST | `/admin/:route/:id/publish` | REVIEWER+ | `{ reason? }` | `{ [entity]: row }` |
| POST | `/admin/:route/:id/unpublish` | REVIEWER+ | `{ reason? }` | `{ [entity]: row }` (PUBLISHED → DRAFT) |
| POST | `/admin/:route/:id/schedule` | EDITOR+ | `{ publishAt (future), reason? }` | `{ [entity]: row }` |
| POST | `/admin/:route/:id/rollback` | SUPER_ADMIN | `{ reason? }` | `{ [entity]: row }` (restores last published snapshot) |
| POST | `/admin/:route/:id/archive` | SUPER_ADMIN | `{ reason? }` | `{ [entity]: row }` |
| GET | `/admin/:route/:id/impact` | EDITOR+ | — | impact diff + dependents |

**Per-entity create/update fields** (all require `reason`; immutable identity fields — `isoCode`, `slug`, `key`, `url`-side notes — are create-only via the update schema omitting them):

- **countries**: `name`, `isoCode` (2–3 upper), `regionGrouping?` — update omits isoCode. Archive blocked while regions exist (409 DEPENDENTS_EXIST).
- **regions**: `name`, `countryId`.
- **locations**: `name`, `regionId?`, `countryId?` (at least one), `latitude?` (−90..90), `longitude?` (−180..180), `type?` (≤60).
- **facilities**: `name`, `locationId`, `companyId`, `category?`, `coordinates?` ("lat,lng" string ≤120), `operationalStatus?`, `mapCategoryId?` (null clears), `mapVisible?`, `markerLabel?` (≤80).
- **categories**: `name`, `description?` (≤500).
- **companies**: `name`, `slug` (create-only), `description?` (≤2000), `logo?` (≤500), `logoMediaId?` (nullable), `parentCompanyId?` (circular-parent guard 400 INVALID_PARENT), `categoryId?`, `headquartersCountryId?`, `foundedDate?` (date), `website?` (≤300).
- **product-services**: `name`, `description?` (≤1000), `companyId`, `categoryId?`.
- **company-relationships**: `companyId`, `relatedCompanyId`, `relationshipType` (`SUBSIDIARY_OF | PARTNER_OF | JOINT_VENTURE_WITH | OTHER`); self-relationship guard.
- **pages**: `slug` (create-only), `title`, `layoutType?`, `contentBlocks?` (array of **block keys**, joined server-side via pageContentBlock), `metaTitle?` (≤160), `metaDescription?` (≤320).
- **content-blocks**: `key` (create-only, `[a-z0-9-]`), `type` (`RICHTEXT | STAT_HIGHLIGHT | QUOTE | CALLOUT`), `content` (JSON object).
- **news**: `title`, `slug` (create-only), `body`, `authorId?` (defaults to session user), `categoryId?`, `relatedCompanyId?`, `relatedProjectId?`, `publicationDate?` (future = scheduled), `heroMediaId?` (nullable), `metaTitle?`, `metaDescription?`.
- **projects**: `title`, `companyId?`, `locationId?`, `sector?`, `startDate?`, `endDate?`, `description?` (≤4000), `impact?` (≤4000), `coverMediaId?` (nullable).
- **leadership**: `name`, `position`, `bio?` (≤4000), `photo?`, `photoMediaId?` (nullable), `order?` (int), `companyId?`.
- **contacts**: `name`, `type` (`HR | MARKETING | SUPPORT | CORPORATE | COMPANY_SPECIFIC`), `companyId?`, `locationId?`, `phone?`, `email?`, `publicDisplay?`, `order?`, `verificationStatus?` (`UNVERIFIED | VERIFIED`), `verificationDate?`.
- **history-events**: `title`, `date`, `endDate?`, `description?` (≤4000), `imageMediaId?` (nullable), `order?`, `companyIds?` (join table).
- **career-listings**: `jobTitle`, `department?`, `companyId?`, `locationId?`, `description?`, `requirements?`, `employmentType?`, `postedDate?`, `closingDate?`, `listingStatus?` (`OPEN | CLOSED`).
- **csr-entries**: `title`, `description?` (≤4000), `category?` (≤80), `imageMediaId?` (nullable), `companyId?`, `date?`, `period?` (≤80).
- **media**: `url` (absolute HTTP(S), ≤500), `altText?` (≤300), `caption?` (≤500), `mimeType?`, `sizeBytes?` (int ≥0), `width?`/`height?` (positive ints), `copyright?`, `license?`, `tags?` (≤20 strings ≤60), `variants?` (record whose values are absolute HTTP(S) URLs), `folderId?`. Executable schemes such as `javascript:`/`data:` are rejected. Archive blocked while referenced (409 DEPENDENTS_EXIST).
- **map-categories**: `name`, `slug` (create-only), `description?`, `color?` (`#RRGGBB`), `icon?`, `sortOrder?`. Archive blocked while facilities reference it.

**Version history:** every governed entity has a `{entity}Version` model; `GET /:id` returns the full ascending history. Each version row carries `status`, `changedBy`, `reason`, `createdAt`, and the snapshot fields. Rollback restores the previous **published** snapshot (snapshot extras for page blocks / history companies re-applied).

---

## 5. Child resources — `/admin/:parentRoute` (simple audited CRUD, no workflow)

| Path | Model | Fields |
|---|---|---|
| `GET/POST /admin/projects/:projectId/milestones` | milestone | `title`, `date`, `description?` (≤2000) |
| `PATCH/DELETE /admin/projects/:projectId/milestones/:id` | milestone | same |
| `GET/POST /admin/leadership/:leadershipId/events` | leadershipEvent | `eventType` (`APPOINTED | PROMOTED | REPLACED | DEPARTED`), `date`, `notes?` (≤1000) |
| `PATCH/DELETE /admin/leadership/:leadershipId/events/:id` | leadershipEvent | same |

EDITOR+ for writes; parent must exist (404). Delete → `204` (hard delete — children are not governed). Adding a `DEPARTED` event flips the leader's `currentStatus` to `DEPARTED` server-side.

---

## 6. Metrics — `/admin/metrics/*`

Own workflow (DRAFT → IN_REVIEW → APPROVED → PUBLISHED → ARCHIVED via the same transitions) with an extra **verification** axis (`verificationStatus`/`verificationDate`, stale flag). Roles: create/edit/submit EDITOR+; approve/publish/verify REVIEWER+ (verifier = EDITOR/REVIEWER/SUPER_ADMIN); rollback SUPER_ADMIN.

| Route | Method | Returns |
|---|---|---|
| `/admin/metrics` | GET | `{ metrics: [{ key, label, value, unit?, owner?, source?, verificationStatus, verificationDate?, verificationNote?, effectiveDate?, status, updatedAt, owner: { email } }] }` |
| `/admin/metrics/stale` | GET | `{ staleDays, count, metrics[] }` |
| `/admin/metrics/:id` | GET | `{ metric, versions[] }` (id **or** key lookup) |
| `/admin/metrics/:id/impact` | GET | pending vs published diff + consumers |
| `/admin/metrics` | POST | create → DRAFT, `201 { metric }` |
| `/admin/metrics/:id` | PATCH | edit → DRAFT |
| `/admin/metrics/:id/submit` `/approve` `/publish` `/rollback` | POST | transitions, `{ metric }` |
| `/admin/metrics/:id/verify` | POST | record verification (body: `{ verificationStatus, verificationNote?, verificationDate? }`), `{ metric }` |

---

## 7. Workflow surfaces

| Route | Method | Auth | Returns / Notes |
|---|---|---|---|
| `/admin/review-queue` | GET | REVIEWER+ | `{ inReview: [{ entityType, route, id, label, submitterId, submitterEmail, submittedAt }], approvedAwaitingPublish: [{ entityType, route, id, label }], scheduled: [{ id, entityType, entityId, publishAt, createdBy }] }` — includes metrics; due schedules promoted before the read |
| `/admin/publish-schedules` | GET | any auth | `{ schedules: [{ id, entityType, entityId, publishAt, label, entityStatus }] }` (PENDING only, soonest first) |
| `/admin/publish-schedules/:id/cancel` | POST | SUPER_ADMIN + recent | `{ schedule }`; 409 when not PENDING. Entity stays APPROVED |

---

## 8. Notifications — `/admin/notifications`

Server-written by the workflow (submit → reviewers; approve/reject/publish → submitter). Owner-scoped (cross-user → 404).

| Route | Method | Returns |
|---|---|---|
| `/admin/notifications` | GET | `{ notifications: [{ id, userId, type, message, entityType?, entityId?, read, createdAt }], unreadCount }` |
| `/admin/notifications/:id/read` | POST | `{ notification }` |
| `/admin/notifications/read-all` | POST | `{ markedRead }` |

---

## 9. Admin — `/admin/*` (SUPER_ADMIN + recent-auth unless noted)

| Route | Method | Returns / Notes |
|---|---|---|
| `/admin/ping` | GET | `{ ok, message, user }` — role probe |
| `/admin/users` | GET | `{ users: [publicUser] }` — email ascending |
| `/admin/users/:id/role` | PATCH | `{ user }`; 400 ROLE_SELF_CHANGE (no self-demotion), 409 LAST_SUPER_ADMIN (lockout guard) |
| `/admin/users/:id/password` | PATCH | `{ ok }`; revokes target sessions; policy-checked |
| `/admin/users/:id/revoke-sessions` | POST | `{ ok, revokedSessions }` |
| `/admin/unanswered-questions` | GET | `{ unansweredQuestions, total, limit, offset }` — capped (1–100 / ≥0) |
| `/admin/unanswered-questions/:id` | PATCH | `{ unansweredQuestion }` — body `{ answered?, answerNote? }` |
| `/admin/content-health` | GET | content-health report (stale metrics, unused media, dead links) |
| `/admin/analytics/summary` | GET | `?days=` (1–365, default 30) analytics summary |
| `/admin/audit-log` | GET | `{ entries, total, limit, offset }` — `?action=`, `?actorId=` filters; capped. Entry shape: `{ id, actorId?, action, resource, ip?, metadata, createdAt }` |

**Audit actions the CMS can render:** `LOGIN_SUCCESS`, `LOGIN_FAILED`, `LOGOUT`, `MFA_SETUP`, `MFA_ENABLED`, `MFA_FAILED`, `PASSWORD_CHANGED`, `PASSWORD_CHANGE_FAILED`, `SESSION_REVOKED`, `SESSIONS_REVOKED`, `ROLE_CHANGE`, `ROLE_CHANGE_DENIED`, `PASSWORD_RESET`, `SCHEDULE_CANCELLED`, `UNANSWERED_QUESTION_RESOLVED`, `MEDIA_FOLDER_CREATED/UPDATED`, `{ENTITY}_{CREATED/UPDATED/SUBMITTED/APPROVED/REJECTED/PUBLISHED/UNPUBLISHED/SCHEDULED/ROLLED_BACK/ARCHIVED}` (per governed entity prefix), `MILESTONE_*`, `LEADERSHIP_EVENT_*`.

---

## 10. Media folders — `/admin/media-folders`

Not governed (organizational). EDITOR+ for writes.

| Route | Method | Returns |
|---|---|---|
| `/admin/media-folders` | GET | `{ mediaFolders: [{ id, name, slug, parentId?, description?, sortOrder }] }` |
| `/admin/media-folders` | POST | `201 { mediaFolder }` — body `{ name, slug, parentId?, description?, sortOrder? }` |
| `/admin/media-folders/:id` | PATCH | `{ mediaFolder }` (slug immutable) |

Media usage introspection: `GET /admin/media/:id/usages` (auth) → `{ usages: [{ id, mediaId, entityType, entityId, field }] }`.

Binary storage:

| Route | Role | Contract |
|---|---|---|
| `POST /admin/media/uploads` | EDITOR+ | `multipart/form-data`: one `file`, required `reason`, optional `altText`, `caption`, `copyright`, `license`, comma-separated `tags`, `folderId`. Accepts verified JPEG/PNG/WebP/GIF/PDF bytes up to `MEDIA_UPLOAD_MAX_BYTES`; returns `201 { media }` in DRAFT. |
| `DELETE /admin/media/:id/upload` | SUPER_ADMIN + recent auth | Permanently deletes only a storage-managed, unused DRAFT upload and its media row; returns 204. Published/reviewed/in-use/external records return 409. |

The server ignores the submitted filename, verifies MIME from file signatures,
extracts image dimensions, generates the object key, and persists internal
`storageProvider`/`storageKey`. Those fields never enter the public media shape.

---

## 11. Health & dev

| Route | Returns |
|---|---|
| `GET /health` | `{ status: "ok", service, db: "up", uptimeSeconds, timestamp }` or 503 `degraded` |
| `GET /example/...` | **dev-only** — mounted only when `devEndpointsEnabled` (`NODE_ENV !== 'production'`). Not part of the CMS contract; do not call in production. |

---

## 12. Key conventions for the CMS service layer

1. **Response keys are Prisma model names**, not route names (`productService`, `cSREntry`, `careerListing`, `mapCategory`, `mediaFolder`, `historyEvent`, `contentBlock`, `companyRelationship`, `unansweredQuestion`).
2. **List responses nest rows under a plural key** (`companies`, `news`, `users`, `notifications`, `schedules`, `mediaFolders`, `unansweredQuestions`) or `{ [model]: [...] }` on the generic governed routes (`GET /admin/news` → `{ news: [...] }`).
3. **Governed mutations** return the single row under the singular model key; transitions return the same.
4. **Every governed create/update requires `reason`** (string ≥ 1) — the CMS editor must collect a change note.
5. **Dates** are ISO strings; the backend coerces `yyyy-mm-dd` and ISO datetimes.
6. **Role-gating summary for UI:** list/read = any authenticated; create/edit/submit/schedule = EDITOR+ (includes SUPER_ADMIN); approve/reject/publish/unpublish = REVIEWER+; rollback/archive = SUPER_ADMIN; admin users/audit/settings = SUPER_ADMIN; metrics verify = EDITOR/REVIEWER/SUPER_ADMIN. `CONTACT_MANAGER` and `VIEWER` currently have no distinct write powers — contact handling is EDITOR-level. Verify against `/auth/me` at runtime; never trust a stored role.
7. **Pagination caps:** pass `limit`/`offset` explicitly on `/admin/audit-log` and `/admin/unanswered-questions`; the rest of the admin lists are full-table today.

---

## 13. Verified against the live backend (2026-08-12)

- `GET /health` → `{ status: "ok", db: "up", ... }` ✔
- `GET /api/public/news` → `{ news: [{ id, title, slug, body, category, bannerImage, ... }] }` (formatter applied) ✔
- `GET /api/public/news?limit=999` → `400 { error: { code: "VALIDATION_ERROR", details: [{ path: "limit", message: "limit must be <= 100" }] } }` ✔
- `GET /api/public/nonexistent-entity` → `404 { error: { code: "NOT_FOUND" } }` ✔
- Admin/auth surfaces verified at the source (`backend/src/routes/*`, `middleware/auth.js`, `validators/*`) against this document item by item.

---

## 14. Feature → endpoint index (what the CMS screens call)

| CMS screen | Endpoint(s) |
|---|---|
| Login / MFA / logout / session restore | `/auth/login`, `/auth/mfa/verify`, `/auth/logout`, `/auth/me` |
| Dashboard KPIs | `/admin/analytics/summary`, `/admin/review-queue`, counts from the governed lists, `/admin/notifications` |
| Companies / Products / Leadership / Countries / Regions / Locations / Facilities / Projects / News / Pages / Content Blocks / Contacts / History / Careers / CSR | generic governed router on `/admin/<route>` (+ `/admin/:parent/children`) |
| Media Library | `/admin/media`, `/admin/media-folders`, `/admin/media/:id/usages` |
| Review Queue | `/admin/review-queue` |
| Scheduled Publishing | `/admin/publish-schedules`, `/admin/publish-schedules/:id/cancel` |
| Metrics | `/admin/metrics*` |
| Users & Roles | `/admin/users`, `/admin/users/:id/role`, `/admin/users/:id/password`, `/admin/users/:id/revoke-sessions` |
| Notifications | `/admin/notifications*` |
| Audit Log | `/admin/audit-log` |
| Preview | `/admin/preview/<entity>/<id>` (authenticated, any workflow state) + `/api/public/<entity>/<idOrSlug>` (published and publicly visible only) |

---

## 15. Resilient public release source

- `GET /api/public/metrics` returns the complete PUBLISHED metric collection
  used by the snapshot generator. Working copies and workflow state are
  excluded.
- Existing `GET /api/public/:entity`, `/map`, and `/knowledge/facts` routes are
  the remaining snapshot inputs.
- Visitors do not call these routes for public content. A trusted release job
  materializes them into `public-content/releases/<hash>/content.json`; the
  website reads the same-origin `public-content/current.json` manifest.
- `GET /admin/public-releases` requires authentication and returns the latest
  publication dispatch state (`PENDING`, `DISPATCHING`, `RETRY_SCHEDULED`,
  `TRIGGERED`, or `FAILED`) plus attempts/timestamps/request ID/sanitized error.
