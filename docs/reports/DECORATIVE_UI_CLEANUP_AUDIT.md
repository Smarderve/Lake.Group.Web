# Decorative UI Cleanup Audit

Date: 2026-09-09
Scope: all 42 root public HTML pages

Redundant numbered section-marker rows and standalone eyebrow/kicker/section-label outputs were removed at source. The shared stylesheet no longer generates the paired yellow tick and gray rule from section-stat and divider pseudo-elements. Real checklist content remains, including AFICD certification and capability lists.

| Page | Redundant pre-headings found | Removed | Leftover spacing fixed | Status |
|---|---:|---:|---|---|
| 404.html | 0 | 0 | Yes | PASS |
| about.html | 4 | 4 | Yes | PASS |
| acfs.html | 6 | 6 | Yes | PASS |
| aficd.html | 9 | 9 | Yes | PASS |
| agrinova-tech.html | 14 | 14 | Yes | PASS |
| aill.html | 5 | 5 | Yes | PASS |
| assembly-tech.html | 10 | 10 | Yes | PASS |
| atl.html | 9 | 9 | Yes | PASS |
| careers.html | 3 | 3 | Yes | PASS |
| contact.html | 4 | 4 | Yes | PASS |
| cross-country.html | 7 | 7 | Yes | PASS |
| csr.html | 3 | 3 | Yes | PASS |
| dashboard.html | 1 | 1 | Yes | PASS |
| fleet.html | 3 | 3 | Yes | PASS |
| gallery.html | 1 | 1 | Yes | PASS |
| gulf-aggregates.html | 4 | 4 | Yes | PASS |
| history.html | 2 | 2 | Yes | PASS |
| index.html | 5 | 5 | Yes | PASS |
| la-home.html | 0 | 0 | Yes | PASS |
| la-projects.html | 0 | 0 | Yes | PASS |
| lake-agro.html | 8 | 8 | Yes | PASS |
| lake-aviation.html | 5 | 5 | Yes | PASS |
| lake-buildings.html | 5 | 5 | Yes | PASS |
| lake-cylinders.html | 6 | 6 | Yes | PASS |
| lake-gas.html | 4 | 4 | Yes | PASS |
| lake-group-financial-dashboard.html | 0 | 0 | Yes | PASS |
| lake-group-org-chart.html | 0 | 0 | Yes | PASS |
| lake-lubes.html | 5 | 5 | Yes | PASS |
| lake-oil.html | 5 | 5 | Yes | PASS |
| lake-pipes.html | 5 | 5 | Yes | PASS |
| lake-premix-cement.html | 8 | 8 | Yes | PASS |
| lake-steel.html | 5 | 5 | Yes | PASS |
| lake-trans.html | 6 | 6 | Yes | PASS |
| leadership-ally-edha-awadh.html | 0 | 0 | Yes | PASS |
| leadership.html | 1 | 1 | Yes | PASS |
| media-center.html | 2 | 2 | Yes | PASS |
| nextdrive-motors.html | 7 | 7 | Yes | PASS |
| ocean-galleria.html | 6 | 6 | Yes | PASS |
| offline.html | 0 | 0 | Yes | PASS |
| our-story.html | 5 | 5 | Yes | PASS |
| station-locator.html | 2 | 2 | Yes | PASS |
| sustainability.html | 3 | 3 | Yes | PASS |

## Totals

- Public pages checked: **42**
- Redundant pre-heading outputs removed: **178** (105 marker rows and 73 standalone labels)
- Decorative tick/rule generators removed from shared source: **`fs-stat` and `divider-yellow` pseudo-elements**
- Shared source changed: `assets/flagship.css`
- Responsive rendered checks: representative pages at **390, 768, 1024, 1440, and 1920 px**
- Render checks confirmed zero `.fs-marker`, `.fs-eyebrow`, `.section-label`, `.ag-kicker`, or page-hero eyebrow nodes on the representative pages.
