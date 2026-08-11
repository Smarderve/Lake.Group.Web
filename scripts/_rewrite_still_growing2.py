#!/usr/bin/env python3
"""Second pass: fix remaining 'Still Growing' variants with exact strings."""
import io
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

PAIRS = [
    # EN (js bundle uses '9 Countries', capital E)
    ("30,000+ Employees. 9 Countries. Still Growing.",
     "30,000+ People. 9 Countries. One Standard of Excellence."),
    # PT (js bundle uses '9 pa\u00edses')
    ("Mais de 30.000 funcion\u00e1rios. 9 pa\u00edses. Ainda crescendo.",
     "Mais de 30.000 pessoas. 9 pa\u00edses. Um padr\u00e3o de excel\u00eancia."),
    # ES (js bundle uses '9 pa\u00edses')
    ("M\u00e1s de 30.000 empleados. 9 pa\u00edses. Sigue creciendo.",
     "M\u00e1s de 30.000 personas. 9 pa\u00edses. Un est\u00e1ndar de excelencia."),
    # AR heading: partially replaced by the label pass (8 \u062f\u0648\u0644. \u0645\u0628\u0646\u064a\u0629 \u0644\u062a\u062f\u0648\u0645)
    ("\u0663\u0660\u066b\u0660\u0660\u0660+ \u0645\u0648\u0638\u0641. 8 \u062f\u0648\u0644. \u0645\u0628\u0646\u064a\u0629 \u0644\u062a\u062f\u0648\u0645.",
     "\u0623\u0643\u062b\u0631 \u0645\u0646 \u0663\u0660\u066b\u0660\u0660\u0660 \u0645\u0648\u0638\u0641. 9 \u062f\u0648\u0644. \u0645\u0639\u064a\u0627\u0631 \u0648\u0627\u062d\u062f \u0645\u0646 \u0627\u0644\u062a\u0645\u064a\u0632."),
    ("\u0663\u0660\u066b\u0660\u0660\u0660+ \u0645\u0648\u0638\u0641. 8 \u062f\u0648\u0644. \u0644\u0627 \u062a\u0632\u0627\u0644 \u062a\u0646\u0645\u0648.",
     "\u0623\u0643\u062b\u0631 \u0645\u0646 \u0663\u0660\u066b\u0660\u0660\u0660 \u0645\u0648\u0638\u0641. 9 \u062f\u0648\u0644. \u0645\u0639\u064a\u0627\u0631 \u0648\u0627\u062d\u062f \u0645\u0646 \u0627\u0644\u062a\u0645\u064a\u0632."),
    # AR ose.s8.label correctly = \u0645\u0628\u0646\u064a\u0629 \u0644\u062a\u062f\u0648\u0645 (built to last) - keep
    # translation_dict.py keys (EN -> FR/PT)
    ("\"30,000+ Employees. 9 Countries. Still Growing.\": \"Plus de 4 600 employ\u00e9s. 9 pays. Toujours en croissance.\"",
     "\"30,000+ People. 9 Countries. One Standard of Excellence.\": \"Plus de 30 000 collaborateurs. 9 pays. Un m\u00eame niveau d'exigence.\""),
    ("\"30,000+ Employees. 9 Countries. Still Growing.\": \"Mais de 4.600 colaboradores. 9 pa\u00edses. Ainda a crescer.\"",
     "\"30,000+ People. 9 Countries. One Standard of Excellence.\": \"Mais de 30.000 pessoas. 9 pa\u00edses. Um padr\u00e3o de excel\u00eancia.\""),
]

FILES = ["assets/i18n-content.js", "scripts/translation_dict.py"]

total = 0
for rel in FILES:
    path = os.path.join(ROOT, rel)
    with io.open(path, "r", encoding="utf-8") as f:
        text = f.read()
    count = 0
    for old, new in PAIRS:
        c = text.count(old)
        if c:
            text = text.replace(old, new)
            count += c
    if count:
        with io.open(path, "w", encoding="utf-8", newline="") as f:
            f.write(text)
        total += count
        print(f"{rel}: {count} replacement(s)")
    else:
        print(f"{rel}: no match")

print(f"\nTotal: {total}")
