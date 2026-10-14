import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const DEFAULT_DICTIONARY = path.resolve('assets/i18n-content.json');

function visibleText(value) {
  return String(value ?? '').replace(/<[^>]*>/g, ' ').replace(/&(?:nbsp|amp|lt|gt|quot|#39);/g, ' ').replace(/\s+/g, ' ').trim();
}

function protectedTokens(value, locale = 'en') {
  const text = String(value ?? '');
  const normalizeNumberText = (input) => {
    let normalized = String(input).replace(/[\u0660-\u0669\u06f0-\u06f9]/g, (digit) => {
      const code = digit.charCodeAt(0);
      return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
    }).replace(/[\u066b]/g, '.').replace(/[\u066c]/g, ',');
    if (['fr', 'es', 'pt'].includes(locale)) {
      normalized = normalized.replace(/(\d)[.\u00a0\u202f ](?=\d{3}(?:\D|$))/g, '$1');
      normalized = normalized.replace(/(\d),(\d{1,2})(?!\d)/g, '$1.$2');
    }
    return normalized;
  };
  const numericTokens = (input) => {
    const normalized = normalizeNumberText(input)
      // A decade expression such as "mid-20s" is commonly written out in
      // translation ("mid-twenties"); it is not a protected numeric fact.
      .replace(/\b(?:mid|early|late)[- ]\d{2}s\b/gi, ' ');
    const tokens = [];
    const consumed = new Set();
    // Expand compact unit ranges (12–40k) to the same values as 12,000–40,000.
    const ranges = /(?<![\p{L}\d])([\d,.]+)\s*[–—-]\s*([\d,.]+)\s*([kK])\b/gu;
    for (const match of normalized.matchAll(ranges)) {
      const scale = 1000;
      const canonical = (raw) => {
        const value = Number(raw.replace(/,/g, ''));
        return Number.isFinite(value) ? String(value * scale) : raw;
      };
      tokens.push(canonical(match[1]), canonical(match[2]));
      for (let index = match.index; index < match.index + match[0].length; index += 1) consumed.add(index);
    }
    const pattern = /(?<![\p{L}\d])(?:\d{1,3}(?:[,\u00a0\u202f ]\d{3})+|\d+)(?:[.,]\d+)?(?:\s*[kK](?![\p{L}\d]))?(?:[+%])?/gu;
    for (const match of normalized.matchAll(pattern)) {
      if ([...Array(match[0].length).keys()].some((offset) => consumed.has(match.index + offset))) continue;
      let token = match[0].replace(/[\u00a0\u202f ]/g, '').trim();
      const suffix = token.match(/[kK](?=\+?$|%$)/)?.[0];
      token = token.replace(/[kK]/g, '').replace(/,/g, '');
      if (suffix) token = String(Number(token) * 1000);
      tokens.push(token);
    }
    return tokens.sort();
  };
  return {
    placeholders: [...text.matchAll(/\{\{?\s*[\w.-]+\s*\}?\}|%\d*\$?[sdif]|\$\{[^}]+\}/g)].map((m) => m[0]).sort(),
    urls: [...text.matchAll(/(?:https?:\/\/|mailto:|tel:)[^\s"'<>]+/gi)].map((m) => m[0].replace(/[),.;]+$/, '')).sort(),
    tags: [...text.matchAll(/<\/?([a-z][\w-]*)\b[^>]*>/gi)].map((m) => `${m[0].startsWith('</') ? '/' : ''}${m[1].toLowerCase()}`).sort(),
    numbers: numericTokens(visibleText(text)),
  };
}

export function validateDictionaries(dictionaries) {
  const source = dictionaries.en || {};
  const issues = [];
  const locales = ['sw', 'hi', 'ar', 'zh', 'fr', 'es', 'pt'];
  for (const locale of locales) {
    const pack = dictionaries[locale] || {};
    for (const [key, enValue] of Object.entries(source)) {
      // Empty English placeholders are not visitor-facing source copy and
      // must not inflate missing-translation counts until they are populated.
      if (typeof enValue !== 'string' || !enValue.trim()) continue;
      const value = pack[key];
      if (typeof value !== 'string' || !value.trim()) {
        issues.push({ locale, key, type: 'missing', status: 'missing' });
        continue;
      }
      const enTokens = protectedTokens(enValue);
      const translatedTokens = protectedTokens(value, locale);
      for (const type of ['numbers', 'urls', 'placeholders', 'tags']) {
        let matches = JSON.stringify(enTokens[type]) === JSON.stringify(translatedTokens[type]);
        if (type === 'numbers' && locale === 'sw' && !matches) {
          const sourceNumbers = enTokens.numbers.map((token) => token.replace(/\+$/, ''));
          const translatedNumbers = translatedTokens.numbers.map((token) => token.replace(/\+$/, ''));
          const sameNumericValues = JSON.stringify(sourceNumbers) === JSON.stringify(translatedNumbers);
          const equivalentThreshold = (/(?:\bmore than\b|\bover\b)/i.test(enValue) && ( /\bzaidi ya\b/i.test(value) || /\d[\d,.]*\+/i.test(value)))
            || (/\d[\d,.]*\+/i.test(enValue) && /\bzaidi ya\b/i.test(value));
          const equivalentPlusSpacing = /\d\s+\+/.test(enValue) && /\d\+/.test(value);
          matches = sameNumericValues && (equivalentThreshold || equivalentPlusSpacing);
        }
        if (!matches) {
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
      required: Object.values(source).filter((value) => typeof value === 'string' && value.trim()).length,
      translated: Object.entries(source).filter(([key, value]) => typeof value === 'string' && value.trim() && typeof dictionaries[locale]?.[key] === 'string' && dictionaries[locale][key].trim()).length,
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
