import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const DEFAULT_DICTIONARY = path.resolve('assets/i18n-content.json');

function visibleText(value) {
  return String(value ?? '').replace(/<[^>]*>/g, ' ').replace(/&(?:nbsp|amp|lt|gt|quot|#39);/g, ' ').replace(/\s+/g, ' ').trim();
}

function protectedTokens(value) {
  const text = String(value ?? '');
  return {
    placeholders: [...text.matchAll(/\{\{?\s*[\w.-]+\s*\}?\}|%\d*\$?[sdif]|\$\{[^}]+\}/g)].map((m) => m[0]).sort(),
    urls: [...text.matchAll(/(?:https?:\/\/|mailto:|tel:)[^\s"'<>]+/gi)].map((m) => m[0].replace(/[),.;]+$/, '')).sort(),
    tags: [...text.matchAll(/<\/?([a-z][\w-]*)\b[^>]*>/gi)].map((m) => `${m[0].startsWith('</') ? '/' : ''}${m[1].toLowerCase()}`).sort(),
    numbers: [...visibleText(text).matchAll(/\d[\d,.]*(?:%|\+)?/g)].map((m) => m[0].replace(/,/g, '')).sort(),
  };
}

export function validateDictionaries(dictionaries) {
  const source = dictionaries.en || {};
  const issues = [];
  const locales = ['sw', 'hi', 'ar', 'zh', 'fr', 'es', 'pt'];
  for (const locale of locales) {
    const pack = dictionaries[locale] || {};
    for (const [key, enValue] of Object.entries(source)) {
      const value = pack[key];
      if (typeof value !== 'string' || !value.trim()) {
        issues.push({ locale, key, type: 'missing', status: 'missing' });
        continue;
      }
      const enTokens = protectedTokens(enValue);
      const translatedTokens = protectedTokens(value);
      for (const type of ['numbers', 'urls', 'placeholders', 'tags']) {
        if (JSON.stringify(enTokens[type]) !== JSON.stringify(translatedTokens[type])) {
          issues.push({ locale, key, type, status: 'validation-failed', source: enTokens[type], translation: translatedTokens[type] });
        }
      }
      if (visibleText(enValue) !== visibleText(value) && /10[,.]?000\+?/i.test(enValue) && /30[,.]?000\+?/i.test(value)) {
        issues.push({ locale, key, type: 'verified-employee-count', status: 'validation-failed' });
      }
    }
  }
  const summary = {};
  for (const locale of locales) {
    const rows = issues.filter((item) => item.locale === locale);
    summary[locale] = {
      required: Object.keys(source).length,
      translated: Object.keys(source).filter((key) => typeof dictionaries[locale]?.[key] === 'string' && dictionaries[locale][key].trim()).length,
      missing: rows.filter((item) => item.status === 'missing').length,
      validationFailed: rows.filter((item) => item.status === 'validation-failed').length,
      status: rows.length ? 'pending-validation' : 'machine-checks-pass-review-still-required',
    };
  }
  return { schemaVersion: 1, generatedAt: new Date().toISOString(), benchmarkStatus: 'pending', qualityClaim: 'not-verified', summary, issues };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const outputFlag = process.argv.indexOf('--output');
  const positional = process.argv.slice(2).filter((arg, index, args) => arg !== '--output' && args[index - 1] !== '--output');
  const input = path.resolve(positional[0] || DEFAULT_DICTIONARY);
  const output = path.resolve((outputFlag >= 0 && process.argv[outputFlag + 1]) || positional[1] || 'scripts/.generated/i18n-quality-report.json');
  const report = validateDictionaries(JSON.parse(fs.readFileSync(input, 'utf8')));
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`i18n validation: ${report.issues.length} issues across ${Object.keys(report.summary).length} target locales`);
  console.log(`Report: ${path.relative(process.cwd(), output)}; benchmark remains pending; machine checks are not linguistic quality approval.`);
}
