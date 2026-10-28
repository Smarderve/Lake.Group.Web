import fs from 'node:fs';
import path from 'node:path';
import { translate } from 'google-translate-api-x';

const root = process.cwd();
const locales = ['sw', 'ar', 'fr', 'es', 'pt', 'hi', 'zh'];
const protectedExact = new Set(['Tanzania', 'Kenya', 'Zambia', 'Rwanda', 'Burundi', 'DR Congo', 'Ethiopia', 'Mozambique', 'Uganda', 'Gulf Aggregates', 'Cross Country', 'NexDrive Motors', 'Kiswahili', 'हिन्दी', 'العربية', '简体中文', 'Français', 'Español', 'Português', 'English', 'Menu', 'Services', 'Contact', 'YouTube', 'Instagram', 'WhatsApp', 'Facebook', 'LinkedIn', 'AFICD', 'ATL', 'AILL', 'CSR', 'ISO', 'HSE', 'API', 'SMS', 'GPS', 'CEO', 'CFO', 'COO']);
const brands = ['Lake Oil Group', 'Lake Group', 'Lake Oil', 'Lake Aviation', 'Lake Gas', 'Lake Lubes', 'Lake Buildings', 'Lake Pipes', 'Lake Steel', 'Lake Cylinders', 'Lake Trans', 'Lake Agro', 'Lake Premix', 'Dar es Salaam', 'Mwanza', 'Arusha', 'Dodoma', 'Nairobi', 'Kampala', 'LPG', 'AFICD', 'AILL', 'ATL', 'East Africa', 'Central Africa', 'Tanzania', 'Kenya', 'Uganda', 'Rwanda', 'Burundi', 'DR Congo', 'Zambia', 'Malawi', 'Mozambique', 'South Sudan'];
const mask = (source) => { const tokens = []; let text = String(source); text = text.replace(/<[^>]+>|(?:https?:\/\/|mailto:|tel:)[^\s<]+|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, (value) => { tokens.push(value); return `@@${tokens.length - 1}@@`; }); for (const value of brands.sort((a, b) => b.length - a.length)) text = text.replaceAll(value, (found) => { tokens.push(found); return `@@${tokens.length - 1}@@`; }); return { text, tokens }; };
const restore = (value, tokens) => String(value).replace(/@@(\d+)@@/g, (_, index) => tokens[Number(index)] ?? _);
const writeDraft = (filePath, draft) => {
  const output = `${JSON.stringify(draft, null, 2)}\n`;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try { fs.writeFileSync(filePath, output); return; } catch (error) { if (attempt === 4) throw error; }
  }
};
const pages = fs.readdirSync(path.join(root, 'scripts/i18n-drafts', 'sw')).filter((name) => name.endsWith('.json'));
for (const locale of locales) {
  const files = pages.filter((name) => name !== 'shared-ui.json');
  const rows = [];
  for (const file of files) {
    const filePath = path.join(root, 'scripts/i18n-drafts', locale, file);
    if (!fs.existsSync(filePath)) continue;
    const draft = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    for (const row of draft.translations || []) if (row.translation === row.source && row.source.length > 2 && !protectedExact.has(row.source) && !/^©\s*\d{4}\s+Lake Group\.?$/u.test(row.source)) rows.push({ filePath, draft, row });
  }
  for (let index = 0; index < rows.length; index += 30) {
    const batch = rows.slice(index, index + 30);
    const prepared = batch.map(({ row }) => mask(row.source));
    let translated;
    try { translated = await translate(prepared.map((item) => item.text), { from: 'en', to: locale === 'zh' ? 'zh-CN' : locale, forceBatch: true, rejectOnPartialFail: false }); }
    catch (error) { console.warn(`skip ${locale} ${index}: ${error.message}`); continue; }
    for (let i = 0; i < batch.length; i += 1) {
      const item = Array.isArray(translated) ? translated[i] : translated;
      if (item?.text && item.text !== prepared[i].text) batch[i].row.translation = restore(item.text, prepared[i].tokens);
    }
    const changed = new Set(batch.map((item) => item.filePath));
    for (const filePath of changed) {
      const draft = batch.find((item) => item.filePath === filePath).draft;
      writeDraft(filePath, draft);
    }
    console.log(`${locale} ${Math.min(index + 30, rows.length)}/${rows.length}`);
  }
}
