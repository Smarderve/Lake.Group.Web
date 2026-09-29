# Cross Country and Gulf Aggregates source cleanup

## Cross Country

- Replaced unsupported Ocean Galleria size, tenant and hotel claims with source-backed company overview content.
- Retained the approved current hero and source-backed mission, vision, values, expertise and project lists.
- Completed: Lake Avenue Development; Plot No. 60 and Plot No. 57, Kimweri Street, Oysterbay; Kingsway Development.
- Ongoing: Ocean Galleria – Masaki; UN Road Development; Town Development Project.
- Removed the unsupported `Looking Ahead` roadmap and reduced the final gallery to a compact four-image grid.

## Gulf Aggregates

- Removed unsupported `30K`, `250T/hr` and crushing-plant KPI presentation.
- Replaced it with Lugoba and quarrying/crushing/screening/integrated-supply capabilities.
- Corrected history to 2018 incorporation, 2019 operations, and GCCP-to-Gulf-Aggregates identity.
- Corrected values to Safety First, Sustainability, Customer Focus and Quality.
- Merged source-backed processing and supply wording into the capability cards; the one verified crushed-stone product remains compact.

## QA and remaining risk

- `tests/cross-country-gulf-source.test.js` verifies source facts and the removal of the disallowed KPI/future claims.
- Visual screenshots captured: `cross-country-1440.png`, `cross-country-390.png`, `gulf-aggregates-1440.png`, and `gulf-aggregates-390.png`. No horizontal overflow was detected at 1440px or 390px.
- Existing responsive grid classes retain their desktop and mobile behavior; final visual review is required before release.
- The DOCX files were read directly from their Word XML because `pandoc` is not installed in this environment.
