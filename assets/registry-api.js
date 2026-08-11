/* =========================================================
 * Lake Group · Registry API loader (Phase 8 · Tasks 8.2–8.9)
 *
 * Generic entity hydration: any container tagged
 *   data-hydrate="<entity>"          (e.g. "companies", "leadership")
 * with rows tagged
 *   data-entity-key="<record key>"   (slug / name / id — matched against
 *                                    data-hydrate-match, default "slug")
 * and field elements tagged
 *   data-entity-field="<column>"     (text content by default)
 *   data-entity-attr="src|href|alt"  (attribute hydration)
 * is filled from the backend's public API (GET /api/public/:entity —
 * PUBLISHED records only). The static markup in the HTML is the fallback:
 * when the backend is unreachable, nothing changes.
 *
 * Configure the endpoint BEFORE this script loads, e.g.:
 *   window.LAKE_API_BASE = 'http://127.0.0.1:4000';   (default)
 *
 * i18n safety: hydrated text is re-applied after every language switch
 * (the i18n engine dispatches `lake-i18n-applied`), so backend-served
 * values win over the dictionary — the site truth lives in the API.
 *
 * Failure is silent by design: timeout or non-200 keeps the static markup.
 * ========================================================= */
(function () {
  'use strict';

  var API_BASE = (window.LAKE_API_BASE || 'http://127.0.0.1:4000').replace(/\/+$/, '');
  var FETCH_TIMEOUT = 5000; /* ms — fall back to static markup if the API is slow */
  var cache = {}; /* entity → Promise<records|null> */

  function fetchList(entity) {
    if (cache[entity]) return cache[entity];
    cache[entity] = new Promise(function (resolve) {
      var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      var timer = setTimeout(function () {
        if (ctrl) ctrl.abort();
        resolve(null);
      }, FETCH_TIMEOUT);
      fetch(API_BASE + '/api/public/' + entity, { signal: ctrl ? ctrl.signal : undefined })
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.json();
        })
        .then(function (json) {
          clearTimeout(timer);
          var keys = Object.keys(json || {});
          var arr = keys.length ? json[keys[0]] : null;
          resolve(Array.isArray(arr) ? arr : null);
        })
        .catch(function () {
          clearTimeout(timer);
          resolve(null);
        });
    });
    return cache[entity];
  }

  function recordValue(rec, field) {
    if (!rec) return null;
    var v = rec[field];
    if (v === undefined || v === null || v === '') return null;
    if (field === 'tags' && Array.isArray(v)) return v[0] || null;
    return String(v);
  }

  function applyField(el, rec, field, attr) {
    var v = recordValue(rec, field);
    if (v === null) return;
    if (attr === 'src' || attr === 'href' || attr === 'alt' || attr === 'title') {
      el.setAttribute(attr, v);
    } else if (attr && attr !== 'text') {
      el.setAttribute(attr, v); /* arbitrary attribute, e.g. data-caption */
    } else {
      el.textContent = v;
      el.setAttribute('data-hydrated', field);
    }
  }

  function hydrateContainer(container) {
    var entity = container.getAttribute('data-hydrate');
    if (!entity) return;
    fetchList(entity).then(function (records) {
      if (!records || !records.length) return; /* API down → static markup stays */

      var matchField = container.getAttribute('data-hydrate-match') || 'slug';
      var byKey = {};
      records.forEach(function (r) {
        var k = r[matchField] != null ? String(r[matchField]) : null;
        if (k) byKey[k] = r;
      });

      var rows = container.querySelectorAll('[data-entity-key]');
      rows.forEach(function (row) {
        var rec = byKey[row.getAttribute('data-entity-key')];
        if (!rec) return;

        var hrefField = row.getAttribute('data-entity-href');
        if (hrefField) {
          var hrefVal = recordValue(rec, hrefField);
          if (hrefVal !== null) row.setAttribute('href', hrefVal);
        }
        var rowField = row.getAttribute('data-entity-field');
        if (rowField) {
          applyField(row, rec, rowField, row.getAttribute('data-entity-attr') || 'text');
        }
        var fields = row.querySelectorAll('[data-entity-field]');
        fields.forEach(function (f) {
          applyField(f, rec, f.getAttribute('data-entity-field'), f.getAttribute('data-entity-attr') || 'text');
        });
        row.setAttribute('data-hydrated', '1');
      });
    });
  }

  function hydrateAll() {
    document.querySelectorAll('[data-hydrate]').forEach(hydrateContainer);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hydrateAll);
  } else {
    hydrateAll();
  }
  /* Language switches re-run i18n dict text — re-assert API-served truth. */
  document.addEventListener('lake-i18n-applied', hydrateAll);

  window.LakeRegistry = {
    hydrate: hydrateAll,
    apiBase: API_BASE,
  };
})();
