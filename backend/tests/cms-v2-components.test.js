import { describe, expect, it } from 'vitest';
import { CMS_V2_DOCUMENTS, createContentReleaseService } from '../src/lib/cms-v2-content.js';
import { CMS_V2_COMPONENT_REGISTRY, validateCmsV2Composition } from '../src/lib/cms-v2-components.js';

const node = (type = 'section', overrides = {}) => ({ id: `${type}-1`, key: `${type}-1`, type, name: type, visible: true, locked: false, content: {}, layout: { span: 12 }, style: { background: 'none', radius: 'none' }, responsive: {}, children: [], ...overrides });
const page = (composition) => ({ hero: { heading: 'Page', description: 'Description', image: '/hero.webp', alt: 'Hero' }, introduction: { heading: 'Intro', body: 'Body' }, cta: { label: 'Contact', href: '/contact.html' }, media: [], sections: [], composition, seo: { title: 'Page', description: 'Description', index: true } });

describe('CMS V2 component registry and atomic updates', () => {
  it('validates grid spans, protection and parent-child rules', () => {
    expect(Object.keys(CMS_V2_COMPONENT_REGISTRY).length).toBeGreaterThan(20);
    const valid = { version: 1, root: { id: 'page', key: 'page', type: 'page', name: 'Page', children: [node()] } };
    expect(validateCmsV2Composition(valid).success).toBe(true);
    const invalidSpan = structuredClone(valid); invalidSpan.root.children[0].layout.span = 13;
    expect(validateCmsV2Composition(invalidSpan).success).toBe(false);
    const invalidNesting = structuredClone(valid); invalidNesting.root.children[0] = node('heading', { children: [node('image')] });
    expect(validateCmsV2Composition(invalidNesting).success).toBe(false);
    const unlockedHero = structuredClone(valid); unlockedHero.root.children[0] = node('company-hero');
    expect(validateCmsV2Composition(unlockedHero).success).toBe(false);
  });

  it('validates every document before invoking the atomic repository write', async () => {
    let writes = 0;
    const repository = { saveDraftBatch: async (entries) => { writes += 1; return entries; } };
    const service = createContentReleaseService({ repository, writePointer: async () => {}, id: (prefix) => `${prefix}-${writes}` });
    const composition = { version: 1, root: { id: 'page', key: 'page', type: 'page', name: 'Page', children: [node()] } };
    await expect(service.saveDraftBatch({ actorId: 'it', documents: [{ key: 'home', baseRevisionId: null, data: page(composition) }] })).resolves.toHaveLength(1);
    const broken = structuredClone(composition); broken.root.children[0].layout.span = 99;
    await expect(service.saveDraftBatch({ actorId: 'it', documents: [{ key: 'home', baseRevisionId: null, data: page(broken) }] })).rejects.toMatchObject({ code: 'INVALID_CONTENT_PAYLOAD' });
    expect(writes).toBe(1);
  });

  it('accepts navigation and canonical global fields in the shared release document', () => {
    const result = CMS_V2_DOCUMENTS.global.schema.safeParse({ organization: { name: 'Lake Group', description: 'Group', headquarters: 'Dar es Salaam', email: 'info@example.com', phone: '+255' }, statistics: [{ label: 'People', value: '100+', scope: 'Group' }], socialLinks: [], dataFields: [{ key: 'group.people', label: 'People', value: '100+', type: 'number' }], navigation: [{ id: 'home', label: 'Home', destination: 'index.html', type: 'internal', visible: true, desktop: true, mobile: true, children: [] }] });
    expect(result.success).toBe(true);
  });
});
