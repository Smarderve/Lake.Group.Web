import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dictionaryPath = path.join(root, 'assets', 'i18n-content.json');
const dictionary = JSON.parse(fs.readFileSync(dictionaryPath, 'utf8'));
const locales = ['sw', 'hi', 'ar', 'zh', 'fr', 'es', 'pt'];
const sourceTranslations = new Map();

for (const locale of locales) {
  const candidates = new Map();
  const draftDir = path.join(root, 'scripts', 'i18n-drafts', locale);
  for (const file of fs.readdirSync(draftDir).filter((name) => name.endsWith('.json'))) {
    const draft = JSON.parse(fs.readFileSync(path.join(draftDir, file), 'utf8'));
    for (const row of draft.translations || []) {
      if (!row || typeof row.source !== 'string' || typeof row.translation !== 'string') continue;
      if (!row.translation.trim() || row.translation === row.source) continue;
      const list = candidates.get(row.source) || [];
      list.push({ translation: row.translation, priority: file === 'shared-ui.json' ? 2 : 1 });
      candidates.set(row.source, list);
    }
  }
  sourceTranslations.set(locale, candidates);
}

const result = { ...dictionary };
for (const locale of locales) {
  const candidates = sourceTranslations.get(locale);
  result[locale] = { ...(dictionary[locale] || {}) };
  for (const [key, source] of Object.entries(dictionary.en || {})) {
    const rows = candidates.get(source) || [];
    if (!rows.length) continue;
    const counts = new Map();
    for (const row of rows) {
      const current = counts.get(row.translation) || { count: 0, priority: 0 };
      current.count += 1;
      current.priority = Math.max(current.priority, row.priority);
      counts.set(row.translation, current);
    }
    const best = [...counts.entries()].sort((a, b) => b[1].priority - a[1].priority || b[1].count - a[1].count)[0];
    if (best?.[0] && best[0] !== source) result[locale][key] = best[0];
  }
}

fs.writeFileSync(dictionaryPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
fs.writeFileSync(path.join(root, 'assets', 'i18n-content.js'), `window.__LAKE_I18N_CONTENT__ = ${JSON.stringify(result)};\n`, 'utf8');
console.log('Merged draft translations into canonical dictionary:', dictionaryPath);
