/* Lightweight static-site adapter. It performs no request unless an explicit,
 * deployment-supplied feature flag enables the approved pilot document. */
(function hydrateCmsV2(window, document) {
  const config = window.LAKE_CMS_CONTENT_V2 || {};
  if (config.enabled !== true) return;
  if (!config.pointerUrl) return;
  const route = window.location.pathname.split('/').pop() || 'index.html';
  const pageKey = route === '' || route === 'index.html' ? 'home' : route.replace(/\.html$/, '');

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
  const preparePage = (content) => {
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
      seo, composition: content.composition,
    };
  };
  const applyComposition = (composition, globalData) => {
    if (!composition || composition.version !== 1 || !Array.isArray(composition.root?.children)) return;
    const sections = [...document.querySelectorAll('body > section, body > main > section, body > .page-wrap > section, body > div > section')].filter((node) => !node.closest('footer,nav'));
    const safeImage = (value) => typeof value === 'string' && !value.startsWith('//') && !/[\\\u0000-\u001f]/.test(value);
    const globalFields = new Map((globalData?.dataFields || []).map((field) => [field.key, field.value]));
    const viewport = window.matchMedia('(max-width: 640px)').matches ? 'mobile' : window.matchMedia('(max-width: 1024px)').matches ? 'tablet' : 'desktop';
    const backgrounds = { none: '', white: '#fff', light: '#f4f8fb', 'deep-blue': '#032d4d', 'light-blue': '#0181bb', yellow: '#fff200', 'brand-gradient': 'linear-gradient(135deg,#032d4d,#0181bb)' };
    composition.root.children.forEach((component, index) => {
      const content = { ...(component.content || {}) };
      if (content.reference?.state === 'linked' && globalFields.has(content.reference.key)) content.value = `${content.prefix || ''}${globalFields.get(content.reference.key)}${content.suffix || ''}`;
      let section = sections[index];
      if (!section) {
        section = document.createElement('section'); section.className = 'fs-section section-light';
        section.innerHTML = '<div class="container"><h2></h2><p></p><a class="btn btn-primary" hidden></a></div>';
        document.querySelector('footer')?.before(section);
      }
      const override = viewport === 'desktop' ? {} : (component.responsive?.[viewport] || {});
      const layout = { ...(component.layout || {}), ...(override.layout || {}) };
      section.hidden = component.visible === false || override.hidden === true; section.setAttribute('data-cms-node-id', component.id);
      const heading = section.querySelector('h1,h2,h3,h4');
      const paragraph = [...section.querySelectorAll('p')].find((node) => node.textContent.trim());
      const image = section.querySelector('img'); const button = section.querySelector('a.btn,button');
      if (heading && typeof (content.heading || content.value) === 'string') heading.textContent = content.heading || content.value;
      if (paragraph && typeof content.body === 'string') paragraph.textContent = content.body;
      if (image && safeImage(content.src)) { image.src = content.src; image.alt = content.alt || ''; }
      if (button && typeof content.label === 'string' && safeDestination(content.href || '#', { allowContact: true })) {
        button.hidden = false; button.textContent = content.label; button.setAttribute('href', content.href || '#');
        if (content.target === 'new') { button.setAttribute('target', '_blank'); button.setAttribute('rel', 'noopener'); }
      }
      const preset = { small: 320, medium: 480, large: 640, viewport: window.innerHeight, custom: layout.minHeight }[layout.height];
      section.style.minHeight = preset === undefined ? '' : `${Math.max(0, Math.min(2000, preset))}px`;
      section.style.gridColumn = `span ${Math.max(1, Math.min(12, layout.span || 12))}`;
      if (component.style?.background && component.style.background !== 'image') section.style.background = backgrounds[component.style.background] || '';
      if (safeImage(component.style?.backgroundImage)) section.style.backgroundImage = `linear-gradient(rgba(3,35,61,${Math.max(0, Math.min(1, component.style.overlay || 0))}),rgba(3,35,61,${Math.max(0, Math.min(1, component.style.overlay || 0))})),url("${component.style.backgroundImage.replace(/["\\]/g, '')}")`;
    });
  };
  const applyNavigation = (items) => {
    if (!Array.isArray(items) || !items.length) return;
    const desktop = document.querySelector('.nav-links');
    if (desktop) {
      desktop.replaceChildren(...items.filter((item) => item.visible && item.desktop).map((item) => {
        const li = document.createElement('li'); const anchor = document.createElement('a');
        anchor.textContent = item.label; anchor.href = item.type === 'parent' ? '#' : item.destination; li.append(anchor);
        if (item.children?.length) { li.className = 'has-dropdown'; const menu = document.createElement('div'); menu.className = 'nav-dropdown'; item.children.filter((child) => child.visible && child.desktop).forEach((child) => { const link = document.createElement('a'); link.textContent = child.label; link.href = child.type === 'parent' ? '#' : child.destination; menu.append(link); }); li.append(menu); }
        return li;
      }));
    }
    const mobile = document.querySelector('.mobile-menu,.nav-mobile,.mobile-nav');
    if (mobile) {
      const links = [];
      items.filter((item) => item.visible && item.mobile).forEach((item) => {
        const anchor = document.createElement('a'); anchor.textContent = item.label; anchor.href = item.type === 'parent' ? '#' : item.destination; links.push(anchor);
        (item.children || []).filter((child) => child.visible && child.mobile).forEach((child) => { const sub = document.createElement('a'); sub.textContent = child.label; sub.href = child.type === 'parent' ? '#' : child.destination; sub.className = 'nav-child'; links.push(sub); });
      });
      mobile.replaceChildren(...links);
    }
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
      const prepared = preparePage(snapshot?.documents?.[pageKey]);
      if (!prepared) throw new Error('CMS V2 content rejected');
      // Every validation has completed. This is the single DOM-mutation phase.
      prepared.text.forEach(([field, value]) => setText(field, value));
      prepared.attributes.forEach(([field, attribute, value]) => setAttribute(field, attribute, value));
      applyComposition(prepared.composition, snapshot?.documents?.global);
      applyNavigation(snapshot?.documents?.global?.navigation);
      document.title = prepared.seo.title;
      document.querySelector('meta[name="description"]')?.setAttribute('content', prepared.seo.description);
    })
    .catch((error) => {
      // A controlled diagnostic for local verification; static HTML remains
      // untouched and this never surfaces as an uncaught page exception.
      window.console?.warn?.('CMS V2 public hydration skipped', error?.message || 'unknown failure');
    });
}(window, document));
