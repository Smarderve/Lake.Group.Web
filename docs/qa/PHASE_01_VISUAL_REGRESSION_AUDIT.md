# Phase 01 Visual Regression Audit

Date: 26 August 2026

Actual Chromium screenshots were captured at 1440 × 900 and 390 × 844 after the site skeleton reached its ready state. Evidence is stored in `docs/qa/phase-01-visual-regression/`.

## Result

- Shared navbar: verified desktop and mobile.
- Lake-only logo: verified.
- Three yellow stripes: verified desktop and mobile.
- Centered desktop navigation: verified.
- Shared footer: verified across representative corporate, subsidiary, leadership, utility, and all six Under Construction pages; automated markup/style coverage audits every remaining root public page.
- Language selector: absent.
- Under Construction template: identical on News, Careers, CSR, Sustainability, Operations Map, and Investor Relations.
- Leadership: Ally Edha Awadh only, presented as Founder and Chairman.
- Subsidiaries landing page: `services.html` returns 404 locally and is configured for a permanent production redirect to `index.html`.

## Correction made

Legacy active-link pseudo-elements still drew yellow underline bars on desktop. The shared Phase 01 navbar stylesheet now disables those pseudo-elements. The corrected header and open dropdown are captured in `desktop-navbar-dropdown-fixed.png`.
