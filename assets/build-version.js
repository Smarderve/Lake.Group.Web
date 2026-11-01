/* Deterministic release marker used by support and cache diagnostics. */
(function () {
  'use strict';
  // This is the single early-boot source of truth shared by the inline locale
  // gate and the deferred i18n/site runtimes. Keep it before those scripts so
  // a previously saved locale cannot affect first paint while the selector is
  // disabled.
  window.LANGUAGE_SWITCHER_ENABLED = false;
  function enforceEnglishBootState() {
    try {
      localStorage.setItem('lake-lang', 'en');
      sessionStorage.setItem('lake-lang', 'en');
    } catch (e) { /* storage may be blocked */ }
    if (document.documentElement) {
      document.documentElement.lang = 'en';
      document.documentElement.dir = 'ltr';
    }
  }
  if (!window.LANGUAGE_SWITCHER_ENABLED) {
    enforceEnglishBootState();
    window.addEventListener('pageshow', enforceEnglishBootState);
  }
  window.__LAKE_BUILD__ = '2026-08-31.02';
  if (window.console && console.info) console.info('Lake Group build: ' + window.__LAKE_BUILD__);
})();
