"""Final sweep: update every remaining 8/9-country group-total reference to 10.
Company-specific counts (e.g. Lake Gas "6 countries", storage "4 countries")
are NOT touched. Group-total enumerations gain Uganda; Dubai hub stays.
Run from repo root."""
import re
import os

os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# --- Pairwise (whole-string-context) fixes, longest first ---
PAIRWISE = [
    # index.20 fallback + i18n variants with enumerated lists
    ('across nine countries  Tanzania, Kenya, Zambia, Rwanda,\n              Burundi, DR Congo, Ethiopia and Mozambique  with a Dubai hub',
     'across ten countries  Tanzania, Kenya, Zambia, Rwanda,\n              Burundi, DR Congo, Ethiopia, Mozambique and Uganda  with a Dubai hub'),
    ('across nine countries  Tanzania, Kenya, Zambia, Rwanda, Burundi, DR Congo, Ethiopia and Mozambique  with a Dubai hub',
     'across ten countries  Tanzania, Kenya, Zambia, Rwanda, Burundi, DR Congo, Ethiopia, Mozambique and Uganda  with a Dubai hub'),
    ('across eight countries  Tanzania, Kenya, Zambia, Rwanda,\n              Burundi, DR Congo, Ethiopia and Mozambique  with a Dubai hub',
     'across ten countries  Tanzania, Kenya, Zambia, Rwanda,\n              Burundi, DR Congo, Ethiopia, Mozambique and Uganda  with a Dubai hub'),
    ('across eight countries  Tanzania, Kenya, Zambia, Rwanda, Burundi, DR Congo, Ethiopia and Mozambique  with a Dubai hub',
     'across ten countries  Tanzania, Kenya, Zambia, Rwanda, Burundi, DR Congo, Ethiopia, Mozambique and Uganda  with a Dubai hub'),
    # news article: Uganda expansion (was "9 nations" with 9 enumerated + implied Dubai)
    ('country presence to 9 nations: Tanzania, Kenya, Zambia, Rwanda, Burundi, DR Congo, Ethiopia, Mozambique, and now Uganda.',
     'country presence to 10 nations: Tanzania, Kenya, Zambia, Rwanda, Burundi, DR Congo, Ethiopia, Mozambique, and now Uganda, alongside its long-standing hub in Dubai.'),
    ('country presence to 9 nations across East and Central Africa.',
     'country presence to 10 nations across East and Central Africa.'),
    ('The group operates a fleet of over 1,200 vehicles, 152+ retail fuel stations, and employs more than 30,000 people.',
     'The group operates a fleet of over 1,200 vehicles, 152+ retail fuel stations, and employs more than 30,000 people.'),
    # org-chart badge
    ('\U0001f30d 9 countries', '\U0001f30d 10 countries'),
]

# --- Regex replacements (safe because group-total phrases are distinct) ---
REGEX = [
    (re.compile(r'across 9 countries in East and Central Africa', re.I), 'across 10 countries in East and Central Africa'),
    (re.compile(r'across 9 countries\.', re.I), 'across 10 countries.'),
    (re.compile(r'across 9 countries and', re.I), 'across 10 countries and'),
    (re.compile(r'across <em>9 countries</em>', re.I), 'across <em>10 countries</em>'),
    (re.compile(r'across 9 countries, with', re.I), 'across 10 countries, with'),
    (re.compile(r'in 9 countries\.', re.I), 'in 10 countries.'),
    (re.compile(r'in 9 countries,', re.I), 'in 10 countries,'),
    (re.compile(r'operating across 9 countries', re.I), 'operating across 10 countries'),
    (re.compile(r'operates across 9 countries', re.I), 'operates across 10 countries'),
    (re.compile(r'operating across 8 countries', re.I), 'operating across 10 countries'),
    (re.compile(r'across 9 countries with', re.I), 'across 10 countries with'),
    (re.compile(r'across 9 countries \.', re.I), 'across 10 countries .'),
    (re.compile(r'across nine countries', re.I), 'across ten countries'),
    (re.compile(r'Nine Countries\.', re.I), 'Ten Countries.'),
    (re.compile(r'to 9 nations', re.I), 'to 10 nations'),
    # French
    (re.compile(r'dans 9 pays', re.I), 'dans 10 pays'),
    (re.compile(r'dans <em>9 pays</em>', re.I), 'dans <em>10 pays</em>'),
    (re.compile(r'dans 9 pays et', re.I), 'dans 10 pays et'),
    (re.compile(r'dans 9 pays d', re.I), 'dans 10 pays d'),
    (re.compile(r'9 pays', re.I), '10 pays'),
    (re.compile(r'neuf pays', re.I), 'dix pays'),
    # Swahili (group-total only: "nchi 8/9", "nchi nane")
    (re.compile(r'nchi 8\b', re.I), 'nchi 10'),
    (re.compile(r'nchi 9\b', re.I), 'nchi 10'),
    (re.compile(r'<em>nchi 8</em>', re.I), '<em>nchi 10</em>'),
    (re.compile(r'nchi nane', re.I), 'nchi kumi'),
    (re.compile(r'mataifa 8\b', re.I), 'mataifa 10'),
    (re.compile(r'mataifa 9\b', re.I), 'mataifa 10'),
    # Portuguese / Spanish
    (re.compile(r'9 pa[íi]ses', re.I), '10 pa\u00edses'),
    (re.compile(r'8 pa[íi]ses', re.I), '10 pa\u00edses'),
    (re.compile(r'nove pa[íi]ses', re.I), 'dez pa\u00edses'),
    (re.compile(r'ocho pa[íi]ses', re.I), 'diez pa\u00edses'),
    # Arabic
    (re.compile(r'\u0669 \u062f\u0648\u0644', re.I), '\u0661\u0660 \u062f\u0648\u0644'),   # ٩ دول -> ١٠ دول
    (re.compile(r'\u0668 \u062f\u0648\u0644', re.I), '\u0661\u0660 \u062f\u0648\u0644'),   # ٨ دول -> ١٠ دول
    # Hindi
    (re.compile(r'9 \u0926\u0947\u0936', re.I), '10 \u0926\u0947\u0936'),
    (re.compile(r'8 \u0926\u0947\u0936', re.I), '10 \u0926\u0947\u0936'),
]

HTML_FILES = [
    'about.html', 'africa-network.html', 'careers.html', 'csr.html',
    'index.html', 'investors.html', 'lake-oil.html', 'our-story.html',
    'lake-group-org-chart.html', 'docs/developer-guide.html',
]

def apply(text):
    for a, b in PAIRWISE:
        text = text.replace(a, b)
    for rx, rep in REGEX:
        text = rx.sub(rep, text)
    return text

total = 0
for fn in HTML_FILES:
    if not os.path.exists(fn):
        continue
    src = open(fn, encoding='utf-8').read()
    nxt = apply(src)
    if nxt != src:
        open(fn, 'w', encoding='utf-8', newline='').write(nxt)
        n = sum(1 for a, _ in PAIRWISE if a in src) + sum(len(rx.findall(src)) for rx, _ in REGEX)
        total += 1
        print(f'{fn}: updated ({n} occurrences)')

# news-data.js
fn = 'assets/news-data.js'
src = open(fn, encoding='utf-8').read()
nxt = apply(src)
if nxt != src:
    open(fn, 'w', encoding='utf-8', newline='').write(nxt)
    total += 1
    print(f'{fn}: updated')

# build_assistant_kb.js curated facts
fn = 'scripts/build_assistant_kb.js'
src = open(fn, encoding='utf-8').read()
nxt = apply(src)
if nxt != src:
    open(fn, 'w', encoding='utf-8', newline='').write(nxt)
    total += 1
    print(f'{fn}: updated')

# i18n-content.js translated strings (en handled earlier, but sweep anyway)
fn = 'assets/i18n-content.js'
src = open(fn, encoding='utf-8').read()
nxt = apply(src)
if nxt != src:
    open(fn, 'w', encoding='utf-8', newline='').write(nxt)
    total += 1
    print(f'{fn}: translated strings updated')

print(f'\n{total} files updated. done.')
