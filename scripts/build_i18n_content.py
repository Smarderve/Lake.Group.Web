#!/usr/bin/env python3
"""
Build assets/i18n-content.json from:
  - scripts/_master_en.json   (every data-i18n key -> English source text)
  - scripts/translation_dict.py (hand-translated phrases + term dictionary)

For French and Portuguese, each English value is translated by:
  1. Exact phrase match (PHRASES_FR / PHRASES_PT) - whole-string, highest
     priority, for hand-crafted natural sentences.
  2. Exact term match (TERMS_FR / TERMS_PT) - whole-string, for labels,
     headings and short phrases.
  3. Fallback: the English text itself. This is intentional - i18n.js
     treats a present-but-untranslated key as "use this value", and a
     missing key as "leave existing DOM text alone". Shipping the English
     string as the FR/PT value for not-yet-translated keys means the site
     never shows a blank, a raw key, or mixed mojibake; it shows clean
     English for the long tail of content not yet translated, while every
     covered key shows real French/Portuguese.

Run scripts/translation_coverage_report.py afterwards to see exactly which
pages/keys still fall back to English, so translation work can continue
incrementally without guesswork.
"""
import os
import json
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'scripts'))
from translation_dict import PHRASES_FR, PHRASES_PT, TERMS_FR, TERMS_PT  # noqa: E402

MASTER_EN_PATH = os.path.join(ROOT, 'scripts', '_master_en.json')
OUT_PATH = os.path.join(ROOT, 'assets', 'i18n-content.json')
COVERAGE_PATH = os.path.join(ROOT, 'scripts', '_coverage.json')


def translate(value, phrases, terms):
    if value in phrases:
        return phrases[value], True
    if value in terms:
        return terms[value], True
    return value, False


def main():
    with open(MASTER_EN_PATH, encoding='utf-8') as f:
        en = json.load(f)

    fr = {}
    pt = {}
    coverage = {'fr': {'covered': 0, 'fallback': 0, 'fallback_keys': []},
                'pt': {'covered': 0, 'fallback': 0, 'fallback_keys': []}}

    for key, value in en.items():
        fr_val, fr_hit = translate(value, PHRASES_FR, TERMS_FR)
        pt_val, pt_hit = translate(value, PHRASES_PT, TERMS_PT)
        fr[key] = fr_val
        pt[key] = pt_val
        if fr_hit:
            coverage['fr']['covered'] += 1
        else:
            coverage['fr']['fallback'] += 1
            coverage['fr']['fallback_keys'].append(key)
        if pt_hit:
            coverage['pt']['covered'] += 1
        else:
            coverage['pt']['fallback'] += 1
            coverage['pt']['fallback_keys'].append(key)

    content = {'en': en, 'fr': fr, 'pt': pt}
    with open(OUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(content, f, ensure_ascii=False, indent=2)

    # Also emit a plain <script>-loadable JS file that sets a global
    # variable. assets/i18n.js reads from this global instead of fetching
    # the JSON over the network. fetch() of a local file is blocked by
    # browser CORS policy under file:// (which is how someone previewing
    # the site by double-clicking index.html would load it) - a JS file
    # loaded as a normal <script src="..."> tag has no such restriction
    # and works identically under file://, http://, and https://.
    js_out_path = os.path.join(ROOT, 'assets', 'i18n-content.js')
    with open(js_out_path, 'w', encoding='utf-8') as f:
        f.write('window.__LAKE_I18N_CONTENT__ = ')
        json.dump(content, f, ensure_ascii=False)
        f.write(';\n')

    with open(COVERAGE_PATH, 'w', encoding='utf-8') as f:
        json.dump(coverage, f, ensure_ascii=False, indent=2)

    total = len(en)
    print(f'Total keys: {total}')
    print(f"FR covered: {coverage['fr']['covered']} ({coverage['fr']['covered']*100//total}%) | "
          f"fallback to EN: {coverage['fr']['fallback']}")
    print(f"PT covered: {coverage['pt']['covered']} ({coverage['pt']['covered']*100//total}%) | "
          f"fallback to EN: {coverage['pt']['fallback']}")
    print(f'\nWrote {OUT_PATH}')


if __name__ == '__main__':
    main()
