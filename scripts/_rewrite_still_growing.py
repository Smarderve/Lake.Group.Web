#!/usr/bin/env python3
"""Replace the AI-sounding 'Still Growing' timeline copy with a grounded,
company-style statement across all i18n sources and page fallbacks.

Targets:
  - history.27 (Today timeline heading)  : '30,000+ ... Still Growing.' -> '30,000+ People. 9 Countries. One Standard of Excellence.'
  - history.28 (Today timeline body)     : AI filler -> concrete company statement
  - ose.s8.label (about/our-story ending caption) : 'still growing' -> 'built to last'
"""
import io
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Ordered replacements: (old, new). Applied to every target file.
PAIRS = [
    # --- EN ---
    ("30,000+ Employees. 8 Countries. Still Growing.",
     "30,000+ People. 9 Countries. One Standard of Excellence."),
    ("30,000+ employees. 9 Countries. Still Growing.",
     "30,000+ People. 9 Countries. One Standard of Excellence."),
    ("Lake Group continues to expand, deepening its regional footprint, investing in new technologies, and driving economic development across East and Central Africa.",
     "What began as a single fuel outlet in 2006 now spans energy, logistics and manufacturing across nine countries - 30,000+ people working to the same standard that built the Group."),
    ('"still growing"', '"built to last"'),
    (">still growing<", ">built to last<"),
    # --- FR ---
    ("Plus de 30 000 employ\u00e9s. 8 pays. Toujours en croissance.",
     "Plus de 30 000 collaborateurs. 9 pays. Un m\u00eame niveau d'exigence."),
    ("Lake Group continue de se d\u00e9velopper, renfor\u00e7ant son empreinte r\u00e9gionale, investissant dans de nouvelles technologies et stimulant le d\u00e9veloppement \u00e9conomique en Afrique de l'Est et centrale.",
     "Ce qui a commenc\u00e9 comme un seul point de vente de carburant en 2006 couvre aujourd'hui l'\u00e9nergie, la logistique et la fabrication dans neuf pays - plus de 30 000 personnes travaillant selon la m\u00eame exigence qui a b\u00e2ti le Groupe."),
    ("toujours en croissance", "construit pour durer"),
    # --- SW ---
    ("Wafanyakazi 30,000+. Nchi 8. Bado Tunakua.",
     "Watu 30,000+. Nchi 9. Kiwango Kimoja cha Ubora."),
    ("Lake Group inaendelea kupanuka, ikiimarisha uwepo wake wa kikanda, ikiwekeza katika teknolojia mpya, na kuchochea maendeleo ya kiuchumi kote Afrika Mashariki na Kati.",
     "Kilichuanza kama kituo kimoja cha mafuta mwaka 2006 sasa kinajumuisha nishati, usafirishaji na utengenezaji katika nchi tisa - watu 30,000+ wakifanya kazi kwa kiwango kile kile kilichojenga Kundi."),
    ("bado tunakua", "imejengwa kudumu"),
    # --- PT ---
    ("Mais de 30.000 funcion\u00e1rios. 8 pa\u00edses. Ainda crescendo.",
     "Mais de 30.000 pessoas. 9 pa\u00edses. Um padr\u00e3o de excel\u00eancia."),
    ("O Lake Group continua a expandir-se, aprofundando a sua presen\u00e7a regional, investindo em novas tecnologias e impulsionando o desenvolvimento econ\u00f3mico na \u00c1frica Oriental e Central.",
     "O que come\u00e7ou como um \u00fanico posto de combust\u00edvel em 2006 abrange hoje energia, log\u00edstica e produ\u00e7\u00e3o em nove pa\u00edses - mais de 30.000 pessoas trabalhando com o mesmo padr\u00e3o que construiu o Grupo."),
    ("ainda a crescer", "constru\u00eddo para durar"),
    # --- ES ---
    ("M\u00e1s de 30.000 empleados. 8 pa\u00edses. Sigue creciendo.",
     "M\u00e1s de 30.000 personas. 9 pa\u00edses. Un est\u00e1ndar de excelencia."),
    ("Lake Group contin\u00faa expandi\u00e9ndose, profundizando su presencia regional, invirtiendo en nuevas tecnolog\u00edas e impulsando el desarrollo econ\u00f3mico en todo el Este y Central Africa.",
     "Lo que comenz\u00f3 como un \u00fanico surtidor de combustible en 2006 hoy abarca energ\u00eda, log\u00edstica y fabricaci\u00f3n en nueve pa\u00edses: m\u00e1s de 30.000 personas trabajando con el mismo est\u00e1ndar que construy\u00f3 el Grupo."),
    ("sigue creciendo", "construido para durar"),
    # --- AR ---
    ("\u0663\u0660\u066b\u0660\u0660\u0660+ \u0645\u0648\u0638\u0641. 8 \u062f\u0648\u0644. \u0644\u0627 \u062a\u0632\u0627\u0644 \u062a\u0646\u0645\u0648.",
     "\u0623\u0643\u062b\u0631 \u0645\u0646 \u0663\u0660\u066b\u0660\u0660\u0660 \u0645\u0648\u0638\u0641. 9 \u062f\u0648\u0644. \u0645\u0639\u064a\u0627\u0631 \u0648\u0627\u062d\u062f \u0645\u0646 \u0627\u0644\u062a\u0645\u064a\u0632."),
    ("\u062a\u0633\u062a\u0645\u0631 \u0645\u062c\u0645\u0648\u0639\u0629 \u0644\u064a\u0643 \u0641\u064a \u0627\u0644\u062a\u0648\u0633\u0639\u060c \u0648\u062a\u0639\u0645\u064a\u0642 \u0628\u0635\u0645\u062a\u0647\u0627 \u0627\u0644\u0625\u0642\u0644\u064a\u0645\u064a\u0629\u060c \u0648\u0627\u0644\u0627\u0633\u062a\u062b\u0645\u0627\u0631 \u0641\u064a \u0627\u0644\u062a\u0642\u0646\u064a\u0627\u062a \u0627\u0644\u062c\u062f\u064a\u062f\u0629\u060c \u0648\u062f\u0641\u0639 \u0627\u0644\u062a\u0646\u0645\u064a\u0629 \u0627\u0644\u0627\u0642\u062a\u0635\u0627\u062f\u064a\u0629 \u0641\u064a \u062c\u0645\u064a\u0639 \u0623\u0646\u062d\u0627\u0621 \u0627\u0644\u0634\u0631\u0642 \u0648\u0648\u0633\u0637 \u0623\u0641\u0631\u064a\u0642\u064a\u0627.",
     "\u0645\u0627 \u0628\u062f\u0623 \u0643\u0645\u062d\u0637\u0629 \u0648\u0642\u0648\u062f \u0648\u0627\u062d\u062f\u0629 \u0641\u064a \u0639\u0627\u0645 \u0662\u0660\u0660\u0666 \u064a\u063a\u0637\u064a \u0627\u0644\u064a\u0648\u0645 \u0627\u0644\u0637\u0627\u0642\u0629 \u0648\u0627\u0644\u062e\u062f\u0645\u0627\u062a \u0627\u0644\u0644\u0648\u062c\u0633\u062a\u064a\u0629 \u0648\u0627\u0644\u062a\u0635\u0646\u064a\u0639 \u0641\u064a \u062a\u0633\u0639 \u062f\u0648\u0644 - \u0623\u0643\u062b\u0631 \u0645\u0646 \u0663\u0660\u066b\u0660\u0660\u0660 \u0634\u062e\u0635\u0627\u064b \u064a\u0639\u0645\u0644\u0648\u0646 \u0628\u0646\u0641\u0633 \u0627\u0644\u0645\u0639\u064a\u0627\u0631 \u0627\u0644\u0630\u064a \u0628\u0646\u0649 \u0627\u0644\u0645\u062c\u0645\u0648\u0639\u0629."),
    ("\u0644\u0627 \u062a\u0632\u0627\u0644 \u062a\u0646\u0645\u0648", "\u0645\u0628\u0646\u064a\u0629 \u0644\u062a\u062f\u0648\u0645"),
]

FILES = [
    "history.html",
    "about.html",
    "our-story.html",
    "assets/i18n-content.json",
    "assets/i18n-content.js",
    "scripts/_master_en.json",
    "scripts/build_master_en.py",
    "scripts/translation_dict.py",
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

print(f"\nTotal replacements: {total}")
