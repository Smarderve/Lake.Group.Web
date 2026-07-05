#!/usr/bin/env python3
"""
Replace every `@import url('https://fonts.googleapis.com/...');` statement
in every HTML page with a single `@import url('assets/fonts/fonts.css');`,
so the site no longer depends on Google's CDN for fonts (which silently
breaks offline / file:// use: text falls back to a generic system font,
and the Material Symbols icon font renders blank glyphs with no fallback
at all).

Some pages had the Google Fonts @import duplicated (two near-identical
lines, apparently a leftover bug from however the page was assembled) -
this collapses all of them down to exactly one local import per page,
placed where the first @import was.
"""
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GOOGLE_IMPORT_RE = re.compile(r"@import url\('https://fonts\.googleapis\.com/[^']*'\);\r?\n?")
LOCAL_IMPORT = "@import url('assets/fonts/fonts.css');\n"


def process_file(path):
    with open(path, 'r', encoding='utf-8', newline='') as f:
        raw = f.read()

    matches = list(GOOGLE_IMPORT_RE.finditer(raw))
    if not matches:
        return False

    # Replace the first occurrence with the local import, remove the rest.
    first = matches[0]
    raw = raw[:first.start()] + LOCAL_IMPORT + raw[first.end():]
    # Re-find remaining occurrences in the (now shorter) string and strip them.
    raw = GOOGLE_IMPORT_RE.sub('', raw)

    with open(path, 'w', encoding='utf-8', newline='') as f:
        f.write(raw)
    return True


def main():
    changed = 0
    for fn in sorted(os.listdir(ROOT)):
        if not fn.endswith('.html'):
            continue
        path = os.path.join(ROOT, fn)
        if process_file(path):
            changed += 1
            print(f'fixed: {fn}')
        else:
            print(f'no google fonts import found: {fn}')
    print(f'\nDone. {changed} files updated.')


if __name__ == '__main__':
    main()
