import io, json

# en master: flat {key: value}
master = json.load(io.open('scripts/_master_en.json', encoding='utf-8'))
master['hero.ctaPrimary'] = 'Explore Our Companies'
master['hero.ctaSecondary'] = 'Our Story'
io.open('scripts/_master_en.json', 'w', encoding='utf-8', newline='').write(
    json.dumps(master, ensure_ascii=False, indent=2))

# hi/ar cache: {lang: {key: {src, dst}}}
hiar = json.load(io.open('scripts/_hi_ar_cache.json', encoding='utf-8'))
hiar['hi']['hero.ctaPrimary'] = {'src': 'Explore Our Companies', 'dst': 'हमारी कंपनियों का अन्वेषण करें'}
hiar['hi']['hero.ctaSecondary'] = {'src': 'Our Story', 'dst': 'हमारी कहानी'}
hiar['ar']['hero.ctaPrimary'] = {'src': 'Explore Our Companies', 'dst': 'استكشف شركاتنا'}
hiar['ar']['hero.ctaSecondary'] = {'src': 'Our Story', 'dst': 'قصتنا'}
io.open('scripts/_hi_ar_cache.json', 'w', encoding='utf-8', newline='').write(
    json.dumps(hiar, ensure_ascii=False))

# pt/es cache
ptes = json.load(io.open('scripts/_pt_es_cache.json', encoding='utf-8'))
ptes['pt']['hero.ctaPrimary'] = {'src': 'Explore Our Companies', 'dst': 'Explorar as nossas empresas'}
ptes['pt']['hero.ctaSecondary'] = {'src': 'Our Story', 'dst': 'A nossa história'}
ptes['es']['hero.ctaPrimary'] = {'src': 'Explore Our Companies', 'dst': 'Explorar nuestras empresas'}
ptes['es']['hero.ctaSecondary'] = {'src': 'Our Story', 'dst': 'Nuestra historia'}
io.open('scripts/_pt_es_cache.json', 'w', encoding='utf-8', newline='').write(
    json.dumps(ptes, ensure_ascii=False))

print('JSON i18n sources updated:', len(master), 'master keys; hi/ar + pt/es caches patched')
