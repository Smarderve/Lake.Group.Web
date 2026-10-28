import fs from 'node:fs';

const file = 'assets/i18n-content.json';
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
for (const locale of ['sw', 'ar', 'fr', 'es', 'pt', 'hi', 'zh']) {
  for (const [key, source] of Object.entries(data.en)) {
    const value = data[locale]?.[key];
    if (typeof value !== 'string') continue;
    const tags = [...source.matchAll(/<([a-z][\w-]*)\b[^>]*>([\s\S]*?)<\/\1>/gi)];
    if (!tags.length || /<([a-z][\w-]*)\b[^>]*>/i.test(value)) continue;
    const tag = tags[0];
    const open = tag[0].slice(0, tag[0].indexOf('>') + 1);
    const close = `</${tag[1]}>`;
    if (!tag[2].trim()) data[locale][key] = `${open}${close}${value}`;
    else {
      const match = value.match(/^(.*?[.!?।])\s+(.+)$/u);
      data[locale][key] = match ? `${match[1]} <${tag[1]}>${match[2]}</${tag[1]}>` : `${open}${value}${close}`;
    }
  }
}
fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
fs.writeFileSync('assets/i18n-content.js', `window.__LAKE_I18N_CONTENT__ = ${JSON.stringify(data)};\n`);
