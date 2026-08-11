#!/usr/bin/env python3
"""Final pass: fix remaining variants with exact strings (FR in JS, AR heading,
translation caches and extracted JSON)."""
import io
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

PAIRS = [
    # FR js bundle variant ('9 pays')
    ("Plus de 30 000 employ\u00e9s. 9 pays. Toujours en croissance.",
     "Plus de 30 000 collaborateurs. 9 pays. Un m\u00eame niveau d'exigence."),
    # translation_dict EN->FR value with stale '4 600 employ\u00e9s'
    ("\"30,000+ People. 9 Countries. One Standard of Excellence.\": \"Plus de 4 600 employ\u00e9s. 9 pays. Toujours en croissance.\"",
     "\"30,000+ People. 9 Countries. One Standard of Excellence.\": \"Plus de 30 000 collaborateurs. 9 pays. Un m\u00eame niveau d'exigence.\""),
    # AR heading: current broken state (\u0645\u0628\u0646\u064a\u0629 \u0644\u062a\u062f\u0648\u0645 suffix)
    ("\u0663\u0660\u066b\u0660\u0660\u0660+ \u0645\u0648\u0638\u0641. 8 \u062f\u0648\u0644. \u0645\u0628\u0646\u064a\u0629 \u0644\u062a\u062f\u0648\u0645.",
     "\u0623\u0643\u062b\u0631 \u0645\u0646 \u0663\u0660\u066b\u0660\u0660\u0660 \u0645\u0648\u0638\u0641. 9 \u062f\u0648\u0644. \u0645\u0639\u064a\u0627\u0631 \u0648\u0627\u062d\u062f \u0645\u0646 \u0627\u0644\u062a\u0645\u064a\u0632."),
    # extracted EN json
    ("30,000+ Employees. 9 Countries. Still Growing.",
     "30,000+ People. 9 Countries. One Standard of Excellence."),
    # sw cache src keys
    ("\"ose.s8.label\": {\"src\": \"still growing\"",
     "\"ose.s8.label\": {\"src\": \"built to last\""),
    ("\"history.27\": \"Wafanyakazi 30,000+. Nchi 8. Bado Tunakua.\"",
     "\"history.27\": \"Watu 30,000+. Nchi 9. Kiwango Kimoja cha Ubora.\""),
    ("\"history.28\": \"Lake Group inaendelea kupanuka, ikiimarisha uwepo wake wa kikanda, ikiwekeza katika teknolojia mpya, na kuchochea maendeleo ya kiuchumi kote Afrika Mashariki na Kati.\"",
     "\"history.28\": \"Kilichuanza kama kituo kimoja cha mafuta mwaka 2006 sasa kinajumuisha nishati, usafirishaji na utengenezaji katika nchi tisa - watu 30,000+ wakifanya kazi kwa kiwango kile kile kilichojenga Kundi.\""),
]

FILES = [
    "assets/i18n-content.js",
    "scripts/translation_dict.py",
    "scripts/_extracted_en.json",
    "scripts/_hi_ar_cache.json",
    "scripts/_sw_out_1.json",
    "scripts/_sw_out_3.json",
    "scripts/_sw_src_1.json",
    "scripts/_sw_src_3.json",
]

total = 0
for rel in FILES:
    path = os.path.join(ROOT, rel)
    try:
        with io.open(path, "r", encoding="utf-8") as f:
            text = f.read()
    except (UnicodeDecodeError, FileNotFoundError):
        print(f"{rel}: skipped")
        continue
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
