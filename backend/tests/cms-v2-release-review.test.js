import { describe, expect, it } from 'vitest';
import { CMS_V2_DOCUMENTS } from '../src/lib/cms-v2-content.js';
import { reviewContentRelease } from '../src/lib/cms-v2-release-review.js';

const page = () => ({
  hero: { heading: 'Lake Aviation', description: 'Fuel supply', image: 'assets/hero.webp', alt: 'Aircraft' },
  introduction: { heading: 'Introduction', body: 'Aviation operations.' },
  cta: { label: 'Contact', href: 'contact.html' },
  media: [], sections: [{ key: 'services', heading: 'Services', body: 'Fueling' }],
  seo: { title: 'Lake Aviation', description: 'Fuel supply', canonical: 'lake-aviation.html', index: true },
});

describe('CMS V2 release review', () => {
  it('reports changed fields and accepts internal public destinations', () => {
    const published = page(); const draft = page(); draft.hero.heading = 'Lake Aviation Tanzania';
    const review = reviewContentRelease({ definition: CMS_V2_DOCUMENTS['lake-aviation'], draft, published });
    expect(review.valid).toBe(true);
    expect(review.changes).toContainEqual({ field: 'hero.heading', before: 'Lake Aviation', after: 'Lake Aviation Tanzania' });
  });

  it('blocks unsafe URLs and duplicate section keys while retaining warnings', () => {
    const draft = page();
    draft.hero.image = 'javascript:alert(1)'; draft.cta.href = '//evil.example'; draft.hero.alt = '';
    draft.sections.push({ key: 'services', heading: 'More', body: 'More' });
    const review = reviewContentRelease({ definition: CMS_V2_DOCUMENTS['lake-aviation'], draft, published: null });
    expect(review.valid).toBe(false);
    expect(review.issues.filter((issue) => issue.severity === 'error')).toHaveLength(3);
    expect(review.issues).toContainEqual(expect.objectContaining({ severity: 'warning', field: 'hero.alt' }));
  });
});
