/* =========================================================
 * Lake Group — News API loader
 *
 * Fetches published articles from the self-hosted Payload CMS
 * (GET /api/news) and falls back to the bundled window.LAKE_NEWS
 * dataset when the API is unreachable or unconfigured.
 *
 * Configure the endpoint BEFORE this script loads, e.g. in news.html:
 *   window.LAKE_NEWS_API_URL = 'https://cms.example.com';
 * Leave it empty to always use the bundled dataset.
 * ========================================================= */
(function () {
  'use strict';

  var API_BASE = (window.LAKE_NEWS_API_URL || '').replace(/\/+$/, '');
  var FETCH_TIMEOUT = 4000;   /* ms — fall back to bundled data if the CMS is slow */
  var MAX_ARTICLES = 100;

  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  /* No API configured → the bundled window.LAKE_NEWS is already ready. */
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

  /* Payload media URLs may be relative to the CMS origin. */
  function resolveUrl(url) {
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;
    return API_BASE + (url.charAt(0) === '/' ? '' : '/') + url;
  }

  /* Payload returns ISO dates; the site displays "15 Feb, 2026". */
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

  /* Payload news doc → the site's LAKE_NEWS article shape. */
  function normalizeDoc(doc) {
    if (!doc || !doc.title) return null;
    var paragraphs = (doc.description || []).map(function (p) {
      return p && p.paragraph;
    }).filter(Boolean);
    if (!paragraphs.length && doc.excerpt) paragraphs = [doc.excerpt];
    return {
      id: doc.legacyId != null ? doc.legacyId : doc.id,
      title: doc.title,
      date: formatDisplayDate(doc.date),
      category: doc.category || 'News',
      bannerImage: resolveUrl(doc.bannerImage && doc.bannerImage.url),
      description: paragraphs,
      images: (doc.images || []).map(function (g) {
        return resolveUrl(g && g.image && g.image.url);
      }).filter(Boolean),
      video: doc.videoUrl || null
    };
  }

  function loadFromApi() {
    var url = API_BASE + '/api/news?limit=' + MAX_ARTICLES +
      '&sort=-date&depth=2&where[status][equals]=published';

    var timer = setTimeout(function () {
      settle(); /* CMS unreachable — keep the bundled dataset */
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
        var docs = payload && Array.isArray(payload.docs) ? payload.docs : [];
        if (!docs.length) {
          settle();
          return;
        }
        /* Defensive newest-first sort: the featured-then-cards layout
           assumes the first article is the most recent. */
        docs.sort(function (a, b) {
          return new Date(b.date || 0) - new Date(a.date || 0);
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
