const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const locales = [
  ['en', 'English'],
  ['sw', 'Kiswahili'],
  ['hi', 'हिन्दी'],
  ['ar', 'العربية'],
  ['zh', '简体中文'],
  ['fr', 'Français'],
  ['es', 'Español'],
  ['pt', 'Português'],
];

test('language controller exposes eight locales and loads self-hosted draft files on every host', () => {
  const source = fs.readFileSync(path.join(root, 'assets/i18n.js'), 'utf8');
  assert.match(source, /const SUPPORTED = \['en', 'sw', 'hi', 'ar', 'zh', 'fr', 'es', 'pt'\]/);
  assert.match(source, /const AVAILABLE_TRANSLATIONS = \['en'\]/);
  assert.match(source, /Static, self-hosted editorial translations are available on every host/);
  assert.match(source, /const DRAFT_PREVIEW = true/);
  assert.match(source, /DRAFT_PENDING_HUMAN_REVIEW/);
  assert.match(source, /releaseEligible === false/);
  assert.match(source, /scripts\/i18n-drafts/);
  assert.doesNotMatch(source, /localPreviewHost|productionHost|lake-i18n-preview/);
  assert.doesNotMatch(source, /localStorage\.removeItem\(STORAGE_KEY\)/);
  assert.match(source, /localStorage\.getItem\(STORAGE_KEY\)/);
  assert.match(source, /localStorage\.setItem\(STORAGE_KEY, lang\)/);
  for (const [, label] of locales) assert.ok(source.includes(`'${label}'`), `${label} label missing`);
});

test('empty desktop and mobile language status regions remain out of layout', () => {
  const css = fs.readFileSync(path.join(root, 'assets/phase-01-navbar.css'), 'utf8');
  assert.match(css, /\.lang-status\[hidden\][\s\S]*?display:\s*none\s*!important/);
  assert.match(css, /\.mob-language-status\[hidden\][\s\S]*?display:\s*none\s*!important/);
});

test('public pages with the shared mobile navigation show one eight-language selector', () => {
  const pages = fs.readdirSync(root).filter((file) => file.endsWith('.html'));
  let checked = 0;
  for (const file of pages) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    if (!html.includes('mob-language-trigger')) continue;
    checked += 1;
    assert.equal((html.match(/class="[^"]*\bmob-language-trigger\b[^"]*"/g) || []).length, 1, `${file}: mobile trigger count`);
    assert.equal((html.match(/id="mob-language-panel"/g) || []).length, 1, `${file}: mobile panel count`);
    for (const [code, label] of locales) {
      assert.match(html, new RegExp(`data-lang="${code}"[^>]*>${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}<\\/button>`), `${file}: ${label} option missing`);
      if (code === 'en') assert.match(html, /data-lang="en" data-available="true"/);
      else assert.match(html, new RegExp(`data-lang="${code}" data-available="false" disabled`));
    }
  }
  assert.ok(checked > 0, 'expected pages using the shared mobile navigation');
});

test('launch CSS no longer hides the language controls', () => {
  const css = fs.readFileSync(path.join(root, 'assets/phase-01-navbar.css'), 'utf8');
  assert.doesNotMatch(css, /\.lang-switcher[^\{]*,\s*\.nav-mobile[^\{]*mob-language-panel[^\{]*\{\s*display:\s*none\s*!important/);
  assert.doesNotMatch(css, /content:\s*["']Soon["']/i, 'no language menu renders a Soon badge');
});

test('shipped employee-count translations preserve the verified 10,000 figure', () => {
  const dictionaries = JSON.parse(fs.readFileSync(path.join(root, 'assets/i18n-content.json'), 'utf8'));
  const bundleContext = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'assets/i18n-content.js'), 'utf8'), bundleContext);
  assert.deepEqual(JSON.parse(JSON.stringify(bundleContext.window.__LAKE_I18N_CONTENT__)), dictionaries);
  for (const [language, entries] of Object.entries(dictionaries)) {
    if (language === 'en') continue;
    for (const [key, source] of Object.entries(dictionaries.en)) {
      if (!source.includes('10,000')) continue;
      assert.doesNotMatch(entries[key] || '', /(?:30[.,\s\u00a0\u202f]000|٣٠[٬,\s]?٠٠٠)/, `${language}.${key} changes 10,000 to 30,000`);
    }
  }
});
