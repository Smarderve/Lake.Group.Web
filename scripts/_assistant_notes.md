# Offline knowledge assistant — build journal

## Architecture
- `assets/assistant.js` — self-contained widget. Takes over the `#chat-widget`
  mount (creates one on pages without it: 404/offline), sets
  `window.__LAKE_ASSISTANT_ACTIVE__` at script-execution time; `site.js
  initChat()` has a one-line guard that bails when the flag is set (deferred
  scripts all execute before DOMContentLoaded, so ordering is safe either way).
- `assets/assistant.css` — Meridian-aligned (flagship.css tokens: ink navy,
  gold tick, 2px radii, Inter). FLAGSHIP_DESIGN.md did not exist at build time;
  reconciliation note is in the file header.
- Search: FlexSearch **0.7.43** (Apache-2.0) vendored at
  `assets/vendor/flexsearch/flexsearch.bundle.min.js` (+LICENSE). One
  `FlexSearch.Index` per language, built lazily at first query, cached.
  `tokenize: forward`, `charset: latin:simple`. Word-by-word fallback when the
  full-phrase search returns nothing. Curated facts get a rank boost (f:1).
- KB: `scripts/build_assistant_kb.js` → `assets/assistant-kb.js`
  (`window.__LAKE_ASSISTANT_KB__`, same global-payload pattern as
  i18n-content.js so it works under file://). Sources: (1) i18n-content.json
  keys grouped by page prefix → chunks of ~340 chars with page URL + translated
  title; alt-text keys and strings <30 chars skipped; nav/footer/chat/dashboard/
  news_article prefixes skipped. (2) 16 hand-curated trilingual facts written
  from scripts/_verified_lake_facts.md (verified-only; conflicting fleet figures
  use the preferred "700+" from the about page).
  Size: **154.7 KB** — en 117 / fr 133 / sw 126 docs (16 facts each).
- Persistence: IndexedDB `lake-assistant` / store `messages` (autoIncrement),
  feature-detected, in-memory fallback; restore on load; clear button; last 100.
- Intents (regex, before retrieval): greeting (en/fr/sw), thanks, contact
  (serves the curated contact fact verbatim with link).
- Answers: lead "Here's what I found:" + verbatim best passage + up to 2
  "Read more →" links (second only if a different page). No-match message in
  all three languages links to contact.html. Zero text generation.
- i18n: 13 `assistant.*` keys added to en/fr in i18n-content.json + sw in
  scripts/_sw_out_4.json; `node scripts/build_sw_lang.js` passes (1369 keys,
  key sets match, tag check clean). Widget re-translates on `lake-i18n-applied`.
- Wiring: `scripts/add_assistant_tags.js` (add_seo_tags.js pattern) injects
  assistant.css link + flexsearch/kb/assistant deferred scripts after site.js
  (or before </body> on 404/offline/our-story). 29/29 pages, idempotent.

## Status log
- 2026-07-06: vendored flexsearch 0.7.43; KB build done (154.7KB); assistant
  js/css done; site.js guard added; i18n keys added + build_sw_lang.js green;
  all 29 pages injected (re-run no-op). Next: browser verification, then sw.js
  precache + VERSION bump (LAST, re-read sw.js first — other agents touch it).

## Verification (headless Chrome via scripts/_assistant_qa.js — ALL PASSED)
- [x] EN: "Which countries do you operate in?" → 8-country fact + link to
      africa-network.html (assistant-desktop-en-countries.png)
- [x] SW: LakeI18n.apply('sw') live, then "Mnafanya kazi nchi gani?" →
      Swahili 8-country answer; UI re-translated (assistant-desktop-sw-*.png)
- [x] Reload → 5 messages restored from IndexedDB (assistant-desktop-restored.png)
- [x] Offline (CDP Network.emulateNetworkConditions offline after first
      load) → "Una malori mangapi?" answered locally (fleet fact). Note:
      a fetch probe still resolved because the v6 SW served it from its
      runtime cache — retrieval itself never touches the network.
- [x] Zero console errors in all three sessions
- [x] 390px: full-height sheet {w:390,h:844,top:0}, launcher hidden
      (assistant-mobile-sheet.png)
- [x] Keyboard-only: Enter opens + focus in input, typed CEO question
      answered, focus trapped over 8 Tabs, Esc closes and returns focus
      to launcher (assistant-keyboard.png)
- Retrieval unit-tested in Node (10 queries en/fr/sw → correct curated
  facts; gibberish → graceful no-match).
- sw.js: re-read before edit (untouched by other agents), added 4 assistant
  precache entries, VERSION v6 → v7; all precache URLs return 200.
- Stopword stripping added for en/fr/sw interrogatives ("una", "do", etc.)
  so curated facts outrank page chunks; KB de-duplicates repeated strings
  per page (153.4 KB final).
