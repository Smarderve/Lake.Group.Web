# Public Data Migration Map

## Authoritative Model

The existing Prisma schema represents the audited public domains without a
second database:

- Company links to category, headquarters country, parent company, projects,
  products/services, leadership, contacts, facilities, news, CSR, history, and
  company relationships.
- Country contains regions; regions contain locations; locations contain
  facilities; facilities carry map category and coordinates.
- News links to category, company, project, author, and hero media.
- Page composes governed content blocks.
- Every governed entity has workflow state and an immutable version table.
- Metric stores key/value/unit, source, owner, consumers, effective date, and
  verification state.

No new business-content model is required for the resilient snapshot. A public
release is a materialized view generated from existing PUBLISHED records, not
an independent content database.

## Import Dependency Order

1. Metrics and content/map categories.
2. Countries and regions.
3. Companies.
4. Locations and facilities.
5. Projects and milestones.
6. Products/services and company relationships.
7. Media and folders.
8. News.
9. Leadership and timeline events.
10. Contacts, history, careers, CSR.
11. Pages and content blocks.

`backend/scripts/seed-content.js` implements this order with stable keys and
resolved foreign keys. Existing rows are skipped by default. `--force` is a
destructive administrative reseed and is not a routine deployment operation.

## Publication Mapping

| Backend public shape | Snapshot key | Primary public consumers |
| --- | --- | --- |
| `/metrics` | `entities.metrics` | all `[data-metric-key]` elements |
| `/companies` | `entities.companies` | services/company directories |
| `/countries`, `/regions`, `/locations`, `/facilities` | matching keys | network, station, geography pages |
| `/map` | `map` | operations map |
| `/projects` | `entities.projects` | projects and related company sections |
| `/news` | `entities.news` | news listing/article navigation |
| `/leadership` | `entities.leadership` | leadership directory/profile pages |
| `/contacts` | `entities.contacts` | contact and company pages |
| `/history-events` | `entities.history-events` | history/our-story |
| `/media` | `entities.media` | gallery and referenced images |
| `/career-listings`, `/csr-entries` | matching keys | careers/CSR |
| `/knowledge/facts` | `knowledge` | public assistant approved facts |

The snapshot keeps backend response shapes intact so the public renderers and
snapshot verifier use the same contract.
