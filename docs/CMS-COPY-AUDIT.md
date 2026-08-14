# CMS Copy Audit

Audit of every visible text surface against the Anti-AI-Copy directive (write like a
Lake Group product team member, not an AI assistant). Run: full source sweep across
`cms/src` (page headers, descriptions, buttons, alerts, empty/error/success states,
dialogs, placeholders).

Severity: **P0** = explicitly banned pattern / technical jargon in an employee surface ·
**P1** = generic or marketing-sounding copy · **P2** = minor wording nit.

## Findings and fixes

| Page | Section | Current text | Problem | Fixed text | Reason |
|---|---|---|---|---|---|
| Dashboard | Page header | `Welcome back, {name}` | P0 — banned greeting, marketing tone | `Dashboard` | Directive §16: no motivational greeting; title the working area |
| Dashboard | Page header | `Here's what's happening across Lake Group's digital content.` | P0 — banned "Here's what's happening" pattern | `Review current content activity and items that need attention.` | Directive §4/§16: task-oriented one-sentence description |
| Dashboard | Needs Attention card | `Items that require your action.` | P2 — fine, kept | (kept) | Short and factual |
| Dashboard | Empty states | `Nothing waiting on you` / `Pending reviews, approvals and scheduled publications will appear here.` | P2 — acceptable | (kept) | Describes actual state; not promotional |
| Placeholder | Page header | `This section is scaffolded and will be implemented in a later phase.` | P0 — "scaffolded", engineering voice | `This section is not built yet.` | Employee language; says what is true |
| Placeholder | Empty state | `{title} is coming soon` | P1 — launch-site phrase | `{title} is not available yet` | Factual empty state (§9) |
| Placeholder | Empty state | `The API contract for this area is mapped in docs/CMS-API-MAP.md; the feature screens are built in the next phases.` | P0 — technical jargon ("API contract") in employee surface | `The screens for this section are built in a later phase.` | Directive §5: no technical terms outside admin areas |
| Media editor | Info alert | `No upload endpoint yet` / `The backend does not accept file uploads yet — it records media by URL. Paste the address of an already-hosted file below. Uploading files from the CMS is a backend task (multipart → storage → URL).` | P0 — backend jargon, "multipart → storage → URL" | `File upload is not available yet` / `Add the web address of an existing file instead. Uploading files from the CMS is planned for a later phase.` | Employee language; explains the actual consequence |
| Media editor | URL field hint | `Address of the hosted file — the backend has no upload endpoint.` | P0 — jargon | `Web address of the file.` | Same |
| Media editor | Variants hint | `JSON of named URLs, e.g. { "thumb": "…", "original": "…" }` | P2 — technical but the field is genuinely JSON | (kept — field is a raw JSON column) | Accurate label for a real admin field |
| Scheduled Publishing | Page header | `Upcoming publications across every content type. The backend executes them — this page reads and cancels.` | P0 — jargon ("backend executes", "reads and cancels") | `Upcoming publications across every content type.` | Directive §5 |
| Scheduled Publishing | Cancel toast | `The entity stays approved — publish or reschedule it when ready.` | P1 — "entity" is data-model language | `The item stays approved — publish or reschedule it when ready.` | Directive §5 |
| Scheduled Publishing | Cancel dialog | `The entity stays approved — you can publish or reschedule it later.` | P1 — same | `The item stays approved — you can publish or reschedule it later.` | Same |
| Review detail | Action note | `Actions require a recent sign-in (15 minutes) and the reviewer role — the backend enforces both.` | P0 — jargon ("backend enforces") | `Actions require a recent sign-in (15 minutes) and the reviewer role.` | Directive §5 |
| Review detail | Schedule dialog | `Pick a future time — the backend executes the publication lazily when that moment arrives.` | P0 — jargon | `Pick a future time to publish it. Scheduling again replaces this pending schedule.` | Same |
| Review detail | Empty state | `The full diff is available to editors; the submission itself is intact.` | P1 — "diff" is developer language | `Change details are available to editors; the submission itself is intact.` | Same |
| Drafts | Page header | `Submit an item into the review pipeline, or open it in its editor.` | P2 — "review pipeline" | `Submit an item for review, or open it in its editor.` | Simpler, task-named |

## Audited and kept (no change needed)

- **Companies** — `Manage Lake Group companies and subsidiaries.` (directive §17 example)
- **Products & Services** — `Manage the products and services Lake Group companies offer.`
- **Leadership** — `Manage Lake Group leadership — profiles, appointment timelines and publishing.` (specific, not "Manage leadership and their information")
- **News** — `Manage news articles across the Lake Group network.`
- **Media Library** — `Browse, search and manage the images and documents behind Lake Group's content.`
- **Media Folders** — `Organize media into folders — folders are organizational and are never published.`
- **Media detail** — archive confirm: `This removes the item from the published site and closes its workflow. This cannot be undone from the CMS.` (directive §14 style)
- **Review Queue** — `Approve or request changes on content awaiting review, then publish what's ready.`
- **Published Content** — `Everything currently live on the public site, across every content type. Unpublish to pull an item back into drafts.`
- **Geographic registry** (Countries / Regions / Locations / Facilities) — each description names its actual tier in the hierarchy; no repetition.
- **Login** — `Use your Lake Group account to manage content.` / `Enter the 6-digit code from your authenticator app`
- **Unauthorized** — `Your role does not include the permissions this section requires. Contact a Lake Group administrator if you believe this is a mistake.`
- **Not found** — `The page you're looking for doesn't exist or you may not have access to it.`
- Empty states throughout collections: `No companies found.` / `No articles match your filters.` style (directive §9)
- Toasts: `Company saved.`, `Changes saved`, `Approved`, `Published`, `The item moved to APPROVED.` — short factual confirmations (§11)
- Buttons: `Add Company`, `Create Article`, `Save Draft`, `Submit for Review`, `Approve`, `Request changes`, `Publish now`, `Schedule`, `Archive`, `Cancel`, `Preview` (§8)

## Checks passed

- No banned phrases (`Welcome back`, `Here's what's happening`, `Let's get started`, `Stay on top`,
  `Take control`, `Streamline`, `Seamlessly`, `Unlock`, `powerful workspace`, etc.) remain — grep
  sweep confirmed.
- No repetition of the `Manage X and their information.` template.
- No invented statistics, names, dates, or success claims anywhere in visible copy.
- Technical terms (`API`, `backend`, `endpoint`, `database`, `schema`, `payload`, `middleware`) now
  appear only in code comments and internal docs, not in visible UI strings.

## Re-audit check

Run `grep -riE "(welcome back|happening across|manage all your|one place|let's get started|you're all set|great work|streamline|seamless|unlock|take control|endpoint|backend|api contract)" cms/src` and expect zero hits in user-visible strings.
