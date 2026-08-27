# Homepage marquee blue-logo asset audit

Date: 2026-08-27

## Outcome

No verified blue/navy Lake-family logo asset exists in the repository, including
tracked history. The homepage marquee therefore retains the current official
yellow/white source files rather than fabricating blue artwork or applying CSS
filters. No production asset reference was changed.

The audit covered the complete working tree (including ignored/legacy paths),
the official `docs/All Logos` masters, CMS assets, `lake-3d`, and all Git history.
Pixel inspection of every reusable Lake-family PNG found 0.0% blue pixels in
the opaque artwork. The official 2024 JPG set places the same yellow/white marks
on blue background cards and is not suitable for the approved continuous white
marquee.

## Marquee Lake-family audit

| Company | Current marquee asset | Verified blue replacement | Official master checked |
| --- | --- | --- | --- |
| Lake Oil | `assets/images/logos/companies/lake-oil.png` | None found | `docs/All Logos/LG - All Logo PNG/LG24 - Oil.png` |
| Lake Gas | `assets/images/logos/companies/lake-gas.png` | None found | `docs/All Logos/LG - All Logo PNG/LG24 - Gas.png` |
| Lake Lubes | `assets/images/logos/companies/lake-lubes.png` | None found | `docs/All Logos/LG - All Logo PNG/LG24 - Lubes.png` |
| Lake Steel | `assets/images/logos/companies/lake-steel.png` | None found | `docs/All Logos/LG - All Logo PNG/LG24 - Steel.png` |
| Lake Trans | `assets/images/logos/companies/lake-trans.png` | None found | `docs/All Logos/LG - All Logo PNG/LG24 - Trans.png` |
| Lake Aviation | `assets/images/logos/companies/lake-aviation.png` | None found | `docs/All Logos/LG - All Logo PNG/LG24 - Aviation.png` |
| Lake Buildings | `assets/images/logos/companies/lake-buildings.png` | None found | `docs/All Logos/LG - All Logo PNG/LG24 - Building.png` |
| Lake Plastics | `assets/images/logos/companies/lake-plastics.png` | None found | `docs/All Logos/LG - All Logo PNG/LG24 - Plastics.png` |
| Lake Premix & Cement | `assets/images/logos/companies/lake-premix-cement.png` | None found | `docs/All Logos/LG - All Logo PNG/LG24 - Premix.png` |
| Lake Cylinders | `assets/images/logos/companies/lake-cylinders.png?v=58` | None found | `docs/All Logos/LG - All Logo PNG/LG24 - Tanks.png` (related family master; not a blue Cylinders variant) |

Lake Agro was also audited. Its current asset is
`assets/images/logos/companies/lake-agro.png?v=61`; it has a distinct identity
and was intentionally preserved with the independent subsidiary brands.

## Rejected candidates

- `assets/images/logos/companies/_pretrim/`: untrimmed copies of the same
  yellow/white artwork.
- `docs/All Logos/LG New Logos - 2024/`: yellow/white marks on blue cards; using
  these would add prohibited individual blue backgrounds.
- `cms/src/assets/lake-logo.png` and `cms/src/assets/lake-mark.png`: yellow/white
  group marks, not subsidiary blue variants.
- `lake-3d/assets/lake-group-logo-source.png` and
  `lake-3d/public/lake-group-logo.png`: legacy group artwork, not approved blue
  subsidiary variants.
- Historical `LAKE TRANS1.jpg` and `LAKE STEEL 01.jpg`: campaign photography
  containing embedded yellow/white logos, not reusable logo assets.

## Other references identified

The same company PNGs are also referenced by shared mega-menu markup across the
public HTML pages, backend content seed data, public-content release snapshots,
and maintenance/verification scripts. Those references were not broadly
replaced because they are outside the homepage marquee source and no approved
blue replacement exists.

## Verification scope

`tests/home-logo-ticker.test.js` protects the unchanged white surface, continuous
animation, reduced-motion behavior, asset loading, logo sizing, desktop/tablet/
mobile spacing, one-row/no-wrap/no-overlap layout, absence of horizontal page
overflow, absence of CSS color filters, and exact preservation of Gulf
Aggregates, AFICD, AILL, ATL, Lake Agro, Cross Country, and Ocean Galleria.
