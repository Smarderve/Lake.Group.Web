#!/usr/bin/env python3
"""
Normalize shared chrome (nav, mobile nav, footer, chat widget) across every
page to single canonical, fully data-i18n-tagged, bug-free versions. This
must run BEFORE scripts/i18n_extract.py, so that shared text reuses the
canonical nav.* / footer.* / mob.* / chat.* keys instead of the extractor
minting page-specific duplicate keys for text that happens to be untagged
on a given page.

Also fixes two standalone bugs found in the source:
  - <script src="assets/i18n-content.js"> 404s on every page that has it
    (the file never existed). Removed; the real content file is wired up
    separately as assets/i18n-content.json, loaded by the new i18n.js.
  - data-i18n-placeholder="chat.placeholder" duplicated 7x on #chat-input
    (invalid, redundant HTML) -> single attribute.
"""
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TPL_DIR = os.path.join(ROOT, 'scripts', 'templates')

NAV_OPEN = '<nav class="site-nav">'
MOBILE_OPEN_RE = re.compile(r'<div class="nav-mobile" id="nav-mobile"[^>]*>')
FOOTER_OPEN = '<footer class="site-footer">'
CHAT_OPEN_RE = re.compile(r'<div id="chat-widget">')

BROKEN_SCRIPT_RE = re.compile(r'[ \t]*<script src="assets/i18n-content\.js"></script>[ \t]*\r?\n?')


def read_tpl(name):
    with open(os.path.join(TPL_DIR, name), 'r', encoding='utf-8', newline='') as f:
        content = f.read()
    content = content.replace('\r\n', '\n').replace('\n', '\r\n')
    return content


def extract_balanced(text, body_start, tag='div'):
    depth = 1
    pos = body_start
    close_tag = f'</{tag}>'
    tag_re = re.compile(r'<' + tag + r'\b|</' + tag + r'>')
    while depth > 0:
        m = tag_re.search(text, pos)
        if not m:
            return None
        if m.group(0) == close_tag:
            depth -= 1
        else:
            depth += 1
        pos = m.end()
    return pos


def replace_simple_block(raw, open_marker, close_marker, canonical):
    if open_marker not in raw:
        return raw, False
    start = raw.index(open_marker)
    end = raw.index(close_marker, start) + len(close_marker)
    if raw[start:end] == canonical:
        return raw, False
    return raw[:start] + canonical + raw[end:], True


def replace_balanced_block(raw, open_re, canonical, tag='div'):
    m = open_re.search(raw)
    if not m:
        return raw, False
    start = m.start()
    body_start = m.end()
    end = extract_balanced(raw, body_start, tag=tag)
    if end is None:
        return raw, False
    if raw[start:end] == canonical:
        return raw, False
    return raw[:start] + canonical + raw[end:], True


def fix_misc_bugs(raw):
    changed = False
    new_raw, n = BROKEN_SCRIPT_RE.subn('', raw)
    if n:
        raw = new_raw
        changed = True
    dup_re = re.compile(r'(\sdata-i18n-placeholder="chat\.placeholder")(?:\s*data-i18n-placeholder="chat\.placeholder")+')
    new_raw, n2 = dup_re.subn(r'\1', raw)
    if n2:
        raw = new_raw
        changed = True
    return raw, changed


def main():
    canonical_nav = read_tpl('nav.html')
    canonical_mobile = read_tpl('mobile_nav.html')
    canonical_footer = read_tpl('footer.html')
    canonical_chat = read_tpl('chat_widget.html')

    changed_files = 0
    for fn in sorted(os.listdir(ROOT)):
        if not fn.endswith('.html'):
            continue
        path = os.path.join(ROOT, fn)
        with open(path, 'r', encoding='utf-8', newline='') as f:
            raw = f.read()

        any_change = False

        raw, c = replace_simple_block(raw, NAV_OPEN, '</nav>', canonical_nav)
        any_change |= c

        raw, c = replace_balanced_block(raw, MOBILE_OPEN_RE, canonical_mobile, tag='div')
        any_change |= c

        raw, c = replace_simple_block(raw, FOOTER_OPEN, '</footer>', canonical_footer)
        any_change |= c

        raw, c = replace_balanced_block(raw, CHAT_OPEN_RE, canonical_chat, tag='div')
        any_change |= c

        raw, c = fix_misc_bugs(raw)
        any_change |= c

        if any_change:
            with open(path, 'w', encoding='utf-8', newline='') as f:
                f.write(raw)
            changed_files += 1
            print(f'normalized {fn}')
        else:
            print(f'already canonical / no chrome found: {fn}')

    print(f'\nDone. {changed_files} files updated.')


if __name__ == '__main__':
    main()
