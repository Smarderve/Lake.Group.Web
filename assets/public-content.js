/* Lake Group versioned public-content delivery.
 *
 * Loads the immutable, same-origin release selected by public-content/current.json.
 * The live CMS/backend is deliberately not consulted by visitors.
 */
(function () {
  'use strict';

  var BASE = '/public-content/';
  var state = 'loading';
  var release = null;

  function getJson(url) {
    return fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-cache' })
      .then(function (response) {
        if (!response.ok) throw new Error('Published content unavailable');
        return response.json();
      });
  }

  function safeSnapshotUrl(value) {
    var url = String(value || '').replace(/^\/+/, '');
    if (!url || url.indexOf('..') !== -1 || /^[a-z]+:/i.test(url)) {
      throw new Error('Invalid published-content release URL');
    }
    return BASE + url;
  }

  function applyPageMetadata(snapshot) {
    var pathname = (location.pathname || '/').replace(/\/+$/, '');
    var filename = pathname.split('/').pop() || '';
    var slug = !filename || filename === 'index.html'
      ? 'home'
      : filename.replace(/\.html$/i, '');
    var pages = snapshot.entities.pages || [];
    var page = pages.find(function (row) { return row.slug === slug; });
    if (!page) return;
    if (page.metaTitle) document.title = page.metaTitle;
    [
      ['meta[name="description"]', page.metaDescription],
      ['meta[property="og:title"]', page.metaTitle],
      ['meta[property="og:description"]', page.metaDescription]
    ].forEach(function (entry) {
      var element = document.querySelector(entry[0]);
      if (element && entry[1]) element.setAttribute('content', entry[1]);
    });
  }

  var ready = getJson(BASE + 'current.json')
    .then(function (manifest) {
      return getJson(safeSnapshotUrl(manifest.snapshotUrl)).then(function (snapshot) {
        if (!snapshot || snapshot.releaseId !== manifest.releaseId || !snapshot.entities) {
          throw new Error('Published-content release validation failed');
        }
        release = snapshot;
        state = 'ready';
        applyPageMetadata(snapshot);
        return release;
      });
    })
    .catch(function (error) {
      state = 'unavailable';
      throw error;
    });

  /* Avoid unhandled rejection noise when a page has no snapshot-aware module. */
  ready.catch(function () {});

  window.LakePublicContent = {
    ready: ready,
    status: function () { return state; },
    releaseId: function () { return release ? release.releaseId : null; },
    list: function (entity) {
      return ready.then(function (snapshot) {
        var rows = snapshot.entities[entity];
        return Array.isArray(rows) ? rows : [];
      });
    },
    metric: function (key) {
      return ready.then(function (snapshot) {
        var rows = snapshot.entities.metrics || [];
        return rows.find(function (row) { return row.key === key; }) || null;
      });
    },
    map: function () {
      return ready.then(function (snapshot) { return snapshot.map; });
    },
    knowledge: function () {
      return ready.then(function (snapshot) { return snapshot.knowledge; });
    }
  };
})();
