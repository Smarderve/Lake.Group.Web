/* =========================================================
 * Lake Group · News API loader (Phase 8 · Task 8.5)
 *
 * Fetches published articles from the Lake Group backend
 * (GET /api/public/news — PUBLISHED + scheduled-visible only) and
 * falls back to the bundled window.LAKE_NEWS dataset when the
 * API is unreachable or unconfigured.
 *
 * Configure the endpoint BEFORE this script loads, e.g. in news.html:
 *   window.LAKE_API_BASE = 'http://127.0.0.1:4000';
 * (window.LAKE_NEWS_API_URL is honoured as a legacy alias.)
 * Leave it unset and the bundled dataset renders instantly — news is the
 * only loader that BLOCKS rendering, so it only probes when configured.
 * ========================================================= */
(function () {
  'use strict';

  var API_BASE = (window.LAKE_API_BASE || window.LAKE_NEWS_API_URL || '').replace(/\/+$/, '');
  var FETCH_TIMEOUT = 4000;   /* ms — fall back to bundled data if the backend is slow */
  var MAX_ARTICLES = 100;

  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  /* Unconfigured → the bundled window.LAKE_NEWS is already ready. */
  var pending = !!API_BASE;
  var readyCallbacks = [];
  var settled = false;

  function isPending() {
    return pending;
  }

  function onReady(cb) {
    if (!pending) {
      cb();
      return;
    }
    readyCallbacks.push(cb);
  }

  function settle() {
    if (settled) return;
    settled = true;
    pending = false;
    var cbs = readyCallbacks.slice();
    readyCallbacks = [];
    cbs.forEach(function (cb) {
      try {
        cb();
      } catch (e) { /* a failing renderer must never break the page */ }
    });
  }

  /* Backend publicationDate is ISO ("2026-02-15T00:00:00.000Z") — the site
     displays "15 Feb, 2026". */
  function formatDisplayDate(iso) {
    if (!iso) return '';
    var m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      var day = parseInt(m[3], 10);
      var month = MONTHS[parseInt(m[2], 10) - 1] || m[2];
      return day + ' ' + month + ', ' + m[1];
    }
    var d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    return d.getDate() + ' ' + MONTHS[d.getMonth()] + ', ' + d.getFullYear();
  }

  /* Backend news row → the site's LAKE_NEWS article shape. The row already
     carries `category` (name) and `bannerImage` (hero media url) — the
     public router resolves both so the frontend stays free of N+1 lookups. */
  function normalizeDoc(doc) {
    if (!doc || !doc.title) return null;
    var banner = doc.bannerImage || '';
    return {
      id: doc.id,
      title: doc.title,
      date: formatDisplayDate(doc.publicationDate || doc.date),
      category: doc.category || 'News',
      bannerImage: banner,
      description: doc.body ? doc.body.split(/\n\n+/).filter(Boolean) : [],
      images: banner ? [banner] : [],
      video: null
    };
  }

  function loadFromApi() {
    var url = API_BASE + '/api/public/news?limit=' + MAX_ARTICLES;

    var timer = setTimeout(function () {
      settle(); /* backend unreachable — keep the bundled dataset */
    }, FETCH_TIMEOUT);

    fetch(url, { headers: { Accept: 'application/json' } })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (payload) {
        clearTimeout(timer);
        /* If the timeout already fired, the page booted with the bundled
           dataset — never swap the global out from under a rendered page. */
        if (settled) return;
        var docs = payload && Array.isArray(payload.news) ? payload.news : [];
        if (!docs.length) {
          settle();
          return;
        }
        /* Defensive newest-first sort: the featured-then-cards layout
           assumes the first article is the most recent. */
        docs.sort(function (a, b) {
          return new Date(b.publicationDate || b.date || 0) - new Date(a.publicationDate || a.date || 0);
        });
        var articles = docs.map(normalizeDoc).filter(Boolean);
        if (articles.length) {
          window.LAKE_NEWS = articles;
        }
        settle();
      })
      .catch(function () {
        clearTimeout(timer);
        settle();
      });
  }

  /* Readiness API consumed by assets/news.js (boot gate). */
  window.LakeNews = {
    isPending: isPending,
    onReady: onReady
  };

  if (API_BASE) loadFromApi();
})();
