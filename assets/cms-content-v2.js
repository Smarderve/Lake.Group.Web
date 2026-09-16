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

  window.fetch(config.pointerUrl, { credentials: 'omit', cache: 'no-store' })
    .then((response) => response.ok ? response.json() : Promise.reject(new Error('CMS V2 pointer unavailable')))
    .then((pointer) => window.fetch(pointer.snapshotUrl, { credentials: 'omit', cache: 'no-store' }))
    .then((response) => response.ok ? response.json() : Promise.reject(new Error('CMS V2 snapshot unavailable')))
    .then((snapshot) => {
      const content = snapshot?.documents?.['lake-aviation'];
      if (!content) return;
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
