const fs = require('fs');

const replacements = {
  en: { from: 'Africa Operations Network', to: 'Operations Network' },
  fr: { from: "Réseau d'opérations en Afrique", to: "Réseau d'opérations" },
  sw: { from: 'Mtandao wa Shughuli Afrika', to: 'Mtandao wa Shughuli' },
  hi: { from: 'अफ़्रीका ऑपरेशंस नेटवर्क', to: 'ऑपरेशंस नेटवर्क' },
  ar: { from: 'شبكة العمليات الأفريقية', to: 'شبكة العمليات' },
};

function patchJson(file) {
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const [lang, { from, to }] of Object.entries(replacements)) {
    if (!j[lang]) continue;
    if (j[lang]['africa_network.3'] !== from) {
      throw new Error(`${file} ${lang} unexpected: ${JSON.stringify(j[lang]['africa_network.3'])}`);
    }
    j[lang]['africa_network.3'] = to;
  }
  fs.writeFileSync(file, JSON.stringify(j, null, 2) + '\n', 'utf8');
  console.log('patched', file);
}

function patchJs(file) {
  const s = fs.readFileSync(file, 'utf8');
  const prefix = 'window.__LAKE_I18N_CONTENT__ = ';
  if (!s.startsWith(prefix)) throw new Error('bad prefix');
  const jsonPart = s.slice(prefix.length).replace(/;\s*$/, '');
  const j = JSON.parse(jsonPart);
  for (const [lang, { from, to }] of Object.entries(replacements)) {
    if (!j[lang]) continue;
    if (j[lang]['africa_network.3'] !== from) {
      throw new Error(`${file} ${lang} unexpected: ${JSON.stringify(j[lang]['africa_network.3'])}`);
    }
    j[lang]['africa_network.3'] = to;
  }
  fs.writeFileSync(file, prefix + JSON.stringify(j) + ';\n', 'utf8');
  console.log('patched', file);
}

patchJson('assets/i18n-content.json');
patchJs('assets/i18n-content.js');

for (const f of ['scripts/_extracted_en.json', 'scripts/_sw_src_1.json', 'scripts/_sw_out_1.json']) {
  if (!fs.existsSync(f)) continue;
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  if (j['africa_network.3'] === 'Africa Operations Network') {
    j['africa_network.3'] = 'Operations Network';
    fs.writeFileSync(f, JSON.stringify(j, null, 2) + '\n', 'utf8');
    console.log('patched flat', f);
  } else if (j.en && j.en['africa_network.3'] === 'Africa Operations Network') {
    j.en['africa_network.3'] = 'Operations Network';
    fs.writeFileSync(f, JSON.stringify(j, null, 2) + '\n', 'utf8');
    console.log('patched nested', f);
  } else if (j['africa_network.3'] === 'Mtandao wa Shughuli Afrika') {
    j['africa_network.3'] = 'Mtandao wa Shughuli';
    fs.writeFileSync(f, JSON.stringify(j, null, 2) + '\n', 'utf8');
    console.log('patched sw out', f);
  } else {
    console.log(
      'skip/no match',
      f,
      JSON.stringify(j['africa_network.3'] || (j.en && j.en['africa_network.3']))
    );
  }
}

const v = JSON.parse(fs.readFileSync('assets/i18n-content.json', 'utf8'));
for (const lang of Object.keys(v)) {
  console.log('verify', lang, v[lang]['africa_network.3']);
}
