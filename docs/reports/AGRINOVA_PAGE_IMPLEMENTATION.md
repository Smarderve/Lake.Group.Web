# Agrinova page implementation

## Sources and route

- Canonical route: `agrinova-tech.html`.
- Controlling design and content source: `AGRINOVA WEBSITE DESIGN.pdf` supplied by the client.
- Supporting reference screenshot was treated as context only; it references ATL, while the PDF controls the public Agrinova page.

## Implemented page

The former placeholder is replaced by a dedicated agricultural landing page with the PDF-led sequence: centre-pivot hero, overview, vision and mission, agricultural cycle, tractor range, leadership, products, harvesting, reasons to choose Agrinova, audiences, approach, after-sales support, financing, quote form, FAQ and contact/location.

The intentionally omitted PDF metric placeholders (`XX+`) were not published. No unsupported performance, market, finance, staffing or machinery claims were added.

## Assets and identity

- Official logo: `assets/images/logos/companies/agrinova-tech.png`.
- Hero: `assets/images/agrinova/centre-pivot.webp`.
- Tractor section: `assets/images/agrinova/tractor.webp`.
- Harvesting section: `assets/images/agrinova/combine.webp`.
- PNG source files remain retained beside optimized WebP delivery versions.
- Desktop Agro Processing dropdown uses the supplied logo; mobile remains text-only as required.
- The white/gold official mark appears in the shared logo strip on a restrained Agrinova-green tile, without changing the artwork.
- Footer navigation includes Agrinova Tech Limited.

## Quality checks

- Semantic headings, real form labels, native accessible FAQ disclosure controls, meaningful image alt text and visible link/button treatments are included.
- Hero is LCP-ready; below-fold images are lazy-loaded and async-decoded. Optimized WebP delivery sizes are 245 KB (hero), 317 KB (tractor), and 393 KB (combine).
- Regression coverage: `tests/agrinova-page.test.js` checks source facts, prohibited placeholders, canonical assets, desktop/mobile navigation treatment and logo-loop integration.

## Remaining risk

The client-provided PDF could not be programmatically extracted in this environment because no local PDF text/render utility is available. The implementation follows the supplied source-lock brief and its enumerated PDF copy; visual review against the supplied PDF remains the final approval gate.
