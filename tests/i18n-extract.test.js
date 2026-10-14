const test = require('node:test');
const assert = require('node:assert/strict');
const { buildTranslationManifest, compareExtractionSnapshots, extractJavaScript, extractPublicHtml } = require('../scripts/i18n-extract.mjs');

test('HTML extraction detects untagged text and attributes without rewriting source', () => {
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'lake-i18n-'));
  try {
    fs.writeFileSync(path.join(directory, 'new-page.html'), '<h2>Expanding Our Energy Network</h2><p>Lake <strong>Group</strong> expands energy access</p><p data-i18n="known">Existing copy</p><img alt="Regional distribution network"><a href="https://example.com">Learn more</a>');
    const first = extractPublicHtml(directory);
    const second = extractPublicHtml(directory);
    assert.deepEqual(first.entries.map((entry) => entry.source), ['Expanding Our Energy Network', 'Lake Group expands energy access', 'Regional distribution network', 'Learn more']);
    assert.deepEqual(first.entries.map((entry) => entry.id), second.entries.map((entry) => entry.id));
    assert.ok(first.entries.every((entry) => ['missing', 'protected'].includes(entry.status)));
    assert.equal(first.entries.find((entry) => entry.source === 'Learn more').classification, 'public-visitor-copy');
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test('AST extraction detects JSX and DOM API strings without treating identifiers as copy', () => {
  const source = `const Header = () => <button aria-label="Open navigation">Company</button>;\nnode.textContent = 'Energy solutions';\nconst stableCode = 'nav.home';`;
  const entries = extractJavaScript(source, 'Header.jsx');
  assert.deepEqual(entries.map((entry) => entry.source), ['Open navigation', 'Company', 'Energy solutions']);
});

test('dynamic visible JSX is reported while non-copy expressions are ignored', () => {
  const entries = extractJavaScript(`const Header = ({ title }) => <button className={theme}>{title}</button>;`, 'Header.jsx');
  assert.equal(entries.unsupportedPatterns.length, 1);
  assert.equal(entries.unsupportedPatterns[0].context, 'dynamic JSX child');
});

test('stable HTML IDs preserve source edits and classify protected brands', () => {
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'lake-i18n-change-'));
  try {
    const page = path.join(directory, 'about.html');
    fs.writeFileSync(page, '<h2>Energy for all</h2><span>Lake Group</span>');
    const first = extractPublicHtml(directory);
    fs.writeFileSync(page, '<h2>Energy for everyone</h2><span>Lake Group</span>');
    const second = extractPublicHtml(directory);
    assert.equal(first.entries[0].id, second.entries[0].id);
    assert.notEqual(first.entries[0].sourceHash, second.entries[0].sourceHash);
    assert.equal(second.entries[1].status, 'protected');
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test('snapshot comparison tracks additions, source changes, and removals by stable ID', () => {
  const previous = { entries: [{ id: 'same', sourceHash: 'old' }, { id: 'removed', sourceHash: 'gone' }] };
  const current = { entries: [{ id: 'same', sourceHash: 'new' }, { id: 'added', sourceHash: 'fresh' }] };
  assert.deepEqual(compareExtractionSnapshots(previous, current), { added: 1, changed: 1, removed: 1 });
});

test('translation manifest includes source jobs only and does not fabricate translations', () => {
  const manifest = buildTranslationManifest({ generatedAt: 'test', locales: ['sw','hi','ar','zh','fr','es','pt'], entries: [
    { id: 'copy', file: 'index.html', context: 'HTML p', source: 'Safe copy', sourceHash: 'abc', classification: 'public-visitor-copy', status: 'missing' },
    { id: 'brand', file: 'index.html', context: 'HTML span', source: 'Lake Group', sourceHash: 'def', classification: 'protected-brand', status: 'protected' },
  ] });
  assert.deepEqual(manifest.entries.map(({ id }) => id), ['copy']);
  assert.equal(manifest.translationStatus, 'pending-engine-and-review');
  assert.ok(manifest.entries.every((entry) => !Object.hasOwn(entry, 'translation')));
});
