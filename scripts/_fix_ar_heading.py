#!/usr/bin/env python3
"""Fix the AR history.27 heading in both i18n bundles.

Current (corrupted by the label pass): '\u0663\u0660\u066C\u0660\u0660\u0660+ \u0645\u0648\u0638\u0641. 8 \u062f\u0648\u0644. \u0645\u0628\u0646\u064A\u0629 \u0644\u062A\u062F\u0648\u0645.'
Target:                                    '\u0623\u0643\u062B\u0631 \u0645\u0646 \u0663\u0660\u066C\u0660\u0660\u0660 \u0645\u0648\u0638\u0641. 9 \u062F\u0648\u0644. \u0645\u0639\u064A\u0627\u0631 \u0648\u0627\u062D\u062F \u0645\u0646 \u0627\u0644\u062A\u0645\u064A\u0632.'
"""
import io
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

OLD = ("\u0663\u0660\u066C\u0660\u0660\u0660+ \u0645\u0648\u0638\u0641. 8 \u062F\u0648\u0644. "
       "\u0645\u0628\u0646\u064A\u0629 \u0644\u062A\u062F\u0648\u0645.")
NEW = ("\u0623\u0643\u062B\u0631 \u0645\u0646 \u0663\u0660\u066C\u0660\u0660\u0660 \u0645\u0648\u0638\u0641. 9 \u062F\u0648\u0644. "
       "\u0645\u0639\u064A\u0627\u0631 \u0648\u0627\u062D\u062F \u0645\u0646 \u0627\u0644\u062A\u0645\u064A\u0632.")

for rel in ["assets/i18n-content.json", "assets/i18n-content.js"]:
    path = os.path.join(ROOT, rel)
    with io.open(path, "r", encoding="utf-8") as f:
        text = f.read()
    c = text.count(OLD)
    if c:
        text = text.replace(OLD, NEW)
        with io.open(path, "w", encoding="utf-8", newline="") as f:
            f.write(text)
        print(f"{rel}: {c} AR heading fixed")
    else:
        print(f"{rel}: AR heading NOT FOUND")
        # fall back to the pre-label variant in case one bundle differs
        old2 = ("\u0663\u0660\u066C\u0660\u0660\u0660+ \u0645\u0648\u0638\u0641. 8 \u062F\u0648\u0644. "
                "\u0644\u0627 \u062A\u0632\u0627\u0644 \u062A\u0646\u0645\u0648.")
        c2 = text.count(old2)
        if c2:
            text = text.replace(old2, NEW)
            with io.open(path, "w", encoding="utf-8", newline="") as f:
                f.write(text)
            print(f"{rel}: {c2} AR heading fixed (variant 2)")
