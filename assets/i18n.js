/**
 * Lake Group i18n engine — EN / FR / SW.
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
 * This also replaces an even older version, which only shipped ~35 keys
 * (nav/footer/hero) and therefore only ever translated page chrome - every
 * other piece of text on every page stayed in English regardless of which
 * language button was clicked. The content file now covers the whole site.
 *
 * Language choice persists across page navigation via localStorage, since
 * this is a multi-page static site (each page load re-runs this script).
 */
window.LakeI18n = (function () {
  const STORAGE_KEY = 'lake-lang';
  const SUPPORTED = ['en', 'fr', 'sw'];

  let dictionaries = null; // { en: {...}, fr: {...}, sw: {...} }
  let current = 'en';

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED.indexOf(stored) !== -1) current = stored;
  } catch (e) {
    /* localStorage unavailable (privacy mode etc.) — fall back to 'en' */
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
    dictionaries = { en: {}, fr: {}, sw: {} };
    return Promise.resolve(dictionaries);
  }

  function t(key, lang) {
    const useLang = lang || current;
    if (!dictionaries) return null;
    const pack = dictionaries[useLang] || dictionaries.en || {};
    if (Object.prototype.hasOwnProperty.call(pack, key)) return pack[key];
    const enPack = dictionaries.en || {};
    if (Object.prototype.hasOwnProperty.call(enPack, key)) return enPack[key];
    return null; // unknown key -> caller keeps existing DOM text (English)
  }

  function applyToElement(el, lang) {
    const key = el.getAttribute('data-i18n');
    if (key) {
      const val = t(key, lang);
      if (val !== null) {
        if (el.hasAttribute('data-i18n-html')) {
          el.innerHTML = val;
        } else {
          el.textContent = val;
        }
      }
      // If val is null (no translation yet for this key in this language),
      // we deliberately leave the existing DOM content untouched — it will
      // still be showing the original English, which is far better than a
      // raw key string like "fuel.17" or a blank element.
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

  function applyAll(lang) {
    const nodes = document.querySelectorAll(
      '[data-i18n], [data-i18n-placeholder], [data-i18n-title], [data-i18n-alt], [data-i18n-aria]'
    );
    nodes.forEach((el) => applyToElement(el, lang));

    document.documentElement.lang = lang;
    document.querySelectorAll('.lang-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });
    document.dispatchEvent(new CustomEvent('lake-i18n-applied', { detail: { lang } }));
  }

  function apply(lang) {
    if (lang && SUPPORTED.indexOf(lang) !== -1) current = lang;
    try {
      localStorage.setItem(STORAGE_KEY, current);
    } catch (e) {
      /* ignore */
    }
    return loadDictionaries().then(() => applyAll(current));
  }

  function init() {
    loadDictionaries().then(() => applyAll(current));
    document.querySelectorAll('.lang-btn').forEach((btn) => {
      btn.addEventListener('click', () => apply(btn.dataset.lang));
    });
  }

  // Public API. `t` is exposed for any inline scripts (e.g. chat widget)
  // that need a translated string for dynamically-generated content.
  return { init, apply, t, get current() { return current; } };
})();
