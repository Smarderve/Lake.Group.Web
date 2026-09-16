/* Lightweight static-site adapter. It performs no request unless an explicit,
 * deployment-supplied feature flag enables the approved pilot document. */
(function hydrateCmsV2(window, document) {
  const config = window.LAKE_CMS_CONTENT_V2 || {};
  if (config.enabled !== true) return;
  if (config.page !== 'lake-aviation' || !config.pointerUrl) return;

  const setText = (field, value) => {
    if (typeof value !== 'string') return;
    document.querySelectorAll(`[data-cms-field="${field}"]`).forEach((node) => { node.textContent = value; });
  };
  const setAttribute = (field, attribute, value) => {
    if (typeof value !== 'string' || !value) return;
    document.querySelectorAll(`[data-cms-field="${field}"]`).forEach((node) => node.setAttribute(attribute, value));
  };

  const safeSnapshotUrl = (value) => {
    const url = String(value || '').replace(/^\/+/, '');
    // Runtime pointers are intentionally relative to their public-content
    // root; retain support for a fully rooted deployment pointer as well.
    if (/^releases\/[a-zA-Z0-9_-]+\/content\.json$/.test(url)) return `/public-content/${url}`;
    if (/^public-content\/releases\/[a-zA-Z0-9_-]+\/content\.json$/.test(url)) return `/${url}`;
    throw new Error('CMS V2 snapshot URL rejected');
  };
  const canonical = (value) => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
    ? Object.keys(value).sort().reduce((out, key) => { out[key] = canonical(value[key]); return out; }, {}) : value;
  const digest = async (snapshot) => {
    const bytes = new TextEncoder().encode(JSON.stringify(canonical({ schemaVersion: snapshot.schemaVersion, documents: snapshot.documents })));
    const hash = await crypto.subtle.digest('SHA-256', bytes);
    return `sha256-${btoa(String.fromCharCode(...new Uint8Array(hash)))}`;
  };
  window.fetch(config.pointerUrl, { credentials: 'omit', cache: 'no-store' })
    .then((response) => response.ok ? response.json() : Promise.reject(new Error('CMS V2 pointer unavailable')))
    .then((pointer) => window.fetch(safeSnapshotUrl(pointer.snapshotUrl), { credentials: 'omit', cache: 'no-store' }).then((response) => ({ pointer, response })))
    .then(({ pointer, response }) => response.ok ? response.json().then((snapshot) => ({ pointer, snapshot })) : Promise.reject(new Error('CMS V2 snapshot unavailable')))
    .then(async ({ pointer, snapshot }) => {
      if (snapshot.schemaVersion !== 1) throw new Error('CMS V2 schema rejected');
      if (pointer.releaseId !== snapshot.releaseId || pointer.integrity !== snapshot.integrity || pointer.integrity !== await digest(snapshot)) throw new Error('CMS V2 release integrity rejected');
      const content = snapshot?.documents?.['lake-aviation'];
      if (!content || !content.hero || !content.introduction || !content.seo) throw new Error('CMS V2 content rejected');
      setText('hero.heading', content.hero?.heading);
      setText('hero.description', content.hero?.description);
      setAttribute('hero.image', 'src', content.hero?.image);
      setAttribute('hero.image', 'alt', content.hero?.alt);
      setText('introduction.heading', content.introduction?.heading);
      setText('introduction.body', content.introduction?.body);
      if (content.seo?.title) document.title = content.seo.title;
      if (content.seo?.description) document.querySelector('meta[name="description"]')?.setAttribute('content', content.seo.description);
    })
    .catch(() => { /* Static HTML is the safe, intentional fallback. */ });
}(window, document));
