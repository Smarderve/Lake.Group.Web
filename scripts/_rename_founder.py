#!/usr/bin/env python3
"""Rename Ally Edha Awadh's title 'Founder' -> 'Founder' across the codebase.

Ordered replacements so longer phrases are handled before the generic string,
avoiding duplicates like 'Founder and Founder'. Includes the 6 translated
language variants of leadership.8 and the PT/ES/HI/AR translation caches.
"""
import io
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SKIP_DIRS = {"node_modules", ".git", ".freebuff", ".next", ".vercel", "archive", "backend"}

# Ordered: (old, new) — longer/more specific phrases first.
REPLACEMENTS = [
    # English phrase variants (specific first)
    ("Founder of Lake Group", "Founder of Lake Group"),
    ("the Founder and Owner of Lake Group", "the Founder and Owner of Lake Group"),
    ("Founder", "Founder"),
    ("Founder", "Founder"),
    ("who serves as Founder.", "who serves as Founder."),
    ("(Founder)", "(Founder)"),
    # Main title (raw + HTML-entity versions)
    ("Founder & Owner", "Founder & Owner"),
    ("Founder &amp; Owner", "Founder &amp; Owner"),
    # Descriptive labels
    ("Founder slot", "Founder slot"),
    ("Founder alone, centered", "Founder alone, centered"),
    # Generic fallback
    ("Founder", "Founder"),
    # Translated leadership.8 variants (i18n bundles + caches)
    ("Fondateur & Propriétaire", "Fondateur & Propriétaire"),
    ("Mwanzilishi & Mmiliki", "Mwanzilishi & Mmiliki"),
    ("Fundador e Proprietário", "Fundador e Proprietário"),
    ("Fundador y propietario", "Fundador y propietario"),
    ("المؤسس والمالك", "المؤسس والمالك"),
    ("संस्थापक एवं स्वामी", "संस्थापक एवं स्वामी"),
]

EXTS = (".html", ".js", ".json", ".md", ".py", ".txt", ".css")

total = 0
changed_files = []
for dirpath, dirnames, filenames in os.walk(ROOT):
    dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
    for fn in filenames:
        if not fn.endswith(EXTS):
            continue
        path = os.path.join(dirpath, fn)
        try:
            with io.open(path, "r", encoding="utf-8") as f:
                text = f.read()
        except (UnicodeDecodeError, PermissionError):
            continue
        if "Founder" not in text and "Président exécutif" not in text \
           and "Mwenyekiti Mtendaji" not in text and "الرئيس التنفيذي" not in text \
           and "Presidente Executivo" not in text and "Presidente ejecutivo" not in text \
           and "कार्यकारी अध्यक्ष" not in text:
            continue
        count = 0
        for old, new in REPLACEMENTS:
            count += text.count(old)
            text = text.replace(old, new)
        if count:
            with io.open(path, "w", encoding="utf-8", newline="") as f:
                f.write(text)
            total += count
            changed_files.append(f"{os.path.relpath(path, ROOT)}: {count}")

print("\n".join(changed_files) if changed_files else "No changes.")
print(f"\nTotal replacements: {total} in {len(changed_files)} files")
