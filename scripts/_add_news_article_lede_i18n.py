#!/usr/bin/env python3
"""Add news_article.10 (hero lede fallback) after news_article.9 in all 6 languages."""
import io
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Aligned with section order: en, fr, sw, pt, es, ar
TRANSLATIONS = [
    '"The latest announcements, expansions and community stories from across Lake Group."',
    '"Les derni\u00e8res annonces, expansions et histoires communautaires de Lake Group."',
    '"Matangazo mapya zaidi, upanuzi na hadithi za jamii kutoka kote Lake Group."',
    '"Os \u00faltimos an\u00fancios, expans\u00f5es e hist\u00f3rias comunit\u00e1rias da Lake Group."',
    '"Los \u00faltimos anuncios, expansiones e historias comunitarias de Lake Group."',
    '"\u0623\u062d\u062f\u062b \u0627\u0644\u0625\u0639\u0644\u0627\u0646\u0627\u062a \u0648\u0627\u0644\u062a\u0648\u0633\u0639\u0627\u062a \u0648\u0642\u0635\u0635 \u0627\u0644\u0645\u062c\u062a\u0645\u0639 \u0645\u0646 \u0645\u062c\u0645\u0648\u0639\u0629 \u0644\u064a\u0643."',
]

FILES = ["assets/i18n-content.json", "assets/i18n-content.js"]

for rel in FILES:
    path = os.path.join(ROOT, rel)
    with io.open(path, "r", encoding="utf-8") as f:
        text = f.read()

    # Split by language section markers to find the right anchor per section.
    # Simple approach: for each section, replace the LAST news_article.9 line
    # before the next section marker with itself + the new key.
    markers = ['"en": {', '"fr": {', '"sw": {', '"pt": {', '"es": {', '"ar": {']
    langs = ["en", "fr", "sw", "pt", "es", "ar"]

    changed = 0
    for i, marker in enumerate(markers):
        start = text.index(marker)
        end = text.index(markers[i + 1]) if i + 1 < len(markers) else len(text)
        section = text[start:end]
        # find last news_article.9 in this section
        key = '"news_article.9"'
        pos = section.rfind(key)
        if pos == -1:
            print(f"{rel}: news_article.9 NOT FOUND in {langs[i]} section")
            continue
        # find end of that line
        eol = section.index("\n", pos)
        line = section[pos:eol]
        indent = line[: len(line) - len(line.lstrip())]
        new_key = f'{indent}"news_article.10": {TRANSLATIONS[i]},'
        insertion = "\n" + new_key
        section = section[:eol] + insertion + section[eol:]
        text = text[:start] + section + text[end:]
        changed += 1

    with io.open(path, "w", encoding="utf-8", newline="") as f:
        f.write(text)
    print(f"{rel}: inserted in {changed} language sections")
