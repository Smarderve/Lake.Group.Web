# Company Page Template Standardization

## Scope

This pass uses the approved Agrinova page as a quality reference for spacing, controlled typography, compact information panels, image rhythm, contrast and mobile-first content density. It does not copy Agrinova's agricultural colour system or alter any company-specific factual copy.

## Shared standard introduced

`assets/company-page-standard.css` provides a page-scoped refinement layer for Lake Oil, Lake Gas, Lake Lubes, Lake Steel, Lake Cylinders, Lake Pipes, Lake Building Solution, Lake Premix, Lake Trans, AFICD, AILL, Cross Country, Gulf Aggregates, Lake Agro and Lake Aviation.

The shared layer standardizes:

- editorial section spacing and content widths;
- controlled heading and body-copy scales;
- compact fact panels, cards and gallery spacing;
- high-contrast text in dark company sections;
- mobile heading and body sizing;
- immediate content visibility for company pages, avoiding blank section bands while an intersection-based reveal waits for scrolling.

Agrinova remains the approved visual benchmark with its existing bespoke agricultural styling. Lake Agro retains its green identity; standard company pages retain their existing blue/teal brand direction.

## Content treatment

No company sections were removed automatically. Existing source-backed company content, imagery and page-specific layouts were retained rather than making factual or editorial decisions without a new approved source. The refinement layer focuses on content density, card proportions, contrast and responsive presentation.

## Footer standardization

Every shared public footer now references `assets/images/logos/LAKE_GROUP_LOGO.png` with the accessible label `Lake Group`.

The runtime company-branding logic no longer replaces the corporate footer logo with a subsidiary mark. Company logos continue to be used in their intended hero, navigation and company-discovery placements. Footer structure, Kigamboni headquarters details, navigation columns and page-specific colour themes were preserved.

## Lake Premix naming

Public navigation, templates, i18n data, assistant/search data and current content now use **Lake Premix**. The legacy `Lake Premix & Cement` and `Lake Premix and Cement` labels were removed from public/runtime output. The existing `lake-premix-cement.html` URL was retained for compatibility. Gulf Premix naming was not changed.

## Verification

- `node --test tests/company-footer-and-premix-standard.test.js` — passed (corporate footer logo, runtime guard, Lake Premix naming, manufacturing labels and standardized-page scope).
- Legacy public/runtime Lake Premix name search — no matches.
- `git diff --check` — passed (line-ending warnings only).
- Browser checks at 1440px and 390px were run across the company set where the local static harness could complete: verified no horizontal overflow, no hidden refinement-layer content and the Lake Group footer asset at runtime.
- Final visual reference capture: `%TEMP%\\lake-company-standardization-qa\\lake-steel-final.png`.

The local browser process reached a memory limit during one full-page batch because several legacy pages are very tall. The QA was therefore performed using fixed-viewport captures in smaller batches; no product code or delivery configuration was changed to accommodate the tooling limitation.

## Performance impact

No UI framework, animation library, font library or additional runtime was added. The new shared layer is a single static stylesheet. It removes company-page dependency on delayed visibility effects for content that should already be present, preventing perceived blank sections without adding script work.

## Known limitations

This was a design-system normalization pass, not a factual content rewrite. Further gallery or section removals should be made only alongside an approved company-specific source decision.
