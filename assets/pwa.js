/*
 * Lake Group PWA bootstrap: registers the service worker without any
 * user-facing update prompt. Loaded with `defer` on every page. Safe to
 * include anywhere . bails out silently when service workers are not
 * supported (file://, old browsers).
 *
 * v75: deterministic release registration and cache cleanup without forcing an
 * already-visible page through an update/reload cycle.
 */
(function () {
  'use strict';

  if (!('serviceWorker' in navigator)) return;

  var scriptEl = document.currentScript;
  var swUrl = 'sw.js';
  try {
    swUrl = new URL('../sw.js', scriptEl && scriptEl.src ? scriptEl.src : location.href).href;
  } catch (err) { /* fall back */ }

  // Append a cache-busting query so browsers revalidate sw.js on deploy.
  try {
    var u = new URL(swUrl, location.href);
    u.searchParams.set('v', '75-20260829-01');
    swUrl = u.href;
  } catch (err2) {
    swUrl = swUrl + (swUrl.indexOf('?') === -1 ? '?v=75-20260829-01' : '&v=75-20260829-01');
  }

  var RECOVERY_KEY = 'lake-sw-recovery-v75';

  /**
   * Detect the classic "giant unstyled logo" failure: design tokens never
   * applied, so nav logo renders at intrinsic PNG size. Recover once by
   * clearing obsolete Lake caches and unregistering a broken legacy worker.
   */
  function maybeRecoverBrokenStyles() {
    try {
      if (sessionStorage.getItem(RECOVERY_KEY) === '1') return;
      var logo = document.querySelector('.nav-logo img, .site-nav .nav-logo img');
      if (!logo) return;

      function check() {
        var h = logo.getBoundingClientRect().height;
        // Healthy logo is ~36–56px. > 120px means CSS tokens failed to apply.
        if (h < 120) return;
        sessionStorage.setItem(RECOVERY_KEY, '1');
        if (window.console && console.warn) {
          console.warn('[Lake PWA] Detected broken layout (oversized logo). Clearing SW caches…');
        }
        navigator.serviceWorker.getRegistrations().then(function (regs) {
          return Promise.all(
            regs.map(function (reg) {
              if (reg.active) reg.active.postMessage({ type: 'CLEAR_CACHES' });
              return reg.unregister();
            })
          );
        }).then(function () {
          return caches.keys();
        }).then(function (keys) {
          return Promise.all(
            keys
              .filter(function (k) { return k.indexOf('lake-') === 0; })
              .map(function (k) { return caches.delete(k); })
          );
        }).then(function () {
        }).catch(function () {});
      }

      if (logo.complete) {
        window.setTimeout(check, 400);
      } else {
        logo.addEventListener('load', function () {
          window.setTimeout(check, 200);
        });
      }
    } catch (err) { /* ignore */ }
  }

  function pokeUpdate(registration) {
    if (!registration || !registration.update) return;
    registration.update().catch(function () {});
  }

  function registerWhenIdle() {
    maybeRecoverBrokenStyles();

    navigator.serviceWorker.register(swUrl).then(function (registration) {
      // Check often while the tab stays open . offline should track deploys.
      try {
        window.setInterval(function () {
          pokeUpdate(registration);
        }, 5 * 60 * 1000);
      } catch (err) { /* ignore */ }

      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') pokeUpdate(registration);
      });

      window.addEventListener('online', function () {
        pokeUpdate(registration);
      });

      // Immediate check after register (covers soft loads after a deploy).
      pokeUpdate(registration);
    }).catch(function (err) {
      if (window.console && console.warn) console.warn('SW registration failed:', err);
    });

  }

  // Service-worker registration is deliberately outside the critical render
  // path. The document, navigation, and content must be usable even if the
  // worker or its precache is slow to install.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      var schedule = window.requestIdleCallback || function (cb) { window.setTimeout(cb, 1200); };
      schedule(registerWhenIdle, { timeout: 2000 });
    }, { once: true });
  } else {
    var scheduleNow = window.requestIdleCallback || function (cb) { window.setTimeout(cb, 1200); };
    scheduleNow(registerWhenIdle, { timeout: 2000 });
  }
})();
