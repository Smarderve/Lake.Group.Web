/**
 * Lake Group · First-party analytics beacon (Phase 10).
 *
 * Fire-and-forget events to POST /api/public/analytics/events:
 *   - PAGE_VIEW on every page load (kept inside the session)
 *   - CHAT_QUESTION / CHAT_NO_MATCH / SEARCH via window.LakeAnalytics.track
 *     (the assistant reports what it was asked and whether it could answer)
 *
 * No third-party trackers, no cookies, nothing that can block or delay the
 * page: one keepalive fetch, failures swallowed. When no backend is
 * reachable (LAKE_API_BASE unset) the beacon is a silent no-op.
 */
(function () {
  'use strict';

  var API_BASE = (window.LAKE_API_BASE || '').replace(/\/+$/, '');
  var sessionKey = 'lake-analytics';

  function send(type, payload) {
    if (!API_BASE) return;
    var body = Object.assign({ type: type }, payload);
    try {
      fetch(API_BASE + '/api/public/analytics/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        keepalive: true,
      }).catch(function () { /* analytics must never break the site */ });
    } catch (e) { /* same */ }
  }

  function sessionId() {
    try {
      var sid = sessionStorage.getItem(sessionKey);
      if (!sid) {
        sid = 's' + Math.random().toString(36).slice(2) + Date.now().toString(36);
        sessionStorage.setItem(sessionKey, sid);
      }
      return sid;
    } catch (e) {
      return null;
    }
  }

  // Count every page load (back/forward-cache restores don't re-fire the
  // load event, so no double counting). Session id keeps visits grouped.
  function trackPageView() {
    var path = location.pathname || '/';
    send('PAGE_VIEW', {
      page: path,
      language: (window.LakeI18n && window.LakeI18n.current) || 'en',
      sessionId: sessionId(),
    });
  }

  window.LakeAnalytics = {
    track: function (type, opts) {
      opts = opts || {};
      send(String(type).toUpperCase(), {
        page: opts.page || location.pathname || null,
        query: opts.query || null,
        language: opts.language || (window.LakeI18n && window.LakeI18n.current) || 'en',
        sessionId: sessionId(),
      });
    },
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', trackPageView);
  } else {
    trackPageView();
  }
})();
