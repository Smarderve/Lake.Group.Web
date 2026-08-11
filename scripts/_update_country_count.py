"""Update Lake Group's country count 9 -> 10 across the whole site (all languages).

Strategy:
- EN files: global replacements of the 9-count phrases.
- i18n data files (json/js): per-key - only translate a key's value in other
  languages when that key's ENGLISH value mentions the group-total country
  count, so company-specific counts (Lake Gas 6, Lake Lubes 5, etc.) stay.
- Where lists enumerate countries, add Uganda (the 10th) so counts stay true.
"""
import json
import re
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

EN_REPLACEMENTS = [
    ('9 countries', '10 countries'),
    ('9 Countries', '10 Countries'),
    ('nine countries', 'ten countries'),
    ('Nine countries', 'Ten countries'),
    ('Nine Countries', 'Ten Countries'),
    ('9 nations', '10 nations'),
]

GROUP_MARKER = re.compile(r'9 countr|nine countr|9 nations|Nine Countr|9 Countr', re.I)

LANG_REPLACEMENTS = {
    'fr': [('9 pays', '10 pays'), ('neuf pays', 'dix pays'), ('9 Pays', '10 Pays')],
    'sw': [('nchi 8', 'nchi 10'), ('nchi 9', 'nchi 10'), ('nchi nane', 'nchi kumi'),
           ('nchi tisa', 'nchi kumi'), ('mataifa 8', 'mataifa 10'), ('mataifa 9', 'mataifa 10')],
    'pt': [('9 países', '10 países'), ('nove países', 'dez países'), ('9 paises', '10 paises')],
    'es': [('9 países', '10 países'), ('nueve países', 'diez países'), ('9 paises', '10 paises')],
    'ar': [('٩ دول', '١٠ دول'), ('تسع دول', 'عشر دول'), ('٨ دول', '١٠ دول')],
    'hi': [('9 देश', '10 देश'), ('नौ देश', 'दस देश')],
}


def apply_en(s):
    for a, b in EN_REPLACEMENTS:
        s = s.replace(a, b)
    return s


def apply_lang(lang, s):
    for a, b in LANG_REPLACEMENTS.get(lang, []):
        s = s.replace(a, b)
    return s


def update_i18n_obj(obj):
    """obj = {lang: {key: value}}. Returns (changed_count, list of (lang,key))."""
    en = obj.get('en', {})
    touched = []
    for lang, block in obj.items():
        if lang == 'en':
            for k, v in block.items():
                if isinstance(v, str) and GROUP_MARKER.search(v):
                    nv = apply_en(v)
                    if nv != v:
                        block[k] = nv
                        touched.append((lang, k))
        else:
            for k, v in block.items():
                if not isinstance(v, str):
                    continue
                en_val = en.get(k, '')
                # touch only keys whose EN value carries the group-total count
                if isinstance(en_val, str) and GROUP_MARKER.search(en_val):
                    nv = apply_lang(lang, v)
                    if nv != v:
                        block[k] = nv
                        touched.append((lang, k))
            # safety pass: any leftover literal group counts in this lang block
            for k, v in block.items():
                if isinstance(v, str) and GROUP_MARKER.search(apply_en(v)):
                    nv = apply_lang(lang, v)
                    if nv != v:
                        block[k] = nv
                        touched.append((lang + '*', k))
    return touched


# --------------------------------------------------------------------------
# 1. i18n-content.json (master)
# --------------------------------------------------------------------------
with open('assets/i18n-content.json', encoding='utf-8') as f:
    data = json.load(f)
t1 = update_i18n_obj(data)
with open('assets/i18n-content.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
print(f'i18n-content.json: {len(t1)} translations updated')
for lang, k in t1[:6]:
    print('   ', lang, k)

# --------------------------------------------------------------------------
# 2. i18n-content.js (runtime) - same object under window.__LAKE_I18N_CONTENT__
# --------------------------------------------------------------------------
js = open('assets/i18n-content.js', encoding='utf-8').read()
m = re.search(r'(window\.__LAKE_I18N_CONTENT__\s*=\s*)(\{.*\})(;?\s*$)', js, re.S)
assert m, 'cannot parse i18n-content.js wrapper'
js_obj = json.loads(m.group(2))
t2 = update_i18n_obj(js_obj)
js_out = m.group(1) + json.dumps(js_obj, ensure_ascii=False, indent=2) + m.group(3)
# preserve original ending (newline count) - keep simple, ensure trailing newline
if not js_out.endswith('\n'):
    js_out += '\n'
open('assets/i18n-content.js', 'w', encoding='utf-8', newline='') .write(js_out)
print(f'i18n-content.js: {len(t2)} translations updated')

# --------------------------------------------------------------------------
# 3. scripts/_master_en.json (EN source of truth)
# --------------------------------------------------------------------------
with open('scripts/_master_en.json', encoding='utf-8') as f:
    master = json.load(f)
t3 = update_i18n_obj(master)
with open('scripts/_master_en.json', 'w', encoding='utf-8') as f:
    json.dump(master, f, ensure_ascii=False, indent=2)
print(f'_master_en.json: {len(t3)} updated')

# --------------------------------------------------------------------------
# 4. translation caches (rebuild sources)
# --------------------------------------------------------------------------
for path in ['scripts/_pt_es_cache.json', 'scripts/_hi_ar_cache.json', 'scripts/_extracted_en.json']:
    if not os.path.exists(path):
        continue
    with open(path, encoding='utf-8') as f:
        cache = json.load(f)
    t = update_i18n_obj(cache)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)
    print(f'{os.path.basename(path)}: {len(t)} updated')

# --------------------------------------------------------------------------
# 5. news-data.js (runtime news)
# --------------------------------------------------------------------------
nd = open('assets/news-data.js', encoding='utf-8').read()
before = nd
nd = nd.replace('to 9 nations: Tanzania, Kenya, Zambia, Rwanda, Burundi, DR Congo, Ethiopia, Mozambique, and now Uganda.',
                'to 10 nations: Tanzania, Kenya, Zambia, Rwanda, Burundi, DR Congo, Ethiopia, Mozambique, Uganda and the UAE (Dubai).')
nd = apply_en(nd)
if nd != before:
    open('assets/news-data.js', 'w', encoding='utf-8', newline='').write(nd)
    print('news-data.js: updated')

# --------------------------------------------------------------------------
# 6. HTML fallback text (visible without JS / before i18n applies)
# --------------------------------------------------------------------------
html_files = [
    'about.html', 'africa-network.html', 'careers.html', 'csr.html', 'index.html',
    'investors.html', 'lake-group-org-chart.html', 'lake-oil.html', 'our-story.html',
    'projects.html', 'services.html', 'sustainability.html', 'gallery.html',
]
for path in html_files:
    if not os.path.exists(path):
        continue
    s = open(path, encoding='utf-8').read()
    before = s
    s = apply_en(s)
    # enumerated-list fixes (add Uganda / UAE as the 10th)
    s = s.replace('across nine countries  Tanzania, Kenya, Zambia, Rwanda,\n              Burundi, DR Congo, Ethiopia and Mozambique  with a Dubai hub',
                  'across ten countries  Tanzania, Kenya, Zambia, Rwanda,\n              Burundi, DR Congo, Ethiopia, Mozambique and Uganda  with a Dubai hub')
    s = s.replace('across nine countries  Tanzania, Kenya, Zambia, Rwanda, Burundi, DR Congo, Ethiopia and Mozambique  with a Dubai hub',
                  'across ten countries  Tanzania, Kenya, Zambia, Rwanda, Burundi, DR Congo, Ethiopia, Mozambique and Uganda  with a Dubai hub')
    if path == 'lake-group-org-chart.html':
        s = s.replace('🌍 Tanzania · Kenya · Zambia · Burundi · DRC · Rwanda · Ethiopia · Mozambique · Uganda<br>',
                      '🌍 Tanzania · Kenya · Zambia · Burundi · DRC · Rwanda · Ethiopia · Mozambique · Uganda · UAE (Dubai)<br>')
    if s != before:
        open(path, 'w', encoding='utf-8', newline='').write(s)
        print(f'{path}: updated')

print('done')
