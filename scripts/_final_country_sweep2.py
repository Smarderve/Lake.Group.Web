"""Second sweep: fix the remaining 8/9-country references found after the first pass."""
import os

os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

REPL = [
    ('distributing fuel to 9 countries with 1,200+ trucks', 'distributing fuel to 10 countries with 1,200+ trucks'),
    ('bulk supply and storage across 9 countries.', 'bulk supply and storage across 10 countries.'),
    ('Operations across 9 countries plus Dubai.', 'Operations across 10 countries plus Dubai.'),
    ('operating across 9 countries, Lake Group recognises', 'operating across 10 countries, Lake Group recognises'),
    ('Local jobs created across 9 countries', 'Local jobs created across 10 countries'),
    # docs/developer-guide.html
    ('operational footprint across 8 countries + Dubai', 'operational footprint across 10 countries + Dubai'),
    ('Animated counters: 30,000+ employees, 1,200+ trucks, 152 stations, 8 countries.',
     'Animated counters: 30,000+ employees, 1,200+ trucks, 152 stations, 10 countries.'),
    ('bulk supply across 8 countries.', 'bulk supply across 10 countries.'),
    ('Top 5 distributor Tanzania; 152 stations; 8 countries',
     'Top 5 distributor Tanzania; 152 stations; 10 countries'),
    # README / chat-summary (historical context is fine, but unify counts)
    ('(30,000+ employees, 1,200+ trucks, 152 stations, 8 countries) with a link',
     '(30,000+ employees, 1,200+ trucks, 152 stations, 10 countries) with a link'),
]

files = ['projects.html', 'services.html', 'sustainability.html',
         'docs/developer-guide.html', 'README.md']
for fn in files:
    src = open(fn, encoding='utf-8').read()
    nxt = src
    for a, b in REPL:
        nxt = nxt.replace(a, b)
    if nxt != src:
        open(fn, 'w', encoding='utf-8', newline='').write(nxt)
        print(f'{fn}: updated')
print('done')
