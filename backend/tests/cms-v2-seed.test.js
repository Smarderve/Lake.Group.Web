import { describe, expect, it } from 'vitest';
import { buildCmsV2SeedDataset } from '../src/lib/cms-v2-seed.js';
import { CMS_V2_PAGE_DEFINITIONS } from '../src/lib/cms-v2-content.js';

describe('CMS V2 current site seed package', () => {
  it('extracts and validates every registered active page plus shared documents', async () => {
    const dataset = await buildCmsV2SeedDataset({ root: '..' });
    expect(Object.keys(dataset)).toHaveLength(CMS_V2_PAGE_DEFINITIONS.length + 3);
    expect(new Set(CMS_V2_PAGE_DEFINITIONS.map((page) => page.key)).size).toBe(CMS_V2_PAGE_DEFINITIONS.length);
    expect(dataset.home.seo.title).toContain('Lake Group');
    expect(dataset.global.statistics.find((item) => item.scope === 'Lake Oil Zambia')?.value).toBe('47');
  });
});
