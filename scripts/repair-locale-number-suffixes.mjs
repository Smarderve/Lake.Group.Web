import fs from 'node:fs';

const file = 'assets/i18n-content.json';
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const digits = (value) => String(value).replace(/[٠-٩۰-۹०-९]/gu, (digit) => {
  const code = digit.codePointAt(0);
  return String(code >= 0x0966 ? code - 0x0966 : code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
});
for (const locale of ['sw', 'ar', 'fr', 'es', 'pt', 'hi', 'zh']) {
  for (const [key, source] of Object.entries(data.en)) {
    let value = data[locale]?.[key];
    if (typeof value !== 'string') continue;
    for (const match of String(source).matchAll(/(?<![\w])([\d][\d,.]*)\+/gu)) {
      const raw = match[1];
      const normalized = raw.replace(/[,.]/g, '');
      const pattern = new RegExp(`(?<![\\d])([٠-٩۰-۹०-९\\d][٠-٩۰-۹०-९\\d.,\\u00a0\\u202f ]*${normalized.slice(-1)})(?![\\d])`, 'u');
      const found = value.match(pattern);
      if (found && !new RegExp(`\\+`).test(value.slice(found.index, found.index + found[0].length + 1))) value = `${value.slice(0, found.index)}${found[0]}+${value.slice(found.index + found[0].length)}`;
    }
    data[locale][key] = value;
  }
}
fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
fs.writeFileSync('assets/i18n-content.js', `window.__LAKE_I18N_CONTENT__ = ${JSON.stringify(data)};\n`);
