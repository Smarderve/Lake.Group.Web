#!/usr/bin/env python3
"""Rename display text 'Biji Lapat' -> 'Biji Alapat' across the codebase.

Only replaces the human-readable name. The lowercase-hyphenated URL slug
('leadership-biji-lapat.html') and image path ('biji-lapat.png') are left
untouched so internal links, sitemap and canonical URLs keep working.
"""
import io
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

FILES = [
    "assets/assistant-kb.js",
    "assets/i18n-content.js",
    "assets/i18n-content.json",
    "DATA_GAPS.md",
    "leadership-ally-edha-awadh.html",
    "leadership-biji-lapat.html",
    "leadership-dileep-kumar.html",
    "leadership.html",
    "scripts/build_leadership_pages.js",
    "scripts/generate_lake_group_massive_report.js",
    "scripts/generate_lake_group_report.js",
    "scripts/_pt_es_cache.json",
]

OLD = "Biji Lapat"
NEW = "Biji Alapat"

total = 0
for rel in FILES:
    path = os.path.join(ROOT, rel)
    with io.open(path, "r", encoding="utf-8") as f:
        text = f.read()
    count = text.count(OLD)
    if count:
        text = text.replace(OLD, NEW)
        with io.open(path, "w", encoding="utf-8", newline="") as f:
            f.write(text)
        total += count
        print(f"{rel}: {count} replacement(s)")
    else:
        print(f"{rel}: no match")

print(f"\nTotal replacements: {total}")
