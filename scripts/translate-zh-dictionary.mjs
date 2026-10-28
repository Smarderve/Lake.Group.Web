import fs from 'node:fs';
import { translate } from 'google-translate-api-x';

const dictionaryPath = 'assets/i18n-content.json';
const cachePath = 'scripts/_zh_cache.json';
const dictionary = JSON.parse(fs.readFileSync(dictionaryPath, 'utf8'));
const cache = fs.existsSync(cachePath) ? JSON.parse(fs.readFileSync(cachePath, 'utf8')) : {};
const protect = ['Lake Group', 'Lake Oil', 'Lake Gas', 'Lake Lubes', 'Lake Steel', 'Lake Trans', 'Lake Agro', 'Lake Premix', 'Lake Cylinders', 'Lake Aviation', 'AFICD', 'AILL', 'ATL', 'Tanzania', 'Kenya', 'Zambia', 'Rwanda', 'Burundi', 'DR Congo', 'Ethiopia', 'Mozambique', 'Uganda', 'Dar es Salaam', 'LPG', 'ISO', 'CSR', 'ESG', 'HSE', 'API'];
const mask = (source) => { const tokens = []; let text = String(source); text = text.replace(/<[^>]+>/g, (value) => { tokens.push(value); return `@@${tokens.length - 1}@@`; }); for (const value of protect.sort((a, b) => b.length - a.length)) text = text.replaceAll(value, (found) => { tokens.push(found); return `@@${tokens.length - 1}@@`; }); return { text, tokens }; };
const restore = (text, tokens) => String(text).replace(/@@(\d+)@@/g, (_, index) => tokens[Number(index)] ?? _);
const keys = Object.keys(dictionary.en);
cache.zh ||= {};
for (let index = 0; index < keys.length; index += 40) {
  const batch = keys.slice(index, index + 40).filter((key) => cache.zh[key]?.src === dictionary.en[key] ? false : true);
  if (batch.length) {
    const prepared = batch.map((key) => mask(dictionary.en[key]));
    const translated = await translate(prepared.map((item) => item.text), { from: 'en', to: 'zh-CN', forceBatch: true, rejectOnPartialFail: false });
    for (let i = 0; i < batch.length; i += 1) {
      const item = Array.isArray(translated) ? translated[i] : translated;
      if (item?.text) cache.zh[batch[i]] = { src: dictionary.en[batch[i]], dst: restore(item.text, prepared[i].tokens) };
    }
    fs.writeFileSync(cachePath, JSON.stringify(cache));
  }
  console.log(`zh ${Math.min(index + 40, keys.length)}/${keys.length}`);
}
dictionary.zh = Object.fromEntries(keys.map((key) => [key, cache.zh[key]?.dst || dictionary.en[key]]));
fs.writeFileSync(dictionaryPath, `${JSON.stringify(dictionary, null, 2)}\n`);
fs.writeFileSync('assets/i18n-content.js', `window.__LAKE_I18N_CONTENT__ = ${JSON.stringify(dictionary)};\n`);
