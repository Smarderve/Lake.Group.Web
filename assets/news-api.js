/* =========================================================
 * Lake Group · News API loader (Phase 8 · Task 8.5)
 *
 * Reads PUBLISHED, scheduled-visible articles from the immutable same-origin
 * public release. The bundled window.LAKE_NEWS dataset is a generated
 * compatibility rendering from the same release.
 * ========================================================= */
(function () {
  'use strict';

  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  var pending = !!(window.LakePublicContentReady || window.LakePublicContent);
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

  function loadFromSnapshot() {
    var delivery = window.LakePublicContentReady ||
      Promise.resolve(window.LakePublicContent || null);
    delivery
      .then(function (client) { return client ? client.list('news') : []; })
      .then(function (docs) {
        /* Never swap the global out from under an already-rendered page. */
        if (settled) return;
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
        settle();
      });
  }

  /* Readiness API consumed by assets/news.js (boot gate). */
  window.LakeNews = {
    isPending: isPending,
    onReady: onReady
  };

  if (pending) loadFromSnapshot();
})();
