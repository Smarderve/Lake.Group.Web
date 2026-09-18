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
    if (/^releases\/[a-zA-Z0-9_-]+\/content\.json$/.test(url)) return `/public-content/cms-v2/${url}`;
    if (/^public-content\/cms-v2\/releases\/[a-zA-Z0-9_-]+\/content\.json$/.test(url)) return `/${url}`;
    throw new Error('CMS V2 snapshot URL rejected');
  };
  const canonical = (value) => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
    ? Object.keys(value).sort().reduce((out, key) => { out[key] = canonical(value[key]); return out; }, {}) : value;
  const digest = async (snapshot) => {
    const bytes = new TextEncoder().encode(JSON.stringify(canonical({ schemaVersion: snapshot.schemaVersion, documents: snapshot.documents })));
    const hash = await crypto.subtle.digest('SHA-256', bytes);
    return `sha256-${btoa(String.fromCharCode(...new Uint8Array(hash)))}`;
  };
  const nonEmptyString = (value) => typeof value === 'string' && value.length > 0;
  const prepareLakeAviation = (content) => {
    if (!content || typeof content !== 'object') return null;
    const { hero, introduction, cta, seo } = content;
    if (!hero || !introduction || !cta || !seo
      || !nonEmptyString(hero.heading) || !nonEmptyString(hero.description) || !nonEmptyString(hero.image)
      || (hero.alt !== undefined && typeof hero.alt !== 'string')
      || !nonEmptyString(introduction.heading) || !nonEmptyString(introduction.body)
      || !nonEmptyString(cta.label) || !nonEmptyString(cta.href)
      || !nonEmptyString(seo.title) || !nonEmptyString(seo.description)) return null;
    return {
      text: [['hero.heading', hero.heading], ['hero.description', hero.description], ['introduction.heading', introduction.heading], ['introduction.body', introduction.body]],
      attributes: [['hero.image', 'src', hero.image], ...(hero.alt === undefined ? [] : [['hero.image', 'alt', hero.alt]])],
      seo,
    };
  };
  window.fetch(config.pointerUrl, { credentials: 'omit', cache: 'no-store' })
    .then((response) => response.ok ? response.json() : Promise.reject(new Error('CMS V2 pointer unavailable')))
    .then((pointer) => window.fetch(safeSnapshotUrl(pointer.snapshotUrl), { credentials: 'omit', cache: 'no-store' }).then((response) => ({ pointer, response })))
    .then(({ pointer, response }) => response.ok ? response.json().then((snapshot) => ({ pointer, snapshot })) : Promise.reject(new Error('CMS V2 snapshot unavailable')))
    .then(async ({ pointer, snapshot }) => {
      if (snapshot.schemaVersion !== 1) throw new Error('CMS V2 schema rejected');
      if (pointer.releaseId !== snapshot.releaseId) throw new Error('CMS V2 release identity rejected');
      if (pointer.integrity !== snapshot.integrity) throw new Error('CMS V2 release metadata rejected');
      const computedIntegrity = await digest(snapshot);
      if (pointer.integrity !== computedIntegrity) throw new Error(`CMS V2 release digest rejected: expected ${pointer.integrity}, got ${computedIntegrity}`);
      const prepared = prepareLakeAviation(snapshot?.documents?.['lake-aviation']);
      if (!prepared) throw new Error('CMS V2 content rejected');
      // Every validation has completed. This is the single DOM-mutation phase.
      prepared.text.forEach(([field, value]) => setText(field, value));
      prepared.attributes.forEach(([field, attribute, value]) => setAttribute(field, attribute, value));
      document.title = prepared.seo.title;
      document.querySelector('meta[name="description"]')?.setAttribute('content', prepared.seo.description);
    })
    .catch((error) => {
      // A controlled diagnostic for local verification; static HTML remains
      // untouched and this never surfaces as an uncaught page exception.
      window.console?.warn?.('CMS V2 public hydration skipped', error?.message || 'unknown failure');
    });
}(window, document));
