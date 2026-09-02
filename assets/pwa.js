/*
 * Lake Group PWA bootstrap: registers the service worker without any
 * user-facing update prompt. Loaded with `defer` on every page. Safe to
 * include anywhere . bails out silently when service workers are not
 * supported (file://, old browsers).
 *
 * v78: network-first document lifecycle with an unobtrusive degraded-network
 * notice. No update path reloads the current document.
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
    u.searchParams.set('v', '80-20260902-01');
    swUrl = u.href;
  } catch (err2) {
    swUrl = swUrl + (swUrl.indexOf('?') === -1 ? '?v=80-20260902-01' : '&v=80-20260902-01');
  }

  var RECOVERY_KEY = 'lake-sw-recovery-v78';
  var networkNotice;
  var healthyTimer;

  function showNetworkNotice(message, persistent) {
    if (!networkNotice) {
      networkNotice = document.createElement('div');
      networkNotice.id = 'lake-network-status';
      networkNotice.setAttribute('role', 'status');
      networkNotice.setAttribute('aria-live', 'polite');
      networkNotice.style.cssText = 'position:fixed;top:var(--navbar-height,68px);left:0;right:0;z-index:10001;display:none;padding:8px 18px;background:#013c5c;color:#fff;text-align:center;font:600 12px/1.35 Jost,Arial,sans-serif;letter-spacing:.01em;box-shadow:0 2px 10px rgba(0,0,0,.14);pointer-events:none';
      document.body.appendChild(networkNotice);
    }
    window.clearTimeout(healthyTimer);
    networkNotice.textContent = message;
    networkNotice.style.display = 'block';
    if (!persistent) {
      healthyTimer = window.setTimeout(function () {
        if (networkNotice) networkNotice.style.display = 'none';
      }, 3600);
    }
  }

  function showOfflineState() {
    showNetworkNotice(
      navigator.onLine
        ? 'Connection is unstable. Showing the latest available version while we reconnect.'
        : 'You’re offline. Showing the latest available version until your connection returns.',
      true
    );
  }

  function installNetworkNotice() {
    window.addEventListener('offline', showOfflineState);
    window.addEventListener('online', function () {
      showNetworkNotice('You’re back online. Content is up to date.', false);
    });
    if (!navigator.onLine) showOfflineState();
    navigator.serviceWorker.addEventListener('message', function (event) {
      if (!event.data) return;
      if (event.data.type === 'LAKE_NETWORK_FALLBACK') showOfflineState();
      if (event.data.type === 'LAKE_NETWORK_HEALTHY' && networkNotice && networkNotice.style.display !== 'none' && navigator.onLine) {
        showNetworkNotice('You’re back online. Content is up to date.', false);
      }
    });
  }

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
    installNetworkNotice();

    navigator.serviceWorker.register(swUrl).then(function (registration) {
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
