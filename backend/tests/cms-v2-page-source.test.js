import { describe, expect, it, vi } from 'vitest';
import { createPageSourceReader } from '../src/lib/cms-v2-page-source.js';

describe('CMS V2 authenticated page source', () => {
  it('fetches only a registered public page from a fixed origin', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      headers: new Headers({ 'content-type': 'text/html; charset=utf-8' }),
      text: async () => '<!doctype html><html><body>Lake Aviation</body></html>',
    }));
    const read = createPageSourceReader({ checkUrl: async () => ({ ok: true }), fetchImpl });
    const result = await read('lake-aviation');
    expect(result.sourceUrl).toBe('https://lake-group.vercel.app/lake-aviation.html');
    expect(result.html).toContain('Lake Aviation');
    expect(fetchImpl).toHaveBeenCalledWith(result.sourceUrl, expect.objectContaining({ redirect: 'error' }));
    await expect(read('global')).rejects.toMatchObject({ code: 'INVALID_CONTENT_DOCUMENT' });
  });

  it('rejects blocked destinations and non HTML responses', async () => {
    const blocked = createPageSourceReader({ checkUrl: async () => ({ ok: false }), fetchImpl: vi.fn() });
    await expect(blocked('home')).rejects.toMatchObject({ code: 'PREVIEW_SOURCE_UNAVAILABLE' });
    const nonHtml = createPageSourceReader({ checkUrl: async () => ({ ok: true }), fetchImpl: async () => ({ ok: true, headers: new Headers({ 'content-type': 'application/json' }) }) });
    await expect(nonHtml('home')).rejects.toMatchObject({ code: 'PREVIEW_SOURCE_UNAVAILABLE' });
    expect(() => createPageSourceReader({ siteOrigin: 'http://127.0.0.1:8080' })).toThrow();
  });
});
