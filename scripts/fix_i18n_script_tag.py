#!/usr/bin/env python3
"""
Insert <script src="assets/i18n-content.js"></script> immediately before
<script src="assets/i18n.js"></script> on every page.

This is required because assets/i18n.js was rewritten to read translation
data from window.__LAKE_I18N_CONTENT__ (a plain global variable, set by
assets/i18n-content.js) instead of fetch()-ing assets/i18n-content.json.
That change was made so the site works when opened directly via file://
(fetch() of a local file is blocked by browser CORS policy under file://,
which silently breaks translations with no visible error) as well as when
served over http(s)://. But the new script tag was never actually added to
the HTML pages, so the rewritten i18n.js had nothing to read from on any
page until this script runs.
"""
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OLD_TAG = '<script src="assets/i18n.js"></script>'
NEW_PAIR = '<script src="assets/i18n-content.js"></script>\n<script src="assets/i18n.js"></script>'


def main():
    changed = 0
    for fn in sorted(os.listdir(ROOT)):
        if not fn.endswith('.html'):
            continue
        path = os.path.join(ROOT, fn)
        with open(path, 'r', encoding='utf-8', newline='') as f:
            raw = f.read()

        if 'assets/i18n-content.js' in raw:
            print(f'already present: {fn}')
            continue
        if OLD_TAG not in raw:
            print(f'NO i18n.js TAG FOUND (skipped): {fn}')
            continue

        new_raw = raw.replace(OLD_TAG, NEW_PAIR, 1)
        with open(path, 'w', encoding='utf-8', newline='') as f:
            f.write(new_raw)
        changed += 1
        print(f'fixed: {fn}')

    print(f'\nDone. {changed} files updated.')


if __name__ == '__main__':
    main()
