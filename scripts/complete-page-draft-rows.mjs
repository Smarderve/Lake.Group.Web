import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const queue = JSON.parse(fs.readFileSync(path.join(root, 'scripts/.generated/i18n-extraction-queue.json'), 'utf8'));
const dictionary = JSON.parse(fs.readFileSync(path.join(root, 'assets/i18n-content.json'), 'utf8'));
const locales = ['sw', 'ar', 'fr', 'es', 'pt', 'hi', 'zh'];
const pages = Object.keys(queue.scriptFilesByPage || {}).sort();
const normalize = (value) => String(value ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().toLocaleLowerCase('en');

for (const locale of locales) {
  const draftDir = path.join(root, 'scripts/i18n-drafts', locale);
  const sourceMap = new Map();
  for (const file of fs.readdirSync(draftDir).filter((name) => name.endsWith('.json'))) {
    const draft = JSON.parse(fs.readFileSync(path.join(draftDir, file), 'utf8'));
    for (const row of draft.translations || []) {
      if (row?.source && row?.translation?.trim() && row.translation !== row.source) sourceMap.set(normalize(row.source), row.translation);
    }
  }
  const dictionaryMap = new Map();
  for (const [key, source] of Object.entries(dictionary.en || {})) {
    const translation = dictionary[locale]?.[key];
    if (typeof translation === 'string' && translation.trim() && normalize(translation) !== normalize(source)) dictionaryMap.set(normalize(source), translation);
  }
  for (const page of pages) {
    const draftPath = path.join(draftDir, `${page}.json`);
    if (!fs.existsSync(draftPath)) continue;
    const draft = JSON.parse(fs.readFileSync(draftPath, 'utf8'));
    const rows = new Map((draft.translations || []).map((row) => [`${row.id}\0${row.sourceHash}`, row]));
    let added = 0;
    for (const entry of queue.entries.filter((item) => item.page === page && ['public-visitor-copy', 'terminology-review'].includes(item.classification))) {
      const identity = `${entry.id}\0${entry.sourceHash}`;
      if (rows.has(identity) && rows.get(identity).translation?.trim()) continue;
      const translation = sourceMap.get(normalize(entry.source)) || dictionaryMap.get(normalize(entry.source));
      if (!translation) continue;
      rows.set(identity, {
        id: entry.id,
        sourceHash: entry.sourceHash,
        source: entry.source,
        translation,
        mode: entry.renderMode,
        selector: entry.targetSelector || null,
        attribute: entry.targetAttribute || null,
        origin: 'reused-page-source-translation',
      });
      added += 1;
    }
    if (added) {
      draft.translations = [...rows.values()];
      fs.writeFileSync(draftPath, `${JSON.stringify(draft, null, 2)}\n`);
    }
  }
}
console.log(`Completed page-specific translation rows for ${pages.length} pages and ${locales.length} locales.`);
