# Translation quality and coverage triage

Status: **not linguistically approved; benchmark pending**. This report describes the current source tree and generated `scripts/.generated/i18n-*` artifacts. Re-run `npm run i18n:extract` and `npm run i18n:quality` after content changes.

## Hardcoded extraction and dynamic patterns

The current extraction scan covers 41 root HTML pages and 488 JavaScript/TypeScript source files: 7,250 static candidates, 386 duplicate groups, 1,362 dynamic/unsupported patterns, and no parser failures. The visitor translation manifest contains 4,549 source entries for seven target languages (31,843 potential locale jobs); this is a queue inventory, not a count of generated or approved translations.

The dynamic-pattern file-use triage is based on the extractor's stored pattern kind and each file's relationship to the root HTML script references:

| Triage class | Count | Interpretation |
| --- | ---: | --- |
| CMS editor/admin source (`cms/`) | 1,217 | CMS operator UI/preview code, not public site copy. CMS editorial fields follow their separate revision-bound CMS translation flow. |
| Runtime asset directly referenced by a root HTML page | 74 | Visitor-reachable runtime patterns; dynamic branches still need source-level review before implementation. |
| Third-party vendor asset | 55 | Vendor UI/runtime internals; excluded from Lake Group content translation. |
| Not directly referenced by root HTML | 16 | Includes dynamic/imported components; do not label visitor-facing or ignore until the import/use chain is checked. |

Direct script reference means a page can load the asset, not that every dynamic branch is visible. No mass edits were made. The 74 directly referenced items are the narrow visitor-facing review set; ordinary static content already appears in the source manifest.

## Number and markup screening

The prior generated quality report had 347 number-token flags. Locale-aware screening now normalizes Arabic-Indic and Persian digits, Arabic decimal/thousands marks, and common French/Spanish/Portuguese number grouping before comparison; this reduced formatting-only flags. The current report has 212 number-token flags. These are screening mismatches, not 212 proven factual errors; word-based number translations and context still need a human reviewer.

I corrected 63 explicit locale/key values where the dictionary text clearly repeated the exact English source fact: 10,000 employee/job counts, 10 countries, five subsidiaries, or 500+ stations. Example corrections included 30,000→10,000 employee references, eight→10 country references, four→five subsidiary labels, and Arabic 154→500+ station references. Corrections preserve localized wording and only change the evidenced number. The 212 remaining flags are not guessed or bulk-rewritten.

The nine markup-token flags represent three source/translation patterns: `about.24` translations add balanced emphasis tags to otherwise plain headings, and `fuel.9` translations use a balanced decorative SVG check inside the same outer span instead of the source's styled literal check. These are structural differences, not malformed markup. The original semantic text and the icon's `aria-hidden` treatment are retained; no markup changes were required.

## Coverage and eligibility

The dictionary has 1,788 English keys, of which 1,786 have nonempty source text. Kiswahili now has 1,786 translations for 1,786 nonempty source keys; Arabic, French, Spanish, and Portuguese each have 1,783 (three absent); Hindi and Simplified Chinese have zero. Empty English placeholders are excluded from the missing count. Current screening reports 3,584 missing entries, 207 number-token flags, and eight markup-token flags. These are machine-screening results, not linguistic approval.

The homepage contains 82 unique dictionary-backed text/attribute keys; the Kiswahili pack now covers all 82. This is not whole-homepage coverage: the extraction manifest separately contains 127 homepage candidates, including hardcoded and dynamic text, of which 44 are currently classified as unsupported structure. The Kiswahili batch corrected source-fact mismatches in `about.4`, `about.9`, `about.10`, `index.20`, `index.48`, `index.50`, `index.55`, and `index.57`, restored the source meaning of `dashboard.13`, removed an unsupported markup expansion from `about.24`, and recovered the extracted `gallery.7` source (“39 Photos”) plus its existing Kiswahili translation. Number screening still includes formatting and semantic-equivalence cases requiring review.

All target-language assets remain **pending validation and publication**. No locale is eligible for public activation: no full-page source-controlled release has been approved, and unkeyed visitor copy still needs translation and coverage review. The benchmark remains pending and no translation quality approval is claimed.

The browser dropdown and atomic publication rules are separate from dictionary completeness: only a generated, complete, approved locale release may become available. This workstation did not connect to PostgreSQL or publish any locale.
