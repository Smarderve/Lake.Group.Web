/* =========================================================
 * Lake Group · Metrics API loader (Phase 8 · Task 8.1)
 *
 * Hydrates any element tagged with data-metric-key="<key>" from the immutable
 * same-origin public release. Only governed PUBLISHED values enter a release.
 *
 * Element contract:
 *   - data-metric-key="employees"        → plain text span: textContent = value
 *   - data-count + data-suffix           → animated counter (site.js):
 *                                          data-count = numeric part, suffix kept,
 *                                          repainted via LakeSite.refreshCountersForLang()
 *   - data-i18n-number / data-number     → i18n-managed number (our-story/ending):
 *                                          data-number + textContent updated so a
 *                                          language switch re-formats the served value
 *
 * Failure is silent by design: the generated static markup shipped in the
 * same release remains visible.
 * ========================================================= */
(function () {
  'use strict';

  function extractNumeric(value) {
    var m = String(value).match(/\d[\d,]*/);
    return m ? m[0].replace(/,/g, '') : null;
  }

  function extractSuffix(value, current) {
    /* "30,000+" → "+" ; "154" → keep existing suffix; "$12" → "$" stays prefix. */
    var m = String(value).match(/[^0-9,]+$/);
    return m ? m[0] : current || '';
  }

  function refreshCounters() {
    if (window.LakeSite && typeof window.LakeSite.refreshCountersForLang === 'function') {
      try { window.LakeSite.refreshCountersForLang(); } catch (_) { /* never break the page */ }
    }
  }

  function applyValue(el, value) {
    if (!value) return;

    if (el.hasAttribute('data-count')) {
      /* Animated counter — retarget the numeric part + suffix, then repaint.
         If the counter is mid-animation, refreshCountersForLang skips it, so
         schedule a second repaint after the 1.6 s count-up window. */
      var numeric = extractNumeric(value);
      var counting = el.dataset.counting === '1';
      if (numeric) el.setAttribute('data-count', numeric);
      el.setAttribute('data-suffix', extractSuffix(value, el.getAttribute('data-suffix') || ''));
      refreshCounters();
      if (counting) setTimeout(refreshCounters, 1700);
      return;
    }

    /* i18n-managed number: keep the source attribute in sync so a language
       switch re-formats the served value, not the static fallback. */
    if (el.hasAttribute('data-number') || el.hasAttribute('data-i18n-number')) {
      el.setAttribute('data-number', value);
    }
    el.textContent = value;
  }

  function hydrateKey(key) {
    var delivery = window.LakePublicContentReady ||
      Promise.resolve(window.LakePublicContent || null);
    delivery
      .then(function (client) { return client ? client.metric(key) : null; })
      .then(function (metric) {
        if (!metric || typeof metric.value !== 'string') return;
        document.querySelectorAll('[data-metric-key="' + key + '"]').forEach(function (el) {
          applyValue(el, metric.value);
        });
        document.dispatchEvent(new CustomEvent('lake:metric-updated', { detail: { key: key } }));
      })
      .catch(function () {
        /* Keep the generated static release rendering. */
      });
  }

  function init() {
    var els = document.querySelectorAll('[data-metric-key]');
    var keys = [];
    els.forEach(function (el) {
      var key = el.getAttribute('data-metric-key');
      if (key && keys.indexOf(key) === -1) keys.push(key);
    });
    keys.forEach(hydrateKey);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
