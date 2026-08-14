# Public Business Data Audit

Phase 1 preserves the original website material as migration evidence. An
occurrence in HTML or a bundle is not automatically authoritative: after
publication it may be a generated static representation of a backend record.

| Domain | Migration source | Backend destination | Imported | Published | Public connection |
| --- | --- | --- | --- | --- | --- |
| Corporate metrics/statistics | tagged HTML values, verified-data document | `Metric` | yes | governed | metrics public shape |
| Companies/subsidiaries | `services.html`, company pages, verified data | `Company`, `Category`, relationships | yes | governed | companies |
| Countries/regions | network/map content | `Country`, `Region` | yes | governed | countries, regions, map |
| Locations/facilities | station locator and map markers | `Location`, `Facility`, `MapCategory` | yes | governed | locations, facilities, map |
| Projects/milestones | `projects.html` | `Project`, `Milestone` | yes | governed | projects |
| Products/services | company/service pages | `ProductService` | model ready; current dataset may be empty | governed | product-services |
| News | `assets/news-data.js` initial import bundle | `News` | yes | governed | news |
| Leadership/timeline | leadership directory/profile pages | `Leadership`, `LeadershipEvent` | yes | governed | leadership |
| Contacts/phones/emails/addresses | `contact.html` and public company content | `Contact` | yes | governed | contacts |
| History | `history.html`, `our-story.html` | `HistoryEvent` + company links | yes | governed | history-events |
| Gallery/media/images | gallery tiles and referenced assets | `Media`, media relationships | yes | governed URL records | media |
| Operations map coordinates | station/map marker data | `Facility.latitude/longitude`, locations | yes | governed | map |
| Careers | `careers.html` | `CareerListing` | yes | governed | career-listings |
| CSR | `csr.html`, sustainability content | `CSREntry` | yes | governed | csr-entries |
| Public page metadata | 47 root public HTML pages | `Page` | yes | governed | pages plus static HTML |
| Reusable page content | tagged static sections and map routes | `ContentBlock` | map routes imported; other blocks selective | governed | content-blocks |
| Documents/download links | page/media links | `Media` where governed; otherwise static asset | audited | URL-governed where applicable | media/static release |
| SEO title/description | HTML head; page/news SEO fields | `Page`, `News` where represented | partial by domain | published release | static HTML plus snapshot |
| Canonical/OG/structured data | HTML head/configuration | presentation/static release | not business DB data unless page-managed | release artifact | HTML |
| Sitemap/robots | `sitemap.xml`, `robots.txt`, build script | deployment configuration | n/a | release artifact | static edge |
| Navigation/legal/brand labels | templates and i18n dictionaries | legitimate presentation/static content | n/a | release artifact | HTML/JS |

## Source Locations Retained for Audit

- `backend/scripts/content-seed-data.js`: normalized initial migration source.
- `backend/scripts/seed-content.js`: relationship-aware importer.
- `backend/scripts/seed-metrics.js`: metric importer with verification fields.
- `assets/news-data.js`: original news migration bundle and generated static
  compatibility asset until all old renderers are removed.
- Root HTML and media files: the static published presentation and migration
  evidence.

## Classification Rule

- Backend/PostgreSQL records are authoritative business data.
- Versioned public JSON and rendered HTML are generated publication artifacts.
- i18n strings, navigation, accessibility labels, visual configuration, legal
  copy, and asset paths are legitimate static presentation data.
- Fixtures under tests are test-only.
- Any untagged business fact that cannot be traced to a backend record remains
  a migration item and must not be silently treated as a fallback fact.

## Final Audit (Phase 18)

- Runtime registry/news/metrics/map/assistant loaders read the published
  snapshot and make no live content API request.
- Static operations-marker and route-coordinate arrays were removed from
  `assets/africa-network-map.js`; marker data comes from facilities and route
  geometry from the governed `operations-map-routes` content block.
- Homepage globe points are derived from the published map. The remaining
  numeric camera position is valid presentation configuration.
- `assets/hero-globe.bundle.js` is generated output from the reviewed source,
  not an authoritative data store.
- `backend/scripts/content-seed-data.js` and `assets/news-data.js` remain
  migration inputs/compatibility build material, not visitor fallback
  authorities.
- Test fixtures and report-generation scripts are test/tooling data.
- Navigation, i18n, legal/brand text, colour tokens, map styling, and cache
  values are valid UI/configuration constants.
