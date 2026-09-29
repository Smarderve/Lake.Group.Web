# Full-Site Fix Priority Plan

This is a discovery output. No production fixes were applied during this audit.

## WAVE 1 — CRITICAL STABILITY

1. Fix the shared dotLottie CSP/WASM failure and verify graceful fallback on News, Careers, CSR, Investors, and Africa Network (QA-008, QA-015, QA-023).
2. Repair all live 404 imagery in Gallery, Projects, Lake Oil, and Station Locator before any visual release (QA-001 through QA-007).
3. Reproduce the reported mixed-version behavior with the active service worker and test update/rollback lifecycle (QA-011, QA-012).

## WAVE 2 — GLOBAL NAV / CACHE / PERFORMANCE

1. Reduce Home/Gallery initial transfer and stage noncritical imagery (QA-009, QA-010).
2. Generate verified asset manifests and fail delivery checks on missing precache URLs (QA-012).
3. Make shared JS initialization idempotent and remove duplicate observers (QA-019).
4. Standardize video facades and confirm direct YouTube embeds are intentional (QA-016).

## WAVE 3 — MOBILE / TABLET

1. Re-run the full viewport matrix on Chromium plus WebKit/Firefox and investigate the 404/404 legacy route overflow findings (QA-018, QA-021, QA-024).
2. Verify aborted Lake Steel branding requests and all narrow-screen logo/hero states (QA-022).

## WAVE 4 — COMPANY PAGE CONTENT

1. Review Africa Network and Contact terminology against approved factual source language (QA-013, QA-014).
2. Repair or deliberately retire direct-access legacy company pages with missing placeholder/framework assets (QA-017, QA-018).

## WAVE 5 — VISUAL CONSISTENCY

1. Compare Gallery, Projects, and company imagery after URL repair at desktop/tablet/mobile sizes.
2. Verify Lottie static fallbacks and reduced-motion behavior on every affected page.

## WAVE 6 — ACCESSIBILITY / SEO

1. Run axe/WAVE and keyboard checks in all available engines after stability fixes.
2. Validate metadata, structured data, focus order, touch targets, and aria state page-by-page.

## WAVE 7 — CLEANUP / TECH DEBT

1. Remove or quarantine obsolete page generations only after public URL and redirect review.
2. Add CI checks for broken local asset references, duplicate critical scripts/styles, overflow, console errors, and build-marker consistency.
