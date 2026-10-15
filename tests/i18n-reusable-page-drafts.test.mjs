import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { buildReusablePageDrafts } from '../scripts/build-i18n-reusable-page-drafts.mjs';

test('reusable page drafts copy only exact validated dictionary matches and remain pending', async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'lake-i18n-reuse-'));
  try {
    const manifestPath = path.join(temp, 'manifest.json');
    const dictionaryPath = path.join(temp, 'dictionary.json');
    const draftsRoot = path.join(temp, 'drafts');
    await writeFile(manifestPath, JSON.stringify({
      generatedAt: '2026-10-15T00:00:00.000Z',
      scriptFilesByPage: { 'about.html': [] },
      entries: [
        { id: 'auto.valid', page: 'about.html', source: 'Contact us', sourceHash: 'hash-valid', classification: 'public-visitor-copy', renderMode: 'text', targetSelector: 'h1:nth-of-type(1)' },
        { id: 'auto.missing', page: 'about.html', source: 'A new sentence', sourceHash: 'hash-missing', classification: 'public-visitor-copy', renderMode: 'text', targetSelector: 'p:nth-of-type(1)' },
      ],
    }));
    await writeFile(dictionaryPath, JSON.stringify({ en: { 'about.contact': 'Contact us' }, sw: { 'about.contact': 'Wasiliana nasi' } }));

    const first = await buildReusablePageDrafts({ manifestPath, dictionaryPath, draftsRoot });
    const draftPath = path.join(draftsRoot, 'sw', 'about.html.json');
    const draft = JSON.parse(await readFile(draftPath, 'utf8'));
    assert.equal(first.sw['about.html'].translated, 1);
    assert.equal(first.sw['about.html'].missing, 1);
    assert.equal(draft.status, 'DRAFT_PENDING_HUMAN_REVIEW');
    assert.equal(draft.releaseEligible, false);
    assert.equal(draft.translations[0].translation, 'Wasiliana nasi');
    assert.equal(draft.translations[0].origin, 'existing-dictionary:about.contact');
    assert.equal(first.hi['about.html'].translated, 0);

    const second = await buildReusablePageDrafts({ manifestPath, dictionaryPath, draftsRoot });
    assert.equal(second.sw['about.html'].reused, 0, 'rerun is idempotent and does not append duplicate translations');
    assert.equal(JSON.parse(await readFile(draftPath, 'utf8')).translations.length, 1);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});
