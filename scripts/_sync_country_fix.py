"""Follow-up: sync i18n-content.json from the corrected i18n-content.js,
add Uganda to enumerated country lists, update _master_en.json (flat EN dict)
and the translation caches."""
import json
import re
import os

os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

UGANDA_FIXES = [
    ('across nine countries  Tanzania, Kenya, Zambia, Rwanda, Burundi, DR Congo, Ethiopia and Mozambique  with a Dubai hub',
     'across ten countries  Tanzania, Kenya, Zambia, Rwanda, Burundi, DR Congo, Ethiopia, Mozambique and Uganda  with a Dubai hub'),
    ('across nine countries  Tanzania, Kenya, Zambia, Rwanda,\n              Burundi, DR Congo, Ethiopia and Mozambique  with a Dubai hub',
     'across ten countries  Tanzania, Kenya, Zambia, Rwanda,\n              Burundi, DR Congo, Ethiopia, Mozambique and Uganda  with a Dubai hub'),
    ('across eight countries  Tanzania, Kenya, Zambia, Rwanda, Burundi, DR Congo, Ethiopia and Mozambique  with a Dubai hub',
     'across ten countries  Tanzania, Kenya, Zambia, Rwanda, Burundi, DR Congo, Ethiopia, Mozambique and Uganda  with a Dubai hub'),
    ('across eight countries  Tanzania, Kenya, Zambia, Rwanda,\n              Burundi, DR Congo, Ethiopia and Mozambique  with a Dubai hub',
     'across ten countries  Tanzania, Kenya, Zambia, Rwanda,\n              Burundi, DR Congo, Ethiopia, Mozambique and Uganda  with a Dubai hub'),
    ('across 8 countries  Tanzania, Kenya, Zambia, Rwanda, Burundi, DR Congo, Ethiopia and Mozambique  with a Dubai hub',
     'across 10 countries  Tanzania, Kenya, Zambia, Rwanda, Burundi, DR Congo, Ethiopia, Mozambique and Uganda  with a Dubai hub'),
]

EN_REPLACEMENTS = [
    ('9 countries', '10 countries'),
    ('9 Countries', '10 Countries'),
    ('nine countries', 'ten countries'),
    ('Nine countries', 'Ten countries'),
    ('Nine Countries', 'Ten Countries'),
    ('9 nations', '10 nations'),
    ('8 countries', '10 countries'),
    ('8 Countries', '10 Countries'),
    ('eight countries', 'ten countries'),
    ('Eight Countries', 'Ten Countries'),
    ('8 nations', '10 nations'),
]

LANG_REPLACEMENTS = {
    'fr': [('8 pays', '10 pays'), ('9 pays', '10 pays'), ('neuf pays', 'dix pays'), ('huit pays', 'dix pays')],
    'sw': [('nchi 8', 'nchi 10'), ('nchi 9', 'nchi 10'), ('nchi nane', 'nchi kumi'), ('nchi tisa', 'nchi kumi'),
           ('mataifa 8', 'mataifa 10'), ('mataifa 9', 'mataifa 10')],
    'pt': [('8 países', '10 países'), ('9 países', '10 países'), ('oito países', 'dez países'),
           ('nove países', 'dez países'), ('8 paises', '10 paises'), ('9 paises', '10 paises')],
    'es': [('8 países', '10 países'), ('9 países', '10 países'), ('ocho países', 'diez países'),
           ('nueve países', 'diez países'), ('8 paises', '10 paises'), ('9 paises', '10 paises')],
    'ar': [('٨ دول', '١٠ دول'), ('٩ دول', '١٠ دول'), ('تسع دول', 'عشر دول'), ('ثماني دول', 'عشر دول'), ('ثمانية دول', 'عشر دول')],
    'hi': [('9 देश', '10 देश'), ('8 देश', '10 देश'), ('नौ देश', 'दस देश')],
}

GROUP_MARKER = re.compile(r'(8|eight|9|nine|10|ten)\s*(countries|nations|Countries)|8 pays|9 pays|nchi 8|nchi 9|٨ دول|٩ دول', re.I)

# ---- 1. Sync i18n-content.json from i18n-content.js ----
js_src = open('assets/i18n-content.js', encoding='utf-8').read()
m = re.search(r'window\.__LAKE_I18N_CONTENT__\s*=\s*(\{.*\});?\s*$', js_src, re.S)
js_obj = json.loads(m.group(1))

with open('assets/i18n-content.json', encoding='utf-8') as f:
    json_obj = json.load(f)
# full deep sync: json = js for all langs/keys
changed = 0
for lang, block in js_obj.items():
    for k, v in block.items():
        if json_obj.get(lang, {}).get(k) != v:
            json_obj.setdefault(lang, {})[k] = v
            changed += 1
# also drop keys in json not in js (keep identical)
for lang in list(json_obj.keys()):
    if lang in js_obj:
        for k in [k for k in json_obj[lang] if k not in js_obj[lang]]:
            del json_obj[lang][k]
            changed += 1
with open('assets/i18n-content.json', 'w', encoding='utf-8') as f:
    json.dump(json_obj, f, ensure_ascii=False, indent=2)
print(f'i18n-content.json synced from JS ({changed} diffs)')

# ---- 2. _master_en.json - flat EN dict ----
with open('scripts/_master_en.json', encoding='utf-8') as f:
    master = json.load(f)
mch = 0
for k, v in master.items():
    if not isinstance(v, str):
        continue
    nv = v
    for a, b in EN_REPLACEMENTS:
        nv = nv.replace(a, b)
    for a, b in UGANDA_FIXES:
        nv = nv.replace(a, b)
    if nv != v:
        master[k] = nv
        mch += 1
with open('scripts/_master_en.json', 'w', encoding='utf-8') as f:
    json.dump(master, f, ensure_ascii=False, indent=2)
print(f'_master_en.json: {mch} values updated')

# ---- 3. translation caches ----
for path in ['scripts/_pt_es_cache.json', 'scripts/_hi_ar_cache.json', 'scripts/_extracted_en.json']:
    if not os.path.exists(path):
        continue
    with open(path, encoding='utf-8') as f:
        cache = json.load(f)
    cch = 0
    for lang, block in cache.items():
        if not isinstance(block, dict):
            continue
        reps = EN_REPLACEMENTS if lang == 'en' else LANG_REPLACEMENTS.get(lang, [])
        for k, v in block.items():
            if not isinstance(v, str):
                continue
            nv = v
            for a, b in reps:
                nv = nv.replace(a, b)
            for a, b in UGANDA_FIXES:
                nv = nv.replace(a, b)
            if nv != v:
                block[k] = nv
                cch += 1
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)
    print(f'{os.path.basename(path)}: {cch} updated')

# ---- 4. verify no group-total 8/9-count left in JS (en) ----
s = json.dumps(js_obj, ensure_ascii=False)
left = len(re.findall(r'\b(?:9|eight|8)\b\s*(?:countries|nations)|9 Countries|8 Countries', s, re.I))
print('remaining 8/9 country mentions in i18n-content.js:', left)
print('done')
