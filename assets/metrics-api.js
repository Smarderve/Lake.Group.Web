/* =========================================================
 * Lake Group · Metrics API loader (Phase 8 · Task 8.1)
 *
 * Hydrates any element tagged with data-metric-key="<key>" from the
 * backend's public metrics API (GET /api/public/metrics/:key — PUBLISHED
 * values only). This is the "Corporate Truth" migration: the website
 * renders the governed value when the backend is reachable, and falls
 * back to the static markup already in the HTML otherwise.
 *
 * Configure the endpoint BEFORE this script loads, e.g.:
 *   window.LAKE_METRICS_API = 'http://127.0.0.1:4000';   (default)
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
 * Failure is silent by design: timeout or non-200 keeps the static markup,
 * exactly as the page shipped. No console spam, no error UI.
 * ========================================================= */
(function () {
  'use strict';

  var API_BASE = (window.LAKE_METRICS_API || 'http://127.0.0.1:4000').replace(/\/+$/, '');
  var FETCH_TIMEOUT = 4000; /* ms — fall back to static markup if the API is slow */

  function extractNumeric(value) {
    var m = String(value).match(/\d[\d,]*/);
    return m ? m[0].replace(/,/g, '') : null;
  }

  function extractSuffix(value, current) {
    /* "30,000+" → "+" ; "152" → keep existing suffix; "$12" → "$" stays prefix. */
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
    var timer = setTimeout(function () {
      /* API unreachable — static markup stays. */
    }, FETCH_TIMEOUT);

    fetch(API_BASE + '/api/public/metrics/' + encodeURIComponent(key), { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (payload) {
        clearTimeout(timer);
        var metric = payload && payload.metric;
        if (!metric || typeof metric.value !== 'string') return;
        document.querySelectorAll('[data-metric-key="' + key + '"]').forEach(function (el) {
          applyValue(el, metric.value);
        });
      })
      .catch(function () {
        clearTimeout(timer);
        /* offline — keep the static fallback */
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
