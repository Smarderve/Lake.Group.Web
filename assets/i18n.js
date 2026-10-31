/**
 * Lake Group language/content applicator.
 *
 * Reads the full per-language content dictionary from
 * window.__LAKE_I18N_CONTENT__, which is set by assets/i18n-content.js
 * (loaded as a plain <script> tag immediately before this file) and
 * applies it to every element tagged with:
 *   data-i18n               -> textContent (or innerHTML if data-i18n-html
 *                               is present, for strings with inline markup
 *                               like <em>/<strong>)
 *   data-i18n-placeholder   -> placeholder attribute (inputs/textareas)
 *   data-i18n-title         -> title attribute
 *   data-i18n-alt           -> alt attribute (images)
 *   data-i18n-aria          -> aria-label attribute
 *
 * IMPORTANT: this reads a global variable, not fetch(). An earlier version
 * used fetch('assets/i18n-content.json'), which works when the site is
 * served over http(s):// but is silently blocked by the browser's CORS
 * policy when a page is opened directly from disk via file:// (which is
 * how most people preview a static site by double-clicking index.html).
 * Under file://, fetch() of a local JSON file throws/rejects with no
 * visible error in the page itself - the language buttons appear to do
 * nothing because the dictionaries object never populates. Loading the
 * same data via a normal <script src="assets/i18n-content.js"> tag has
 * no such restriction and works identically under file://, http://, and
 * https://, which is why the content is shipped in that form.
 *
 * Planned languages remain visible in the shared selector. Languages without
 * an active translation gracefully remain in English with an inline message.
 */
window.LakeI18n = (function () {
  const STORAGE_KEY = 'lake-lang';
  // Class set by the inline <head> boot snippet in every translated page. It
  // keeps the English source copy of the destination document off the first
  // paint while this module resolves the stored locale.
  const BOOT_GATE_CLASS = 'lake-i18n-booting';
  const SUPPORTED = ['en', 'sw', 'hi', 'ar', 'zh', 'fr', 'es', 'pt'];
  const AVAILABLE_TRANSLATIONS = ['en'];
  const availableLanguages = new Set(AVAILABLE_TRANSLATIONS);
  // Static, self-hosted editorial translations are available on every host.
  // Their source files retain DRAFT_PENDING_HUMAN_REVIEW/releaseEligible=false;
  // making them selectable does not represent human review or approval.
  const DRAFT_PREVIEW = true;
  if (DRAFT_PREVIEW) SUPPORTED.filter((language) => language !== 'en').forEach((language) => availableLanguages.add(language));
  const draftPageTranslations = {};
  const draftEnglishSources = {};
  const draftLocalePromises = {};
  const RTL_LANGS = ['ar'];
  // ASCII-safe escapes so labels survive encoding mishaps in editors/tooling.
  const LANG_LABELS = {
    en: 'English',
    sw: 'Kiswahili',
    hi: 'हिन्दी',
    ar: 'العربية',
    zh: '简体中文',
    fr: 'Français',
    es: 'Español',
    pt: 'Português'
  };

  let dictionaries = null;
  let publicationManifest = null;
  let publicationPromise = null;
  let publishedPageTranslations = {};
  let publishedLocale = null;
  let appliedAutoTargets = [];
  let autoMutationObserver = null;
  let autoObserverFrame = 0;
  let current = 'en';
  let selectionRevision = 0;
  let hoverOpenTimer = null;
  let hoverCloseTimer = null;
  // Keep a page's original English value so stale keyed dictionaries cannot
  // rewrite newer copy or facts, even after the user changes languages.
  const keyedSourceSnapshots = new WeakMap();
  const keyedSourceNormalizedSnapshots = new WeakMap();
  const normalizedDictionarySources = new Map();
  const pageDraftSelectorTargets = new Map();
  const telephoneTextSources = new WeakMap();
  // Distinguish Tab focus (open menu) from pointer focus (click owns toggle).
  let keyboardIntent = false;
  const LANG_OPEN_DELAY_MS = 200;
  const LANG_CLOSE_DELAY_MS = 320;

  function loadPublicationManifest() {
    if (publicationPromise) return publicationPromise;
    if (!window.fetch || /^file:/i.test(window.location?.protocol || '')) return Promise.resolve(null);
    publicationPromise = window.fetch('/assets/i18n-published/current.json', { credentials: 'omit', cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((manifest) => {
        if (!manifest || manifest.schemaVersion !== 1 || !Array.isArray(manifest.activeLanguages) || !manifest.files || !manifest.releaseId) return null;
        const active = new Set(['en']);
        manifest.activeLanguages.forEach((language) => { if (SUPPORTED.includes(language)) active.add(language); });
        publicationManifest = manifest;
        availableLanguages.clear(); active.forEach((language) => availableLanguages.add(language));
        if (DRAFT_PREVIEW) SUPPORTED.filter((language) => language !== 'en').forEach((language) => availableLanguages.add(language));
        return manifest;
      }).catch(() => null);
    return publicationPromise;
  }

  function loadDraftLocale(lang) {
    if (!DRAFT_PREVIEW || !SUPPORTED.includes(lang) || lang === 'en') return Promise.resolve(false);
    if (draftPageTranslations[lang]?.ready) return Promise.resolve(true);
    if (draftLocalePromises[lang]) return draftLocalePromises[lang];
    const page = window.location.pathname.split('/').pop() || 'index.html';
    const readDraft = (name, optional) => window.fetch(`/scripts/i18n-drafts/${lang}/${name}`, { credentials: 'omit', cache: 'no-store' }).then((response) => {
      if (optional && response.status === 404) return null;
      if (!response.ok) throw new Error(`Draft asset unavailable: ${name}`);
      return response.json();
    });
    const validateDraft = (draft) => draft && draft.schemaVersion === 1 && draft.locale === lang && draft.status === 'DRAFT_PENDING_HUMAN_REVIEW' && draft.releaseEligible === false && Array.isArray(draft.translations) && draft.translations.every((row) => row && typeof row.source === 'string' && typeof row.translation === 'string' && row.translation.trim() && row.sourceHash);
    const loadPromise = Promise.all([
      readDraft('shared-ui.json', false),
      readDraft('hero-carousel.json', false),
      readDraft(`${encodeURIComponent(page)}.json`, true)
    ]).then(([shared, hero, pageDraft]) => {
      if (!validateDraft(shared) || !validateDraft(hero) || (pageDraft && (!validateDraft(pageDraft) || pageDraft.page !== page))) throw new Error('Draft schema/status rejected');
      const content = dictionaries || window.__LAKE_I18N_CONTENT__ || {};
      const overlay = { ...(content[lang] || {}) };
      const englishSources = {};
      [...shared.translations, ...hero.translations].forEach((row) => {
        if (row.key) {
          overlay[row.key] = row.translation;
          if (typeof row.source === 'string') englishSources[row.key] = row.source;
        }
      });
      // Page draft rows that target one exact keyed control/content node take
      // precedence over an older locale dictionary value only when the English
      // source still matches exactly. This lets editorial previews correct an
      // incomplete keyed translation without weakening source-integrity checks.
      const normalizeDraftSource = (value) => String(value || '').replace(/\s+/g, ' ').trim();
      (pageDraft?.translations || []).forEach((row) => {
        if (row.mode !== 'text' || typeof row.selector !== 'string') return;
        const keyMatch = row.selector.match(/^\[data-i18n=["']([^"']+)["']\]$/);
        if (!keyMatch) return;
        const key = keyMatch[1];
        const englishSource = content.en?.[key];
        if (typeof englishSource !== 'string' || normalizeDraftSource(englishSource) !== normalizeDraftSource(row.source)) return;
        overlay[key] = row.translation;
      });
      dictionaries = { ...content, [lang]: overlay };
      draftEnglishSources[lang] = englishSources;
      draftPageTranslations[lang] = { ready: true, rows: pageDraft?.translations || [] };
      availableLanguages.add(lang);
      return true;
    }).catch((error) => {
      console.warn(`Lake I18n draft preview unavailable for ${lang}:`, error.message);
      return false;
    });
    draftLocalePromises[lang] = loadPromise;
    return loadPromise;
  }

  function loadDraftPreviews() {
    if (!DRAFT_PREVIEW) return Promise.resolve([]);
    return Promise.all(SUPPORTED.filter((language) => language !== 'en').map(loadDraftLocale));
  }

  function loadPublishedLocale(lang) {
    if (lang === 'en' || !availableLanguages.has(lang)) return Promise.resolve(null);
    if (publishedLocale === lang) return Promise.resolve(publishedPageTranslations);
    return loadPublicationManifest().then((manifest) => {
      const file = manifest?.files?.[lang];
      if (typeof file !== 'string' || !new RegExp(`^releases/[a-f0-9]{24}/${lang}\\.json$`).test(file)) throw new Error('Published language asset path rejected');
      return window.fetch(`/assets/i18n-published/${file}`, { credentials: 'omit', cache: 'force-cache' }).then((response) => response.ok ? response.json() : Promise.reject(new Error('Published language asset unavailable')));
    }).then((asset) => {
      if (!asset || asset.schemaVersion !== 1 || asset.releaseId !== publicationManifest.releaseId || asset.language !== lang || !asset.pages || typeof asset.pages !== 'object' || !asset.integrity || !window.crypto?.subtle) throw new Error('Published language asset integrity metadata rejected');
      const integrity = asset.integrity; const unsigned = { ...asset }; delete unsigned.integrity;
      const bytes = new TextEncoder().encode(JSON.stringify(unsigned));
      return window.crypto.subtle.digest('SHA-256', bytes).then((digest) => {
        const actual = `sha256-${btoa(String.fromCharCode(...new Uint8Array(digest)))}`;
        if (actual !== integrity) throw new Error('Published language asset digest mismatch');
        publishedPageTranslations = asset.pages;
        publishedLocale = lang;
        return asset.pages;
      });
    });
  }

  function applyPublishedPage(lang, restorePrevious) {
    autoMutationObserver?.disconnect();
    if (restorePrevious !== false) {
      appliedAutoTargets.forEach(({ node, attribute, original }) => { if (attribute) node.setAttribute(attribute, original); else node.textContent = original; });
      appliedAutoTargets = [];
    }
    if (lang === 'en') return;
    const draftRows = DRAFT_PREVIEW && draftPageTranslations[lang]?.ready && draftPageTranslations[lang].rows.length
      ? draftPageTranslations[lang].rows : null;
    if (!draftRows && publishedLocale !== lang) return;
    const page = window.location.pathname.split('/').pop() || 'index.html';
    const rows = draftRows || publishedPageTranslations[page] || [];
    const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    let textNodesBySource = null;
    const matchingTextNodes = (source) => {
      if (!textNodesBySource) {
        textNodesBySource = new Map();
        const walker = document.createTreeWalker(document.body || document.documentElement, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode())) {
          if (node.parentElement?.closest('[data-i18n],script,style,noscript,template')) continue;
          const value = normalize(node.nodeValue);
          if (!value) continue;
          if (!textNodesBySource.has(value)) textNodesBySource.set(value, []);
          textNodesBySource.get(value).push(node);
        }
      }
      const key = normalize(source);
      const matches = textNodesBySource.get(key) || [];
      // Consume the exact source bucket before mutating any text. This retains
      // the prior first-match behavior when repeated draft rows share a source.
      textNodesBySource.delete(key);
      return matches.filter((node) => node.isConnected && normalize(node.nodeValue) === key);
    };
    rows.forEach((entry) => {
      if (!entry || typeof entry.source !== 'string' || typeof entry.translation !== 'string') return;
      if (entry.mode === 'runtime-text') {
        const matches = matchingTextNodes(entry.source);
        if (!matches.length) return;
        matches.forEach((node) => {
          const original = node.nodeValue;
          node.nodeValue = localizeVisitorText(lang, entry.translation);
          appliedAutoTargets.push({ node, original });
        });
        return;
      }
      if (entry.mode === 'runtime-attribute') {
        if (!['alt', 'title', 'aria-label', 'placeholder'].includes(entry.attribute)) return;
        const matches = [...document.querySelectorAll(`[${entry.attribute}]`)].filter((node) => !node.closest('[data-i18n]') && normalize(node.getAttribute(entry.attribute)) === normalize(entry.source));
        if (!matches.length) return;
        matches.forEach((node) => {
          const original = node.getAttribute(entry.attribute);
          node.setAttribute(entry.attribute, localizeVisitorText(lang, entry.translation));
          appliedAutoTargets.push({ node, attribute: entry.attribute, original });
        });
        return;
      }
      if (typeof entry.selector !== 'string') return;
      let node = pageDraftSelectorTargets.get(entry.selector);
      if (node?.isConnected && !node.matches(entry.selector)) {
        pageDraftSelectorTargets.delete(entry.selector);
        node = null;
      }
      if (!node?.isConnected) {
        let nodes;
        try { nodes = document.querySelectorAll(entry.selector); } catch (_) { return; }
        if (nodes.length !== 1) { pageDraftSelectorTargets.delete(entry.selector); return; }
        node = nodes[0];
        pageDraftSelectorTargets.set(entry.selector, node);
      }
      let textTarget = node;
      if (entry.mode === 'text' && node.querySelector('*')) {
        const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
        const exactTextNodes = [];
        let textNode;
        while ((textNode = walker.nextNode())) if (normalize(textNode.nodeValue) === normalize(entry.source)) exactTextNodes.push(textNode);
        if (exactTextNodes.length !== 1) return;
        textTarget = exactTextNodes[0];
      }
      const source = entry.mode === 'attribute'
        ? (['alt', 'title', 'aria-label', 'placeholder', 'content'].includes(entry.attribute) ? node.getAttribute(entry.attribute) : null)
        : entry.mode === 'text' ? (textTarget.nodeType === Node.TEXT_NODE ? textTarget.nodeValue : node.textContent) : null;
      if (source === null || normalize(source) !== normalize(entry.source)) return;
      const attribute = entry.mode === 'attribute' ? entry.attribute : null;
      const original = attribute ? node.getAttribute(attribute) : (textTarget.nodeType === Node.TEXT_NODE ? textTarget.nodeValue : textTarget.textContent);
      if (attribute) node.setAttribute(attribute, localizeVisitorText(lang, entry.translation));
      else if (textTarget.nodeType === Node.TEXT_NODE) textTarget.nodeValue = localizeVisitorText(lang, entry.translation);
      else textTarget.textContent = localizeVisitorText(lang, entry.translation);
      appliedAutoTargets.push({ node: textTarget, attribute, original });
    });
    if (!autoMutationObserver && typeof MutationObserver === 'function') {
      autoMutationObserver = new MutationObserver(() => {
        if (autoObserverFrame) return;
        autoObserverFrame = window.requestAnimationFrame(() => { autoObserverFrame = 0; applyPublishedPage(current, false); });
      });
    }
    autoMutationObserver?.observe(document.body || document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['alt', 'title', 'aria-label', 'placeholder'] });
  }

  function loadDictionaries() {
    if (dictionaries) return Promise.resolve(dictionaries);
    if (window.__LAKE_I18N_CONTENT__) {
      dictionaries = window.__LAKE_I18N_CONTENT__;
      return Promise.resolve(dictionaries);
    }
    console.error(
      'Lake I18n: window.__LAKE_I18N_CONTENT__ is not defined. ' +
      'Make sure assets/i18n-content.js is loaded with a <script> tag ' +
      'BEFORE assets/i18n.js on this page.'
    );
    dictionaries = { en: {}, fr: {}, sw: {}, pt: {}, es: {}, ar: {} };
    return Promise.resolve(dictionaries);
  }

  const NUMBER_FORMAT_LOCALES = {
    en: 'en-US', sw: 'sw-TZ', hi: 'hi-IN-u-nu-deva', ar: 'ar-EG', zh: 'zh-CN', fr: 'fr-FR', es: 'es-ES', pt: 'pt-PT',
  };
  const numberFormatters = new Map();
  function getNumberFormatter(locale, useGrouping) {
    const key = `${locale}:${useGrouping ? 'grouped' : 'plain'}`;
    if (!numberFormatters.has(key)) numberFormatters.set(key, new Intl.NumberFormat(locale, { useGrouping, maximumFractionDigits: 20 }));
    return numberFormatters.get(key);
  }

  function formatNumberForLang(lang, value) {
    const str = value == null ? '' : String(value);
    const locale = NUMBER_FORMAT_LOCALES[lang];
    if (!locale) return str;
    const formatter = getNumberFormatter(locale, true);
    return str.replace(/(?<![\p{L}\p{N}])([+-]?)(\d{1,3}(?:,\d{3})+|\d{1,3}(?:\.\d{3})+|\d+(?:[.,]\d+)?)([%+]?)(?![\p{L}\p{N}])/gu, (match, sign, raw, suffix) => {
      if (/^0\d+$/.test(raw)) {
        const digits = lang === 'ar' ? '٠١٢٣٤٥٦٧٨٩' : lang === 'hi' ? '०१२३४५६७८९' : '0123456789';
        return sign + raw.replace(/[0-9]/g, (digit) => digits[digit.charCodeAt(0) - 48]) + suffix;
      }
      if (/^\d{4}$/.test(raw) && !suffix) return sign + getNumberFormatter(locale, false).format(Number(raw));
      const number = Number(raw.replace(/,(?=\d{3}(?:,|$))/g, '').replace(/\.(?=\d{3}(?:\.|$))/g, ''));
      return Number.isFinite(number) ? sign + formatter.format(number) + suffix : match;
    });
  }

  function localizeDigitsInText(lang, text) {
    if (typeof text !== 'string' || !text) return text;
    return formatNumberForLang(lang, text);
  }

  // Draft/page rows still contain a few English geography labels. Translate
  // those exact visitor-facing phrases at render time so legacy HTML and
  // newly hydrated page content stay consistent without touching company or
  // place names such as Tanzania, Kigamboni, and Dar es Salaam.
  const GEOGRAPHIC_LABELS = {
    sw: [['East and Central Africa', 'Afrika Mashariki na Afrika ya Kati'], ['East & Central Africa', 'Afrika Mashariki na Afrika ya Kati'], ['East & ', 'Afrika Mashariki na '], ['East African', 'Afrika Mashariki'], ['Central African', 'Afrika ya Kati'], ['East Africa', 'Afrika Mashariki'], ['Central Africa', 'Afrika ya Kati']],
    hi: [['East and Central Africa', 'पूर्वी अफ्रीका और मध्य अफ्रीका'], ['East & Central Africa', 'पूर्वी अफ्रीका और मध्य अफ्रीका'], ['East & ', 'पूर्वी और '], ['East African', 'पूर्वी अफ्रीकी'], ['Central African', 'मध्य अफ्रीकी'], ['East Africa', 'पूर्वी अफ्रीका'], ['Central Africa', 'मध्य अफ्रीका']],
    ar: [['East and Central Africa', 'شرق أفريقيا وأفريقيا الوسطى'], ['East & Central Africa', 'شرق أفريقيا وأفريقيا الوسطى'], ['East & ', 'الشرق و'], ['East African', 'شرق أفريقي'], ['Central African', 'أفريقيا الوسطى'], ['East Africa', 'شرق أفريقيا'], ['Central Africa', 'أفريقيا الوسطى']],
    zh: [['East and Central Africa', '东非和中非'], ['East & Central Africa', '东非和中非'], ['East & ', '东部和'], ['East African', '东非'], ['Central African', '中非'], ['East Africa', '东非'], ['Central Africa', '中非']],
    fr: [['East and Central Africa', "l'Afrique de l'Est et l'Afrique centrale"], ['East & Central Africa', "l'Afrique de l'Est et l'Afrique centrale"], ['East & ', "l'Afrique de l'Est et "], ['East African', 'est-africain'], ['Central African', 'centrafricain'], ['East Africa', "l'Afrique de l'Est"], ['Central Africa', "l'Afrique centrale"]],
    es: [['East and Central Africa', 'África Oriental y África Central'], ['East & Central Africa', 'África Oriental y África Central'], ['East & ', 'África Oriental y '], ['East African', 'africano oriental'], ['Central African', 'africano central'], ['East Africa', 'África Oriental'], ['Central Africa', 'África Central']],
    pt: [['East and Central Africa', 'África Oriental e África Central'], ['East & Central Africa', 'África Oriental e África Central'], ['East & ', 'África Oriental e '], ['East African', 'africano oriental'], ['Central African', 'africano central'], ['East Africa', 'África Oriental'], ['Central Africa', 'África Central']]
  };
  const geographicSources = new WeakMap();
  const geographicAttributeSources = new WeakMap();

  function localizeGeographicLabels(lang) {
    const replacements = GEOGRAPHIC_LABELS[lang];
    const selector = 'body *:not(script):not(style):not(noscript)';
    document.querySelectorAll(selector).forEach((element) => {
      if (element.children.length || element.closest('.lang-menu')) return;
      if (!geographicSources.has(element)) geographicSources.set(element, element.textContent);
      let value = geographicSources.get(element);
      if (replacements) replacements.forEach(([source, target]) => { value = value.replaceAll(source, target); });
      if (value !== element.textContent) element.textContent = value;
    });
    document.querySelectorAll('[title], [aria-label], [placeholder]').forEach((element) => {
      if (!geographicAttributeSources.has(element)) geographicAttributeSources.set(element, {});
      ['title', 'aria-label', 'placeholder'].forEach((attribute) => {
        const value = element.getAttribute(attribute);
        if (!value) return;
        const sources = geographicAttributeSources.get(element);
        if (sources[attribute] === undefined) sources[attribute] = value;
        let next = sources[attribute];
        if (replacements) replacements.forEach(([source, target]) => { next = next.replaceAll(source, target); });
        if (next !== value) element.setAttribute(attribute, next);
      });
    });
  }

  document.addEventListener('copy', (event) => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !event.clipboardData) return;
    const phoneForNode = (node) => (node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement)?.closest?.('[data-raw-copy]') || null;
    const phone = phoneForNode(selection.anchorNode);
    if (!phone || phone !== phoneForNode(selection.focusNode) || selection.toString().trim() !== phone.textContent.trim()) return;
    event.clipboardData.setData('text/plain', phone.getAttribute('data-raw-copy') || phone.textContent);
    event.preventDefault();
  }, true);

  // Preserve the official Latin spelling of company names in translated
  // strings, including page drafts, runtime cards, and assistant responses.
  const PROTECTED_BRAND_REPLACEMENTS = {
    ar: [
    [/ليك\s+ستيل\s+و\s+Allied\s+Products(?:\s+(?:المحدودة|المحدوده|Limited))?/giu, 'Lake Steel & Allied Products Limited'],
    [/ليك\s+(?:أويل|اويل)\s+(?:المحدودة|المحدوده)/gu, 'Lake Oil Limited'],
    [/ليك\s+ترانس\s+(?:المحدودة|المحدوده)/gu, 'Lake Trans Limited'],
    [/ليك\s+ستيل\s+(?:المحدودة|المحدوده)/gu, 'Lake Steel Limited'],
    [/ليك\s+غاز\s+(?:المحدودة|المحدوده)/gu, 'Lake Gas Limited'],
    [/ليك\s+(?:أويل|اويل)\s+LDA/giu, 'Lake Oil LDA'],
    [/ليك\s+إنرجيز/gu, 'Lake Energies'],
    [/ليك\s+بلاستيكس/gu, 'Lake Pipes'],
    [/مجموعة\s+ليك/gu, 'Lake Group'], [/ليك\s+(?:أويل|اويل)/gu, 'Lake Oil'], [/ليك\s+غاز/gu, 'Lake Gas'],
    [/ليك\s+(?:لوبز|لوبس)/gu, 'Lake Lubes'], [/ليك\s+ستيل/gu, 'Lake Steel'], [/ليك\s+ترانس/gu, 'Lake Trans'],
    [/ليك\s+(?:أفييشن|افييشن)/gu, 'Lake Aviation'], [/ليك\s+بايبس/gu, 'Lake Pipes'],
    [/ليك\s+(?:بريميكس|بريمكس)/gu, 'Lake Premix'], [/ليك\s+سيلندرز/gu, 'Lake Cylinders'], [/ليك\s+أغرو/gu, 'Lake Agro'],
    ],
    hi: [
      [/लेक\s+ग्रुप/gu, 'Lake Group'], [/लेक\s+ऑयल/gu, 'Lake Oil'], [/लेक\s+गैस/gu, 'Lake Gas'],
      [/लेक\s+ल्यूब्स/gu, 'Lake Lubes'], [/लेक\s+स्टील/gu, 'Lake Steel'], [/लेक\s+ट्रांस/gu, 'Lake Trans'],
      [/लेक\s+एविएशन/gu, 'Lake Aviation'], [/लेक\s+एनर्जीज़/gu, 'Lake Energies'],
      [/लेक\s+बिल्डिंग\s+सॉल्यूशंस?/gu, 'Lake Building Solution'],
      [/लेक\s+पाइप्स/gu, 'Lake Pipes'], [/लेक\s+प्रीमिक्स/gu, 'Lake Premix'],
      [/लेक\s+(?:सिलेंडर्स|सिलिंडर्स)/gu, 'Lake Cylinders'], [/लेक\s+एग्रो/gu, 'Lake Agro'],
    ],
    latin: [
      [/Kundi\s+la\s+Lake(?!\s+Group)/giu, 'Lake Group'],
      [/Groupe\s+Lake(?!\s+Group)/giu, 'Lake Group'],
      [/Grupo\s+Lake(?!\s+Group)/giu, 'Lake Group'],
    ],
  };
  function protectBrandNames(value) {
    let result = String(value ?? '');
    if (/(?:ليك|مجموعة)/u.test(result)) PROTECTED_BRAND_REPLACEMENTS.ar.forEach(([pattern, official]) => { result = result.replace(pattern, official); });
    if (/लेक/u.test(result)) PROTECTED_BRAND_REPLACEMENTS.hi.forEach(([pattern, official]) => { result = result.replace(pattern, official); });
    if (/(?:Kundi\s+la\s+Lake|Groupe\s+Lake|Grupo\s+Lake)/iu.test(result)) PROTECTED_BRAND_REPLACEMENTS.latin.forEach(([pattern, official]) => { result = result.replace(pattern, official); });
    return result;
  }
  function localizeVisitorText(lang, value) {
    let text = protectBrandNames(value);
    const protectedValues = [];
    text = text.replace(/(?:https?:\/\/|www\.)[^\s<>"']+|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\b[A-Z]{2,}(?:-[A-Z0-9]+)*(?:\s+\d+[A-Z0-9]*)?\b/g, (token) => {
      const marker = `\uE000${'x'.repeat(protectedValues.length + 1)}\uE000`;
      protectedValues.push(token);
      return marker;
    });
    text = localizeDigitsInText(lang, text);
    protectedValues.forEach((token, index) => { text = text.replace(`\uE000${'x'.repeat(index + 1)}\uE000`, token); });
    return text;
  }

  function t(key, lang) {
    const useLang = lang || current;
    if (!dictionaries) return null;
    const pack = dictionaries[useLang] || dictionaries.en || {};
    if (Object.prototype.hasOwnProperty.call(pack, key)) return protectBrandNames(pack[key]);
    const enPack = dictionaries.en || {};
    if (Object.prototype.hasOwnProperty.call(enPack, key)) return protectBrandNames(enPack[key]);
    return null;
  }

  function normalizedMarkupText(value) {
    const raw = String(value ?? '');
    let text = raw;
    if (/<\/?[a-z][^>]*>/i.test(raw)) {
      const holder = document.createElement('span');
      holder.innerHTML = raw;
      text = holder.textContent || '';
    }
    return text.replace(/\s+/g, ' ').trim().toLocaleLowerCase('en');
  }

  function matchesDictionarySource(el, key, slot, rawValue, lang) {
    let snapshots = keyedSourceSnapshots.get(el);
    if (!snapshots) { snapshots = new Map(); keyedSourceSnapshots.set(el, snapshots); }
    let normalizedSnapshots = keyedSourceNormalizedSnapshots.get(el);
    if (!normalizedSnapshots) { normalizedSnapshots = new Map(); keyedSourceNormalizedSnapshots.set(el, normalizedSnapshots); }
    if (!snapshots.has(slot)) {
      snapshots.set(slot, rawValue);
      normalizedSnapshots.set(slot, normalizedMarkupText(rawValue));
    }
    const dictionarySource = dictionaries?.en?.[key];
    const source = typeof dictionarySource === 'string' ? dictionarySource : draftEnglishSources[lang]?.[key];
    if (typeof source !== 'string') return false;
    let normalizedSource = normalizedDictionarySources.get(key);
    if (!normalizedSource) {
      normalizedSource = normalizedMarkupText(source);
      normalizedDictionarySources.set(key, normalizedSource);
    }
    return normalizedSnapshots.get(slot) === normalizedSource;
  }

  function restoreKeyedSource(el, slot, property) {
    const snapshot = keyedSourceSnapshots.get(el)?.get(slot);
    if (snapshot === undefined) return;
    if (property === 'text-html') el.innerHTML = snapshot;
    else if (property === 'text') el.textContent = snapshot;
    else if (property) el.setAttribute(property, snapshot);
  }

  function applyToElement(el, lang) {
    const key = el.getAttribute('data-i18n');
    const keyedHtml = el.hasAttribute('data-i18n-html');
    const keyedTextMatches = key && matchesDictionarySource(el, key, 'text', keyedHtml ? el.innerHTML : el.textContent, lang);
    if (key) {
      let val = t(key, lang);
      if (val !== null) {
        // Eastern Arabic digits for ar display strings.
        // Skip when data-i18n-latin-digits is present (e.g. emails, codes).
        if (!el.hasAttribute('data-i18n-latin-digits')) {
          val = localizeVisitorText(lang, val);
        }
        if (el.hasAttribute('data-i18n-html')) {
          el.innerHTML = val;
        } else if (el.matches('.nav-links > li.has-dropdown > a') && el.querySelector(':scope > .nav-dd-arrow')) {
          // Dropdown anchors own a decorative chevron that must survive
          // language switches. Replace only the label text, never the SVG.
          const indicator = el.querySelector(':scope > .nav-dd-arrow');
          const textNodes = [...el.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE);
          if (textNodes.length) {
            textNodes[0].nodeValue = val;
            textNodes.slice(1).forEach((node) => node.remove());
          } else {
            el.insertBefore(document.createTextNode(val), indicator);
          }
        } else {
          el.textContent = val;
        }
      }
    }

    const phKey = el.getAttribute('data-i18n-placeholder');
    if (phKey) {
      const val = t(phKey, lang);
      if (val !== null) el.setAttribute('placeholder', val);
    }

    const titleKey = el.getAttribute('data-i18n-title');
    if (titleKey) {
      const val = t(titleKey, lang);
      if (val !== null) el.setAttribute('title', val);
    }

    const altKey = el.getAttribute('data-i18n-alt');
    if (altKey) {
      const val = t(altKey, lang);
      if (val !== null) el.setAttribute('alt', val);
    }

    const ariaKey = el.getAttribute('data-i18n-aria');
    if (ariaKey) {
      const val = t(ariaKey, lang);
      if (val !== null) el.setAttribute('aria-label', val);
    }
  }

  function setDocumentDirection(lang) {
    const dir = RTL_LANGS.indexOf(lang) !== -1 ? 'rtl' : 'ltr';
    const root = document.documentElement;
    root.setAttribute('dir', dir);
    root.lang = lang;
    if (document.body) document.body.setAttribute('dir', dir);
  }

  function suggestLangFor(lang) {
    // English ↔ Swahili pair; every other language pairs with English.
    return lang === 'en' ? 'sw' : 'en';
  }

  function syncSwitcherUI(lang) {
    const label = LANG_LABELS[lang] || LANG_LABELS.en;
    const suggest = suggestLangFor(lang);
    const suggestLabel = LANG_LABELS[suggest] || LANG_LABELS.en;

    document.querySelectorAll('[data-lang-label]').forEach((el) => {
      el.textContent = label;
    });
    document.querySelectorAll('[data-lang-suggest]').forEach((el) => {
      el.textContent = suggestLabel;
      el.setAttribute('data-lang', suggest);
      el.setAttribute('aria-label', suggestLabel);
    });
    document.querySelectorAll('.lang-btn').forEach((btn) => {
      const active = btn.dataset.lang === lang;
      const available = availableLanguages.has(btn.dataset.lang);
      btn.classList.toggle('active', active);
      btn.disabled = !available;
      btn.dataset.available = String(available);
      btn.setAttribute('aria-checked', String(active));
      btn.setAttribute('aria-disabled', String(!available));
      btn.setAttribute('aria-label', `${LANG_LABELS[btn.dataset.lang] || btn.dataset.lang}${available ? '' : ' (translation pending)'}`);
      if (active) btn.setAttribute('aria-current', 'true');
      else btn.removeAttribute('aria-current');
    });
    document.querySelectorAll('.mob-language-option[data-lang]').forEach((btn) => {
      const active = btn.dataset.lang === lang;
      const available = availableLanguages.has(btn.dataset.lang);
      btn.classList.toggle('active', active);
      btn.disabled = !available;
      btn.dataset.available = String(available);
      btn.setAttribute('aria-checked', String(active));
      btn.setAttribute('aria-disabled', String(!available));
      btn.setAttribute('aria-label', `${LANG_LABELS[btn.dataset.lang] || btn.dataset.lang}${available ? '' : ' (translation pending)'}`);
      if (active) btn.setAttribute('aria-current', 'true');
      else btn.removeAttribute('aria-current');
    });
    document.querySelectorAll('.lang-switcher').forEach((root) => {
      root.classList.toggle('is-rtl-lang', RTL_LANGS.indexOf(lang) !== -1);
      root.dataset.activeLang = lang;
      root.dataset.suggestLang = suggest;
    });
    document.querySelectorAll('.lang-trigger').forEach((trigger) => {
      // Compact mobile header shows selected language only; keep aria in sync.
      const visibleLabel = trigger.querySelector('[data-lang-label]') || trigger.querySelector('span');
      if (visibleLabel) visibleLabel.textContent = label;
      trigger.setAttribute('aria-label', label);
      trigger.setAttribute('title', label);
    });
  }

  function clearHoverTimers() {
    if (hoverOpenTimer) {
      clearTimeout(hoverOpenTimer);
      hoverOpenTimer = null;
    }
    if (hoverCloseTimer) {
      clearTimeout(hoverCloseTimer);
      hoverCloseTimer = null;
    }
  }

  function closeAllMenus() {
    clearHoverTimers();
    document.querySelectorAll('.lang-switcher').forEach((root) => {
      root.classList.remove('is-open');
      const trigger = root.querySelector('.lang-trigger');
      const menu = root.querySelector('.lang-menu');
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
      if (menu) menu.hidden = true;
      const status = root.querySelector('.lang-status');
      if (status) status.hidden = true;
    });
  }

  function toggleMenu(root, forceOpen) {
    const trigger = root.querySelector('.lang-trigger');
    const menu = root.querySelector('.lang-menu');
    if (!trigger || !menu) return;
    const willOpen = typeof forceOpen === 'boolean' ? forceOpen : !root.classList.contains('is-open');
    if (willOpen) {
      document.querySelectorAll('.lang-switcher.is-open').forEach((other) => {
        if (other !== root) {
          other.classList.remove('is-open');
          const tEl = other.querySelector('.lang-trigger');
          const mEl = other.querySelector('.lang-menu');
          if (tEl) tEl.setAttribute('aria-expanded', 'false');
          if (mEl) mEl.hidden = true;
        }
      });
      root.classList.add('is-open');
      trigger.setAttribute('aria-expanded', 'true');
      menu.hidden = false;
    } else {
      root.classList.remove('is-open');
      trigger.setAttribute('aria-expanded', 'false');
      menu.hidden = true;
    }
  }

  function canHoverOpen() {
    try {
      return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    } catch (e) {
      return true;
    }
  }

  function releaseBootGate() {
    const root = document.documentElement;
    if (root && root.classList.contains(BOOT_GATE_CLASS)) root.classList.remove(BOOT_GATE_CLASS);
  }

  function applyAll(lang) {
    try {
      applyLanguage(lang);
    } finally {
      // Released only after the resolved locale is in the DOM (or after a
      // failure fell back to English), so the gate can never strand a page.
      releaseBootGate();
    }
  }

  function applyLanguage(lang) {
    window.LakeSplitText?.prepareForLanguageChange?.();
    const numberSelector = '[data-i18n-number], .fs-marker-no, .fs-stat-no:not([data-count]), .aficd-growth-number, .atl-product-num, .step-num, .lp-mandate li > span:first-child, .lp-meta > div > strong, .stat-no2, .hero-kf-num, a[href^="tel:"] > span';
    const numberNodes = document.querySelectorAll(numberSelector);
    numberNodes.forEach((el) => {
      if (el.hasAttribute('data-i18n') || el.hasAttribute('data-number')) return;
      const raw = el.getAttribute('data-i18n-number') || el.textContent;
      el.setAttribute('data-number', raw);
      el.dir = 'ltr';
      el.style.unicodeBidi = 'isolate';
      const phone = el.parentElement?.closest('a[href^="tel:"]');
      if (phone) {
        el.dir = 'ltr';
        el.style.unicodeBidi = 'isolate';
        el.setAttribute('data-raw-copy', phone.getAttribute('href').slice(4));
      }
    });
    const telephoneLinks = document.querySelectorAll('a[href^="tel:"]');
    telephoneLinks.forEach((link) => {
      link.dir = 'ltr';
      link.style.unicodeBidi = 'isolate';
      link.setAttribute('data-raw-copy', link.getAttribute('href').slice(4));
      const walker = document.createTreeWalker(link, NodeFilter.SHOW_TEXT);
      let textNode;
      while ((textNode = walker.nextNode())) {
        if (textNode.parentElement?.closest('[data-number]')) continue;
        if (!/^\s*\+?[\d][\d\s().-]*\s*$/.test(textNode.nodeValue || '')) continue;
        if (!telephoneTextSources.has(textNode)) telephoneTextSources.set(textNode, textNode.nodeValue);
      }
    });
    const nodes = document.querySelectorAll(
      '[data-i18n], [data-i18n-placeholder], [data-i18n-title], [data-i18n-alt], [data-i18n-aria], [data-i18n-number]'
    );
    nodes.forEach((el) => applyToElement(el, lang));

    setDocumentDirection(lang);
    syncSwitcherUI(lang);
    closeAllMenus();
    // Apply exact-source editorial rows before numeral shaping; otherwise an
    // Arabic numeral pass can change the source text and block a valid match.
    applyPublishedPage(lang);
    localizeGeographicLabels(lang);

    // Hardcoded numeral nodes (mandate 01/02/03, section markers, meta stats) without i18n keys.
    numberNodes.forEach((el) => {
      if (el.hasAttribute('data-i18n')) return;
      const translatedByPage = appliedAutoTargets.some((target) => target.node === el || target.node.parentElement === el);
      const value = translatedByPage ? el.textContent : (el.getAttribute('data-number') || el.getAttribute('data-i18n-number') || el.textContent);
      el.textContent = formatNumberForLang(lang, value);
    });
    telephoneLinks.forEach((link) => {
      const walker = document.createTreeWalker(link, NodeFilter.SHOW_TEXT);
      let textNode;
      while ((textNode = walker.nextNode())) {
        if (textNode.parentElement?.closest('[data-number]')) continue;
        const original = telephoneTextSources.get(textNode);
        if (original !== undefined) textNode.nodeValue = formatNumberForLang(lang, original);
      }
    });

    // Signal listeners only after keyed dictionaries and page drafts are both
    // applied. SplitText and other content listeners rebuild from this DOM.
    document.dispatchEvent(new CustomEvent('lake-i18n-applied', { detail: { lang } }));

    // CMS hydration listens to the event above and may rebuild shared navigation
    // synchronously. Re-apply keyed nodes after those listeners finish so the
    // shared CMS layer cannot put English source labels back into translated UI.
    document.querySelectorAll(
      '[data-i18n], [data-i18n-placeholder], [data-i18n-title], [data-i18n-alt], [data-i18n-aria]'
    ).forEach((el) => applyToElement(el, lang));
  }

  function showUnavailableMessage(lang) {
    const label = LANG_LABELS[lang] || lang;
    document.querySelectorAll('.lang-switcher').forEach((root) => {
      const menu = root.querySelector('.lang-menu');
      const status = root.querySelector('.lang-status');
      if (!menu || !status) return;
      status.textContent = `Translation for ${label} is not available yet. Showing English.`;
      status.hidden = false;
      menu.hidden = false;
      root.classList.add('is-open');
      const trigger = root.querySelector('.lang-trigger');
      if (trigger) trigger.setAttribute('aria-expanded', 'true');
    });
    document.querySelectorAll('.mob-language-status').forEach((status) => {
      status.textContent = `Translation for ${label} is not available yet. Showing English.`;
      status.hidden = false;
    });
  }

  function apply() {
    return Promise.all([loadDictionaries(), loadPublicationManifest()]).then(() => {
      let preferred = 'en';
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved && availableLanguages.has(saved)) preferred = saved;
      } catch (e) { /* unavailable */ }
      return (DRAFT_PREVIEW ? loadDraftLocale(preferred) : Promise.resolve(false)).then((draftReady) => draftReady ? null : loadPublishedLocale(preferred)).then(() => { current = preferred; applyAll(preferred); return current; }).catch(() => { current = 'en'; applyAll('en'); return current; });
    });
  }

  function selectLanguage(lang) {
    if (!availableLanguages.has(lang)) {
      showUnavailableMessage(lang);
      return Promise.resolve(current);
    }
    const revision = ++selectionRevision;
    return Promise.all([loadDictionaries(), DRAFT_PREVIEW ? loadDraftLocale(lang) : Promise.resolve(false)]).then(([, draftReady]) => {
      if (DRAFT_PREVIEW && draftReady) return null;
      return loadPublishedLocale(lang);
    }).then(() => {
      if (revision !== selectionRevision) return current;
      current = lang;
      try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* unavailable */ }
      applyAll(lang);
      return current;
    }).catch(() => {
      if (revision === selectionRevision) showUnavailableMessage(lang);
      return current;
    });
  }

  function hydrateDictionaries(content) {
    if (!content || typeof content !== 'object') return;
    const overlays = {};
    Object.keys(draftPageTranslations).forEach((lang) => { if (draftPageTranslations[lang]?.ready) overlays[lang] = dictionaries?.[lang] || content[lang] || {}; });
    dictionaries = { ...content, ...overlays };
    applyAll(current);
    document.dispatchEvent(new CustomEvent('lake-i18n-applied', { detail: { lang: current, hydrated: true } }));
  }

  function bindSwitcher(root) {
    if (!root || root.dataset.i18nBound === '1') return;
    root.dataset.i18nBound = '1';

    const trigger = root.querySelector('.lang-trigger');
    const menu = root.querySelector('.lang-menu');
    if (trigger) {
      trigger.disabled = false;
      trigger.setAttribute('aria-haspopup', 'menu');
      if (menu) trigger.setAttribute('aria-controls', menu.id || '');
      if (!trigger.hasAttribute('aria-expanded')) trigger.setAttribute('aria-expanded', 'false');
    }
    if (menu) menu.setAttribute('role', 'menu');
    if (trigger) {
      // Click/tap is the primary open path on all devices.
      trigger.addEventListener('click', (e) => {
        // Pair suggestion click switches language immediately.
        const suggestEl = e.target.closest && e.target.closest('[data-lang-suggest]');
        if (suggestEl) {
          e.preventDefault();
          e.stopPropagation();
          const next = suggestEl.getAttribute('data-lang');
          if (next && SUPPORTED.indexOf(next) !== -1) selectLanguage(next);
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        clearHoverTimers();
        toggleMenu(root);
      });
      // Keyboard only: open when Tab lands on the trigger (not pointer focus).
      trigger.addEventListener('focus', () => {
        if (!keyboardIntent) return;
        clearHoverTimers();
        toggleMenu(root, true);
      });
    }

    root.querySelectorAll('.lang-btn[data-lang]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        selectLanguage(btn.dataset.lang).then(() => {
          toggleMenu(root, false);
          trigger?.focus({ preventScroll: true });
        });
      });
    });

    menu?.addEventListener('keydown', (e) => {
      const choices = [...root.querySelectorAll('.lang-btn[data-lang]:not(:disabled)')];
      const currentIndex = choices.indexOf(document.activeElement);
      if (e.key === 'Escape') {
        e.preventDefault();
        toggleMenu(root, false);
        trigger?.focus({ preventScroll: true });
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!choices.length) return;
        const delta = e.key === 'ArrowDown' ? 1 : -1;
        choices[(currentIndex + delta + choices.length) % choices.length].focus();
      } else if (e.key === 'Home' || e.key === 'End') {
        e.preventDefault();
        (e.key === 'Home' ? choices[0] : choices[choices.length - 1])?.focus();
      }
    });

    // Desktop hover opens from the complete language trigger, including its
    // text label. The root owns delayed close so the pointer can cross into
    // the menu without losing the open state.
    if (trigger) {
      trigger.addEventListener('mouseenter', () => {
        if (!canHoverOpen()) return;
        if (hoverCloseTimer) {
          clearTimeout(hoverCloseTimer);
          hoverCloseTimer = null;
        }
        if (root.classList.contains('is-open') || hoverOpenTimer) return;
        hoverOpenTimer = setTimeout(() => {
          hoverOpenTimer = null;
          toggleMenu(root, true);
        }, LANG_OPEN_DELAY_MS);
      });
      trigger.addEventListener('mouseleave', () => {
        if (hoverOpenTimer) {
          clearTimeout(hoverOpenTimer);
          hoverOpenTimer = null;
        }
      });
    }

    // Cancel pending close while pointer is over trigger + open panel.
    root.addEventListener('mouseenter', () => {
      if (hoverCloseTimer) {
        clearTimeout(hoverCloseTimer);
        hoverCloseTimer = null;
      }
    });
    root.addEventListener('mouseleave', () => {
      if (!canHoverOpen()) return;
      if (hoverOpenTimer) {
        clearTimeout(hoverOpenTimer);
        hoverOpenTimer = null;
      }
      if (hoverCloseTimer) clearTimeout(hoverCloseTimer);
      hoverCloseTimer = setTimeout(() => {
        hoverCloseTimer = null;
        /* A pointer click leaves focus on the trigger, so :focus-within stayed
           true after the pointer moved away and the language menu never closed.
           Only keyboard focus (:focus-visible) should pin it open. */
        if (!root.querySelector(':focus-visible')) toggleMenu(root, false);
      }, LANG_CLOSE_DELAY_MS);
    });
  }

  function init() {
    if (DRAFT_PREVIEW) SUPPORTED.filter((language) => language !== 'en').forEach((language) => availableLanguages.add(language));
    document.querySelectorAll('.lang-switcher').forEach((root) => {
      if (!root.querySelector('.lang-menu')) {
        const menu = document.createElement('div'); menu.className = 'lang-menu'; menu.id = 'lang-menu'; menu.setAttribute('role', 'menu'); menu.setAttribute('aria-label', 'Language'); menu.hidden = true;
        const status = document.createElement('div'); status.className = 'lang-status'; status.setAttribute('role', 'status'); status.hidden = true; menu.appendChild(status);
        SUPPORTED.forEach((code) => { const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'lang-btn'; btn.setAttribute('role', 'menuitemradio'); btn.setAttribute('aria-checked', String(code === current)); btn.dataset.lang = code; btn.textContent = LANG_LABELS[code] || code; const available = availableLanguages.has(code); btn.dataset.available = String(available); btn.disabled = !available; btn.setAttribute('aria-label', `${LANG_LABELS[code] || code}${available ? '' : ' (translation pending)'}`); if (code === current) btn.classList.add('active'); menu.appendChild(btn); });
        root.appendChild(menu);
      }
      bindSwitcher(root);
    });
    // A rejected dictionary/manifest read must still resolve the page instead of
    // leaving the boot gate closed, so it degrades to English here.
    Promise.all([loadDictionaries(), loadPublicationManifest()]).catch(() => null).then(() => {
      let preferred = 'en';
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved && availableLanguages.has(saved)) preferred = saved;
      } catch (e) { /* unavailable */ }
      const revisionAtBootstrap = selectionRevision;
      (DRAFT_PREVIEW ? loadDraftLocale(preferred) : Promise.resolve(false)).then((draftReady) => draftReady ? null : loadPublishedLocale(preferred)).catch(() => { preferred = 'en'; }).then(() => {
        if (selectionRevision !== revisionAtBootstrap) { releaseBootGate(); return; }
        current = preferred;
        applyAll(preferred);
        // Warm the existing draft assets after the first paint so a visitor's
        // first language choice does not wait on three JSON requests.
        if (DRAFT_PREVIEW) loadDraftPreviews();
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab' || e.key === 'ArrowDown' || e.key === 'ArrowUp' ||
          e.key === 'Enter' || e.key === ' ') {
        keyboardIntent = true;
      }
    }, true);
    document.addEventListener('pointerdown', () => { keyboardIntent = false; }, true);
    document.addEventListener('lake-mobile-language-select', (event) => {
      const lang = event.detail?.lang;
      if (lang && SUPPORTED.indexOf(lang) !== -1) selectLanguage(lang);
    });

    closeAllMenus();
  }

  /* The stored locale's payload starts downloading as soon as this deferred
     script runs rather than waiting for site.js' DOMContentLoaded init(), so
     the boot gate opens on the network round trip alone. Nothing is applied
     here: init() still owns the first applyAll() so every page script has
     attached its listeners before translations land. */
  function warmStoredLocale() {
    let preferred = 'en';
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && SUPPORTED.indexOf(saved) !== -1) preferred = saved;
    } catch (e) { return; }
    if (preferred === 'en') return;
    Promise.all([loadDictionaries(), loadPublicationManifest()])
      .then(() => (DRAFT_PREVIEW ? loadDraftLocale(preferred) : Promise.resolve(false)))
      .catch(() => false);
  }

  try { warmStoredLocale(); } catch (e) { /* boot must never throw */ }

  return {
    init,
    apply,
    hydrateDictionaries,
    t,
    formatNumberForLang,
    localizeDigitsInText,
    localizeVisitorText,
    protectBrandNames,
    LANG_LABELS,
    SUPPORTED,
    get current() { return current; },
    get available() { return [...availableLanguages]; },
    get draftPreview() { return DRAFT_PREVIEW; }
  };
})();
