import { describe, expect, it } from 'vitest';
import { createOfflineProcessAdapter, inspectTranslationResources } from '../src/lib/translation-engine-adapter.js';

describe('offline translation adapter safety contract', () => {
  it('fails closed when no operator-selected executable exists', async () => {
    const translate = createOfflineProcessAdapter({ executable: '', resourceCheck: async () => ({ ready: true }) });
    await expect(translate({ sourceText: 'fixture' })).rejects.toMatchObject({ code: 'TRANSLATION_ENGINE_NOT_CONFIGURED' });
  });

  it('refuses to start when resource policy is not met', async () => {
    const translate = createOfflineProcessAdapter({ executable: 'unused', resourceCheck: async () => ({ ready: false, blockers: ['INSUFFICIENT_FREE_MEMORY'] }) });
    await expect(translate({ sourceText: 'fixture' })).rejects.toMatchObject({ code: 'TRANSLATION_RESOURCE_POLICY' });
  });

  it('reports honest host resource facts without claiming model or GPU readiness', async () => {
    const report = await inspectTranslationResources({ modelPath: '', policy: { minFreeMemoryBytes: 1 } });
    expect(report.ready).toBe(false);
    expect(report.blockers).toContain('MODEL_PATH_UNAVAILABLE');
    expect(report.gpu).toBe('not-probed');
  });
});
