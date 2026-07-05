#!/usr/bin/env python3
"""
Robust i18n tagging pipeline for the Lake Group static site (surgical edit
version — preserves original byte formatting instead of round-tripping
through BeautifulSoup's serializer, which reorders attributes and rewrites
self-closing tags).

Strategy:
  1. Parse with BeautifulSoup (read-only) to identify which elements need a
     data-i18n tag and to extract their English source text/HTML.
  2. For each element needing a tag, find its *exact* original opening tag
     in the raw file text (searching forward from a moving cursor, using a
     handful of its own attributes AND its immediately-following text as
     disambiguators) and splice in the new attribute(s) — only the opening
     tag is touched.
  3. Unwrap dead `data-it="..."` spans the same way: locate the exact
     `<span data-it="...">TEXT</span>` substring and replace with just TEXT
     (or strip just the attribute if the span has other attributes).

This guarantees the rest of the file (whitespace, attribute order, entity
encoding, everything) is untouched.

IMPORTANT: run scripts/normalize_nav.py BEFORE this script, so that shared
nav/footer text reuses the canonical nav.* / footer.* / mob.* keys instead
of this script minting fresh page-specific keys for nav text that happens
to be untagged on a given page.
"""
import os
import re
import json
import html
from bs4 import BeautifulSoup, Comment

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_EXTRACT = os.path.join(ROOT, 'scripts', '_extracted_en.json')

SKIP_PARENT_TAGS = {'script', 'style', 'svg', 'path', 'noscript', 'template'}

TEXT_TAGS = {
    'a', 'p', 'span', 'div', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'button', 'label', 'strong', 'em', 'small', 'td', 'th', 'figcaption',
    'blockquote', 'option', 'summary', 'dt', 'dd', 'caption', 'legend'
}

INLINE_MARKUP_TAGS = {'em', 'strong', 'br', 'sup', 'sub', 'b', 'i', 'span'}

ICON_FONT_CLASSES = {'material-symbols-outlined', 'material-icons', 'material-icons-outlined', 'icon', 'fa', 'fas', 'far', 'fab'}


def is_icon_font_element(el):
    classes = el.get('class') or []
    if isinstance(classes, str):
        classes = classes.split()
    return any(c in ICON_FONT_CLASSES for c in classes)

NUMERIC_RE = re.compile(r'^[\d\s.,%/+\-:$€£#]*$')
FLAG_RE = re.compile(r'^[\U0001F1E6-\U0001F1FF\s]+$')
COUNTRY_CODE_RE = re.compile(r'^[A-Z]{2,4}$')


def is_trivial(text):
    t = text.strip()
    if not t:
        return True
    if NUMERIC_RE.match(t):
        return True
    if FLAG_RE.match(t):
        return True
    if COUNTRY_CODE_RE.match(t) and len(t) <= 4:
        return True
    if t in {'/', '|', '&rarr;', '→', '·', '-', '—', '&#9662;', '▾'}:
        return True
    if len(t) <= 1:
        return True
    return False


def has_direct_text(el):
    parts = []
    for child in el.children:
        if isinstance(child, Comment):
            continue
        if getattr(child, 'name', None) is None:
            parts.append(str(child))
        elif child.name in INLINE_MARKUP_TAGS:
            parts.append(child.get_text())
    return ''.join(parts).strip()


def get_inner_html_if_markup(el):
    has_markup = any(
        getattr(c, 'name', None) in INLINE_MARKUP_TAGS for c in el.children
    )
    has_bare_text = any(
        getattr(c, 'name', None) is None and str(c).strip()
        for c in el.children
    )
    if has_markup and has_bare_text:
        return ''.join(str(c) for c in el.children).strip()
    return None


def already_tagged_ancestor(el):
    p = el.parent
    while p is not None and getattr(p, 'name', None):
        if p.has_attr('data-i18n'):
            return True
        p = p.parent
    return False


def slugify_page(filename):
    return os.path.splitext(filename)[0].replace('-', '_')


def find_and_tag(raw, cursor, tag_name, expected_attrs, new_attr_str, content_check=None):
    """
    Find the next opening tag `<tag_name ...>` at or after `cursor` whose
    attribute string contains all of expected_attrs as substrings, AND
    (if content_check is given) whose immediately-following raw text starts
    with content_check. This second condition is critical for elements with
    no distinguishing attributes (e.g. bare <span>), where attribute
    matching alone would happily match the wrong, unrelated tag.

    The prefix check is intentionally strict (no "appears somewhere nearby"
    fallback): a loose "contains" check would happily match a `<span>/</span>`
    immediately followed by `<span>About Us</span>` as if it were the
    "About Us" span, because "About Us" appears a few characters later in
    the lookahead window. Requiring a true prefix match eliminates that.

    The raw lookahead is HTML-entity-decoded before comparison, since
    content_check comes from BeautifulSoup's .get_text()/str() which
    decodes entities (e.g. "&amp;" -> "&"), while the raw file still has
    the literal entity — a naive comparison would otherwise miss every
    string containing an ampersand, apostrophe, etc.
    """
    pat = re.compile(r'<' + re.escape(tag_name) + r'((?:\s[^>]*?)?)>')
    pos = cursor
    while True:
        m = pat.search(raw, pos)
        if not m:
            return raw, cursor, False
        attrs_str = m.group(1) or ''
        attrs_ok = all(a in attrs_str for a in expected_attrs)
        content_ok = True
        if attrs_ok and content_check is not None:
            probe_len = len(content_check) + 20
            following_raw = raw[m.end():m.end() + probe_len]
            following = html.unescape(following_raw).lstrip()
            content_ok = following.startswith(content_check[:probe_len].strip())
        if attrs_ok and content_ok:
            insert_at = m.start() + 1 + len(tag_name)
            new_raw = raw[:insert_at] + new_attr_str + raw[insert_at:]
            new_cursor = m.end() + len(new_attr_str)
            return new_raw, new_cursor, True
        pos = m.end()


def el_disambiguators(el):
    parts = []
    for attr in ('id', 'class', 'href', 'src', 'style', 'name', 'type',
                 'data-lang', 'data-tab', 'data-count', 'rel', 'target',
                 'value', 'placeholder'):
        if el.has_attr(attr):
            val = el.get(attr)
            if isinstance(val, list):
                val = ' '.join(val)
            snippet = f'{attr}="{val}"'
            parts.append(snippet[:80])
    return parts


def process_file(path):
    with open(path, 'r', encoding='utf-8', newline='') as f:
        raw = f.read()

    soup = BeautifulSoup(raw, 'html.parser')
    body = soup.body
    if body is None:
        return {}, raw, False

    page_key = slugify_page(os.path.basename(path))
    extracted = {}
    counter = 1
    changed = False
    cursor = 0

    # ---- Pass 1: unwrap dead data-it spans ----
    for span in body.find_all('span', attrs={'data-it': True}):
        data_it_val = span.get('data-it')
        inner = ''.join(str(c) for c in span.children)
        has_extra_attrs = span.has_attr('class') or span.has_attr('style') or span.has_attr('id')
        if has_extra_attrs:
            pat = re.compile(r'\sdata-it="' + re.escape(data_it_val) + r'"')
            new_raw, n = pat.subn('', raw, count=1)
            if n:
                raw = new_raw
                changed = True
        else:
            old_full = f'<span data-it="{data_it_val}">{inner}</span>'
            if old_full in raw:
                raw = raw.replace(old_full, inner, 1)
                changed = True
            else:
                pat = re.compile(r'\sdata-it="' + re.escape(data_it_val) + r'"')
                new_raw, n = pat.subn('', raw, count=1)
                if n:
                    raw = new_raw
                    changed = True

    soup = BeautifulSoup(raw, 'html.parser')
    body = soup.body

    elements_to_tag = []
    for el in body.find_all(True):
        if el.name in SKIP_PARENT_TAGS:
            continue
        if el.name not in TEXT_TAGS:
            continue
        if el.has_attr('data-i18n'):
            continue
        if already_tagged_ancestor(el):
            continue
        if is_icon_font_element(el):
            continue

        if el.name == 'option':
            txt = el.get_text().strip()
            if is_trivial(txt):
                continue
            elements_to_tag.append((el, 'text', txt))
            continue

        html_markup = get_inner_html_if_markup(el)
        if html_markup is not None and not is_trivial(BeautifulSoup(html_markup, 'html.parser').get_text()):
            elements_to_tag.append((el, 'html', html_markup))
            continue

        direct_text = has_direct_text(el)
        if is_trivial(direct_text):
            continue

        tagged_children = [c for c in el.find_all(True, recursive=False) if c.has_attr('data-i18n')]
        untagged_text_children = [
            c for c in el.find_all(True, recursive=False)
            if c.name in TEXT_TAGS and not c.has_attr('data-i18n')
        ]
        if tagged_children and not direct_text and not untagged_text_children:
            continue

        elements_to_tag.append((el, 'text', direct_text))

    for el, kind, content in elements_to_tag:
        key = f'{page_key}.{counter}'
        disambig = el_disambiguators(el)
        attr_str = f' data-i18n="{key}"' if kind != 'html' else f' data-i18n="{key}" data-i18n-html=""'
        new_raw, new_cursor, ok = find_and_tag(raw, cursor, el.name, disambig, attr_str, content_check=content)
        if ok:
            raw = new_raw
            cursor = new_cursor
            extracted[key] = content
            counter += 1
            changed = True
        else:
            new_raw, new_cursor, ok2 = find_and_tag(raw, 0, el.name, disambig, attr_str, content_check=content)
            if ok2:
                raw = new_raw
                cursor = max(cursor, new_cursor)
                extracted[key] = content
                counter += 1
                changed = True

    soup2 = BeautifulSoup(raw, 'html.parser')
    body2 = soup2.body
    attr_cursor = 0

    for el in body2.find_all(['input', 'textarea']):
        ph = el.get('placeholder')
        if ph and not is_trivial(ph) and not el.has_attr('data-i18n-placeholder'):
            key = f'{page_key}.{counter}'
            old_attr = f'placeholder="{ph}"'
            idx = raw.find(old_attr, attr_cursor)
            if idx == -1:
                idx = raw.find(old_attr)
            if idx != -1:
                insert_at = idx + len(old_attr)
                raw = raw[:insert_at] + f' data-i18n-placeholder="{key}"' + raw[insert_at:]
                attr_cursor = insert_at
                extracted[key] = ph
                counter += 1
                changed = True

    for el in body2.find_all(attrs={'title': True}):
        t = el.get('title')
        if t and not is_trivial(t):
            key = f'{page_key}.{counter}'
            old_attr = f'title="{t}"'
            idx = raw.find(old_attr, 0)
            if idx != -1 and 'data-i18n-title' not in raw[max(0, idx - 200):idx]:
                insert_at = idx + len(old_attr)
                raw = raw[:insert_at] + f' data-i18n-title="{key}"' + raw[insert_at:]
                extracted[key] = t
                counter += 1
                changed = True

    return extracted, raw, changed


def main():
    all_extracted = {}
    total_changed = 0
    for fn in sorted(os.listdir(ROOT)):
        if not fn.endswith('.html'):
            continue
        path = os.path.join(ROOT, fn)
        extracted, new_raw, changed = process_file(path)
        if extracted:
            all_extracted[slugify_page(fn)] = extracted
        if changed:
            with open(path, 'w', encoding='utf-8', newline='') as f:
                f.write(new_raw)
            total_changed += 1
            print(f'tagged {fn}: +{len(extracted)} keys')
        else:
            print(f'no change {fn}')

    with open(OUT_EXTRACT, 'w', encoding='utf-8') as f:
        json.dump(all_extracted, f, ensure_ascii=False, indent=2)

    print(f'\nDone. Files changed: {total_changed}')
    total_keys = sum(len(v) for v in all_extracted.values())
    print(f'Total extracted keys: {total_keys}')


if __name__ == '__main__':
    main()
