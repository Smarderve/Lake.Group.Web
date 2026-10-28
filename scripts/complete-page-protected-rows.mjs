import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const queue = JSON.parse(fs.readFileSync(path.join(root, 'scripts/.generated/i18n-extraction-queue.json'), 'utf8'));
const locales = ['sw', 'ar', 'fr', 'es', 'pt', 'hi', 'zh'];
const pages = Object.keys(queue.scriptFilesByPage || {});
const protectedText = new Set(['Tanzania', 'Kenya', 'Zambia', 'Rwanda', 'Burundi', 'DR Congo', 'Ethiopia', 'Mozambique', 'Uganda', 'Gulf Aggregates', 'Cross Country', 'NexDrive Motors', 'Kiswahili', 'हिन्दी', 'العربية', '简体中文', 'Français', 'Español', 'Português']);
const menu = { sw: 'Menyu', ar: 'القائمة', fr: 'Menu', es: 'Menú', pt: 'Menu', hi: 'मेनू', zh: '菜单' };
for (const locale of locales) {
  const directory = path.join(root, 'scripts/i18n-drafts', locale);
  for (const page of pages) {
    const file = path.join(directory, `${page}.json`);
    if (!fs.existsSync(file)) continue;
    const draft = JSON.parse(fs.readFileSync(file, 'utf8'));
    const rows = new Map((draft.translations || []).map((row) => [`${row.id}\0${row.sourceHash}`, row]));
    for (const entry of queue.entries.filter((item) => item.page === page && ['public-visitor-copy', 'terminology-review'].includes(item.classification))) {
      const key = `${entry.id}\0${entry.sourceHash}`;
      if (rows.has(key) && rows.get(key).translation?.trim()) continue;
      let translation = null;
      if (protectedText.has(entry.source) || /^©\s*\d{4}\s+Lake Group\.?$/u.test(entry.source)) translation = entry.source;
      if (entry.source === 'Menu') translation = menu[locale];
      if (!translation) continue;
      rows.set(key, { id: entry.id, sourceHash: entry.sourceHash, source: entry.source, translation, mode: entry.renderMode, selector: entry.targetSelector || null, attribute: entry.targetAttribute || null, origin: 'protected-or-locale-name' });
    }
    draft.translations = [...rows.values()];
    fs.writeFileSync(file, `${JSON.stringify(draft, null, 2)}\n`);
  }
}
