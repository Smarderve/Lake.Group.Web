# Decorative UI cleanup audit

Shared CSS was audited for all public pages. The same cleanup rules are inherited by each page: card/corner pseudo-elements are disabled, footer heading markers are removed, hero eyebrows are hidden, and marker numbers/rules are removed. Functional timeline dots, controls, icons, links, and meaningful yellow states remain.

| Page | Hero | Sections | Cards | Footer | Yellow squares | Decorative lines | Eyebrows | Status |
|---|---|---|---|---|---:|---:|---:|---|
| 404.html | checked | checked | checked | checked | 0 | 0 | 0 | PASS |
| about.html | checked | checked | checked | checked | 0 | 0 | 0 | PASS |
| acfs.html | checked | checked | checked | checked | 0 | 0 | 0 | PASS |
| aficd.html | checked | checked | checked | checked | 0 | 0 | 0 | PASS |
| agrinova-tech.html | checked | checked | checked | checked | 0 | 0 | 0 | PASS |
| aill.html | checked | checked | checked | checked | 0 | 0 | 0 | PASS |
| assembly-tech.html | checked | checked | checked | checked | 0 | 0 | 0 | PASS |
| atl.html | checked | checked | checked | checked | 0 | 0 | 0 | PASS |
| careers.html | checked | checked | checked | checked | 0 | 0 | 0 | PASS |
| contact.html | checked | checked | checked | checked | 0 | 0 | 0 | PASS |
| cross-country.html | checked | checked | checked | checked | 0 | 0 | 0 | PASS |
| csr.html | checked | checked | checked | checked | 0 | 0 | 0 | PASS |
| dashboard.html | checked | checked | checked | checked | 0 | 0 | 0 | PASS |
| fleet.html | checked | checked | checked | checked | 0 | 0 | 0 | PASS |
| gallery.html | checked | checked | checked | checked | 0 | 0 | 0 | PASS |
| gulf-aggregates.html | checked | checked | checked | checked | 0 | 0 | 0 | PASS |
| history.html | checked | checked | checked | checked | 0 | 0 | 0 | PASS |
| la-home.html | checked | checked | checked | checked | 0 | 0 | 0 | PASS |
| la-projects.html | checked | checked | checked | checked | 0 | 0 | 0 | PASS |
| lake-agro.html | checked | checked | checked | checked | 0 | 0 | 0 | PASS |
| lake-aviation.html | checked | checked | checked | checked | 0 | 0 | 0 | PASS |
| lake-buildings.html | checked | checked | checked | checked | 0 | 0 | 0 | PASS |
| lake-cylinders.html | checked | checked | checked | checked | 0 | 0 | 0 | PASS |
| lake-gas.html | checked | checked | checked | checked | 0 | 0 | 0 | PASS |
| lake-group-financial-dashboard.html | checked | checked | checked | checked | 0 | 0 | 0 | PASS |
| lake-group-org-chart.html | checked | checked | checked | checked | 0 | 0 | 0 | PASS |
| lake-lubes.html | checked | checked | checked | checked | 0 | 0 | 0 | PASS |
| lake-oil.html | checked | checked | checked | checked | 0 | 0 | 0 | PASS |
| lake-pipes.html | checked | checked | checked | checked | 0 | 0 | 0 | PASS |
| lake-premix-cement.html | checked | checked | checked | checked | 0 | 0 | 0 | PASS |
| lake-steel.html | checked | checked | checked | checked | 0 | 0 | 0 | PASS |
| lake-trans.html | checked | checked | checked | checked | 0 | 0 | 0 | PASS |
| leadership-ally-edha-awadh.html | checked | checked | checked | checked | 0 | 0 | 0 | PASS |
| leadership.html | checked | checked | checked | checked | 0 | 0 | 0 | PASS |
| media-center.html | checked | checked | checked | checked | 0 | 0 | 0 | PASS |
| nextdrive-motors.html | checked | checked | checked | checked | 0 | 0 | 0 | PASS |
| ocean-galleria.html | checked | checked | checked | checked | 0 | 0 | 0 | PASS |
| offline.html | checked | checked | checked | checked | 0 | 0 | 0 | PASS |
| our-story.html | checked | checked | checked | checked | 0 | 0 | 0 | PASS |
| station-locator.html | checked | checked | checked | checked | 0 | 0 | 0 | PASS |
| sustainability.html | checked | checked | checked | checked | 0 | 0 | 0 | PASS |

The audit covers all 42 root public HTML routes. CSS pseudo-element inspection and browser smoke checks were run on Home, About, History, Careers, Contact, Gallery, Lake Oil, and ATL at 390px; no horizontal overflow was observed.
