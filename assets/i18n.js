/**
 * Lake Group i18n engine  EN / FR / SW / HI / AR.
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
 * Language choice persists across page navigation via localStorage, since
 * this is a multi-page static site (each page load re-runs this script).
 * Arabic sets document direction to RTL; all other languages use LTR.
 */
window.LakeI18n = (function () {
  const STORAGE_KEY = 'lake-lang';
  const SUPPORTED = ['en', 'fr', 'sw', 'hi', 'ar'];
  const RTL_LANGS = ['ar'];
  const LANG_LABELS = {
    en: 'English',
    fr: 'Français',
    sw: 'Swahili',
    hi: 'हिन्दी',
    ar: 'العربية'
  };

  let dictionaries = null;
  let current = 'en';
  let hoverCloseTimer = null;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED.indexOf(stored) !== -1) current = stored;
  } catch (e) {
    /* localStorage unavailable - fall back to 'en' */
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
    dictionaries = { en: {}, fr: {}, sw: {}, hi: {}, ar: {} };
    return Promise.resolve(dictionaries);
  }

  const DIGIT_MAPS = {
    ar: ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'],
    hi: ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९']
  };

  function formatNumberForLang(lang, value) {
    const str = value == null ? '' : String(value);
    const map = DIGIT_MAPS[lang];
    if (!map) return str;
    return str.replace(/[0-9]/g, (d) => map[d.charCodeAt(0) - 48]);
  }

  function localizeDigitsInText(lang, text) {
    if (typeof text !== 'string' || !text) return text;
    if (!DIGIT_MAPS[lang]) return text;
    return formatNumberForLang(lang, text);
  }

  function t(key, lang) {
    const useLang = lang || current;
    if (!dictionaries) return null;
    const pack = dictionaries[useLang] || dictionaries.en || {};
    if (Object.prototype.hasOwnProperty.call(pack, key)) return pack[key];
    const enPack = dictionaries.en || {};
    if (Object.prototype.hasOwnProperty.call(enPack, key)) return enPack[key];
    return null;
  }

  function applyToElement(el, lang) {
    const key = el.getAttribute('data-i18n');
    if (key) {
      let val = t(key, lang);
      if (val !== null) {
        // Eastern Arabic / Devanagari digits for ar/hi display strings.
        // Skip when data-i18n-latin-digits is present (e.g. emails, codes).
        if (!el.hasAttribute('data-i18n-latin-digits')) {
          val = localizeDigitsInText(lang, val);
        }
        if (el.hasAttribute('data-i18n-html')) {
          el.innerHTML = val;
        } else {
          el.textContent = val;
        }
      }
    }

    const numAttr = el.getAttribute('data-i18n-number');
    if (numAttr !== null) {
      const raw = numAttr === '' ? (el.getAttribute('data-number') || el.textContent) : numAttr;
      if (!el.hasAttribute('data-number')) el.setAttribute('data-number', raw);
      el.textContent = formatNumberForLang(lang, el.getAttribute('data-number') || raw);
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
      btn.classList.toggle('active', active);
      if (active) btn.setAttribute('aria-current', 'true');
      else btn.removeAttribute('aria-current');
    });
    document.querySelectorAll('.lang-switcher').forEach((root) => {
      root.classList.toggle('is-rtl-lang', RTL_LANGS.indexOf(lang) !== -1);
      root.dataset.activeLang = lang;
      root.dataset.suggestLang = suggest;
    });
    document.querySelectorAll('.lang-trigger').forEach((trigger) => {
      trigger.setAttribute('aria-label', label + ' | ' + suggestLabel);
    });
  }

  function closeAllMenus() {
    if (hoverCloseTimer) {
      clearTimeout(hoverCloseTimer);
      hoverCloseTimer = null;
    }
    document.querySelectorAll('.lang-switcher').forEach((root) => {
      root.classList.remove('is-open');
      const trigger = root.querySelector('.lang-trigger');
      const menu = root.querySelector('.lang-menu');
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
      if (menu) menu.hidden = true;
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

  function applyAll(lang) {
    const nodes = document.querySelectorAll(
      '[data-i18n], [data-i18n-placeholder], [data-i18n-title], [data-i18n-alt], [data-i18n-aria], [data-i18n-number]'
    );
    nodes.forEach((el) => applyToElement(el, lang));

    // Hardcoded numeral nodes (mandate 01/02/03, section markers, meta stats) without i18n keys.
    document.querySelectorAll('[data-i18n-number], .fs-marker-no, .lp-mandate li > span:first-child, .lp-meta > div > strong').forEach((el) => {
      if (el.hasAttribute('data-i18n')) return;
      const raw = el.getAttribute('data-number') || el.getAttribute('data-i18n-number') || el.textContent;
      if (!el.hasAttribute('data-number')) el.setAttribute('data-number', raw);
      el.textContent = formatNumberForLang(lang, el.getAttribute('data-number'));
    });

    setDocumentDirection(lang);
    syncSwitcherUI(lang);
    closeAllMenus();
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

  function bindSwitcher(root) {
    if (!root || root.dataset.i18nBound === '1') return;
    root.dataset.i18nBound = '1';

    const trigger = root.querySelector('.lang-trigger');
    if (trigger) {
      trigger.addEventListener('click', (e) => {
        // Pair suggestion click switches language immediately.
        const suggestEl = e.target.closest && e.target.closest('[data-lang-suggest]');
        if (suggestEl) {
          e.preventDefault();
          e.stopPropagation();
          const next = suggestEl.getAttribute('data-lang');
          if (next && SUPPORTED.indexOf(next) !== -1) apply(next);
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        toggleMenu(root);
      });
    }

    root.querySelectorAll('.lang-btn[data-lang]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        apply(btn.dataset.lang);
      });
    });

    // Desktop: open on hover; keep click/tap for touch + keyboard.
    root.addEventListener('mouseenter', () => {
      if (!canHoverOpen()) return;
      if (hoverCloseTimer) {
        clearTimeout(hoverCloseTimer);
        hoverCloseTimer = null;
      }
      toggleMenu(root, true);
    });
    root.addEventListener('mouseleave', () => {
      if (!canHoverOpen()) return;
      if (hoverCloseTimer) clearTimeout(hoverCloseTimer);
      hoverCloseTimer = setTimeout(() => {
        if (!root.matches(':focus-within')) toggleMenu(root, false);
        hoverCloseTimer = null;
      }, 140);
    });
    root.addEventListener('focusin', () => {
      toggleMenu(root, true);
    });
  }

  function init() {
    loadDictionaries().then(() => applyAll(current));

    document.querySelectorAll('.lang-switcher').forEach(bindSwitcher);

    document.querySelectorAll('.lang-btn[data-lang]').forEach((btn) => {
      if (btn.closest('.lang-switcher')) return;
      if (btn.dataset.i18nBound === '1') return;
      btn.dataset.i18nBound = '1';
      btn.addEventListener('click', () => apply(btn.dataset.lang));
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest || !e.target.closest('.lang-switcher')) closeAllMenus();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeAllMenus();
    });
  }

  return {
    init,
    apply,
    t,
    formatNumberForLang,
    localizeDigitsInText,
    LANG_LABELS,
    SUPPORTED,
    get current() { return current; }
  };
})();
