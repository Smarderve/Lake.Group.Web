import { CMS_V2_DOCUMENTS } from './cms-v2-content.js';
import { assertSafeUrl } from './ssrf-guard.js';

const DEFAULT_SITE = 'https://lake-group.vercel.app';
const fail = (code, message) => Object.assign(new Error(message), { code });

/** Fetches only a route from the closed page registry for authenticated preview. */
export function createPageSourceReader({ siteOrigin = DEFAULT_SITE, fetchImpl = globalThis.fetch, checkUrl = assertSafeUrl } = {}) {
  const origin = new URL(siteOrigin);
  if (origin.protocol !== 'https:' || origin.username || origin.password || origin.search || origin.hash || origin.pathname !== '/') {
    throw new TypeError('CMS V2 public site origin must be an HTTPS origin');
  }
  return async function readPageSource(key) {
    const definition = CMS_V2_DOCUMENTS[key];
    if (!definition || definition.kind !== 'page') throw fail('INVALID_CONTENT_DOCUMENT', 'This page is not registered for CMS V2.');
    const sourceUrl = new URL(definition.route, origin).toString();
    const safety = await checkUrl(sourceUrl);
    if (!safety.ok) throw fail('PREVIEW_SOURCE_UNAVAILABLE', 'The public preview source is unavailable.');
    let response;
    try { response = await fetchImpl(sourceUrl, { redirect: 'error', signal: AbortSignal.timeout(8000), headers: { accept: 'text/html' } }); }
    catch { throw fail('PREVIEW_SOURCE_UNAVAILABLE', 'The public preview source is unavailable.'); }
    if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) {
      throw fail('PREVIEW_SOURCE_UNAVAILABLE', 'The public preview source is unavailable.');
    }
    const html = await response.text();
    if (html.length > 2_000_000) throw fail('PREVIEW_SOURCE_UNAVAILABLE', 'The public preview page is too large.');
    return { sourceUrl, html };
  };
}
