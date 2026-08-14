# CMS Phase 17 — Testing & Hardening

Specification Phase 17 maps to progress tracker Phase 19. The tracker contains
two repository-only phases (metrics and administration) before preview/testing,
so its number is intentionally two higher than the specification number.

## Automated coverage

- Unit: role helpers, date/number/byte formatting, relative time boundaries,
  and media display transformations.
- Component: data-table rendering/sorting/selection/empty/error/retry states,
  dialog focus trap and confirmation behavior, login validation, workflow
  controls for EDITOR/REVIEWER/SUPER_ADMIN/VIEWER, status labels, skip link,
  and the mobile navigation modal.
- API integration: the backend suite covers authentication, CRUD, workflow,
  publishing, permissions, validation, preview/public parity, and media
  record management. Phase 17 adds protocol validation for media and variant
  URLs.
- E2E: an isolated in-memory backend and Vite CMS exercise login → dashboard →
  create news draft → submit → reviewer approve → publish → public API
  visibility. A separate VIEWER session verifies review-queue denial.
- Responsive: the E2E suite runs the authenticated shell at 390 × 844,
  checks for horizontal overflow, and exercises the mobile navigation drawer.
- Accessibility: axe runs against component states and real browser pages.
  Keyboard/focus tests cover modal trapping, Escape close, focus restoration,
  and skip navigation.
- Error states: table empty/error/retry behavior and form validation are
  regression-tested.

## Hardening outcomes

- Route-level lazy loading split the previous 763.76 kB monolithic JavaScript
  bundle into 91 chunks. The initial entry is 353.59 kB raw / 113.38 kB gzip;
  CSS is 43.65 kB raw. `npm run test:performance` enforces the entry, CSS, and
  route-splitting budgets.
- `--color-ink-faint` changed from `#84928b` to `#63706a` after browser axe
  found AA contrast failures. The new token is 5.18:1 on white and 4.77:1 on
  the canvas surface.
- The mobile drawer is now a labelled modal with body-scroll lock, focus trap,
  Escape/backdrop/close-button handling, and focus restoration. The shell now
  exposes a skip-to-content link.
- Loading buttons retain a stable accessible name while exposing `aria-busy`.
- Security review found one high-confidence stored-link issue: media URLs and
  variant URLs accepted executable schemes. The backend now permits only
  absolute HTTP(S) URLs, with regression tests for `javascript:` and `data:`
  payloads. No other high-confidence vulnerabilities were identified in the
  Phase 16/17 CMS changes.
- Dependency review: CMS audit reports zero known vulnerabilities; the backend
  monitored audit baseline remains zero.

## Verification

- CMS unit/component: 7 files, 24 tests.
- CMS critical-flow E2E: passed, including mobile, unauthorized role, public
  visibility, browser axe, and JavaScript error checks.
- Backend: 37 files, 273 tests.
- Backend security gate: 19 files, 157 tests after the Phase 17 URL suite.
- Backend syntax check and focused ESLint: clean.
- CMS TypeScript build, Vite production build, and performance budget: clean.

## Known architecture gap

The backend still has no binary media-upload endpoint; it manages media records
by existing HTTP(S) URL. Therefore Phase 17 verifies media CRUD, URL validation,
rendering transformations, and usage metadata, but cannot exercise a multipart
upload flow. Adding storage plus a multipart endpoint remains a separate backend
feature, already documented in the media API/service notes.
