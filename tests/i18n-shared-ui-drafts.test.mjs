import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { buildSharedUiDrafts } from '../scripts/build-i18n-shared-ui-drafts.mjs';
import { validateTranslationResult } from '../backend/src/lib/cms-v2-translation.js';

test('shared UI batch writes resumable review-pending drafts for all seven locales', async () => {
  const outputRoot = await mkdtemp(join(tmpdir(), 'lake-i18n-shared-ui-'));
  try {
    const result = await buildSharedUiDrafts({ outputRoot });
    assert.equal(result.keys, 85);
    assert.deepEqual(Object.keys(result.locales).sort(), ['ar', 'es', 'fr', 'hi', 'pt', 'sw', 'zh']);
    for (const [locale, output] of Object.entries(result.locales)) {
      const draft = JSON.parse(await readFile(output.path, 'utf8'));
      assert.equal(draft.locale, locale);
      assert.equal(draft.status, 'DRAFT_PENDING_HUMAN_REVIEW');
      assert.equal(draft.reviewEvidence, null);
      assert.equal(draft.releaseEligible, false);
      assert.equal(draft.candidateCount, 85);
      assert.equal(draft.translations.length, 85);
      assert.equal(new Set(draft.translations.map((row) => row.id)).size, 85);
      for (const row of draft.translations) {
        assert.ok(row.translation.trim(), `${locale}.${row.key} must not be blank`);
        assert.match(row.sourceHash, /^[a-f0-9]{64}$/);
        assert.ok(validateTranslationResult({ sourceText: row.source }, row.translation).valid, `${locale}.${row.key} structural validation`);
      }
    }
    const hi = JSON.parse(await readFile(join(outputRoot, 'hi', 'shared-ui.json'), 'utf8'));
    const zh = JSON.parse(await readFile(join(outputRoot, 'zh', 'shared-ui.json'), 'utf8'));
    assert.equal(hi.translations.find((row) => row.key === 'nav.home').translation, 'होम');
    assert.equal(zh.translations.find((row) => row.key === 'nav.home').translation, '首页');
    const ar = JSON.parse(await readFile(join(outputRoot, 'ar', 'shared-ui.json'), 'utf8'));
    assert.equal(ar.translations.find((row) => row.key === 'footer.address').translation.includes('72'), true);

    const hiPath = join(outputRoot, 'hi', 'shared-ui.json');
    hi.translations.find((row) => row.key === 'nav.home').translation = 'होम पृष्ठ';
    await writeFile(hiPath, JSON.stringify(hi, null, 2));
    await buildSharedUiDrafts({ outputRoot });
    const resumed = JSON.parse(await readFile(hiPath, 'utf8'));
    assert.equal(resumed.translations.find((row) => row.key === 'nav.home').translation, 'होम पृष्ठ');
    assert.equal(resumed.translations.find((row) => row.key === 'nav.home').origin, 'preserved-editorial-draft');
    const changedDictionaryPath = join(outputRoot, 'dictionary.json');
    const dictionary = JSON.parse(await readFile(resolve('assets/i18n-content.json'), 'utf8'));
    dictionary.en['nav.home'] = 'Homepage';
    await writeFile(changedDictionaryPath, JSON.stringify(dictionary));
    await buildSharedUiDrafts({ dictionaryPath: changedDictionaryPath, outputRoot });
    const refreshed = JSON.parse(await readFile(hiPath, 'utf8'));
    assert.notEqual(refreshed.translations.find((row) => row.key === 'nav.home').sourceHash, resumed.translations.find((row) => row.key === 'nav.home').sourceHash);
    assert.equal(refreshed.translations.find((row) => row.key === 'nav.home').translation, 'होम');
  } finally {
    await rm(outputRoot, { recursive: true, force: true });
  }
});
