/*
 * Lake Group PWA bootstrap: registers the service worker and shows a
 * small branded toast when a new version is ready. Loaded with `defer`
 * on every page. Safe to include anywhere . bails out silently when
 * service workers aren't supported (file://, old browsers).
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

  function showUpdateToast(worker) {
    if (document.getElementById('lake-pwa-toast')) return;

    var toast = document.createElement('div');
    toast.id = 'lake-pwa-toast';
    toast.setAttribute('role', 'status');
    toast.style.cssText = [
      'position:fixed',
      'left:16px',
      'bottom:16px',
      'z-index:99999',
      'display:flex',
      'align-items:center',
      'gap:14px',
      'background:#013F5C',
      'color:#fff',
      'border:1px solid rgba(255,242,0,0.5)',
      'border-radius:6px',
      'padding:12px 16px',
      "font-family:'Jost','Noto Sans Arabic','Noto Sans Devanagari',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      'font-size:0.85rem',
      'line-height:1.4',
      'box-shadow:0 8px 32px rgba(0,0,0,0.35)',
      'max-width:calc(100vw - 32px)',
      'opacity:0',
      'transform:translateY(8px)',
      'transition:opacity 0.25s ease,transform 0.25s ease',
    ].join(';');

    var text = document.createElement('span');
    text.textContent = 'A new site version is ready for your next visit.';

    var button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Dismiss';
    button.style.cssText = [
      'background:#FFF200',
      'color:#013F5C',
      'border:none',
      'border-radius:4px',
      'padding:7px 16px',
      'font-weight:700',
      'font-size:0.82rem',
      'font-family:inherit',
      'cursor:pointer',
      'white-space:nowrap',
    ].join(';');

    var close = document.createElement('button');
    close.type = 'button';
    close.setAttribute('aria-label', 'Dismiss');
    close.textContent = '\u00d7';
    close.style.cssText = [
      'background:none',
      'border:none',
      'color:rgba(255,255,255,0.6)',
      'font-size:1.15rem',
      'line-height:1',
      'cursor:pointer',
      'padding:2px 4px',
      'font-family:inherit',
    ].join(';');

    button.addEventListener('click', function () {
      // A refresh is user-initiated only. Never reload automatically when a
      // worker changes underneath an already-visible page.
      button.disabled = true;
      toast.remove();
    });
    close.addEventListener('click', function () {
      toast.remove();
    });

    toast.appendChild(text);
    toast.appendChild(button);
    toast.appendChild(close);
    document.body.appendChild(toast);
    requestAnimationFrame(function () {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });

  }

  function watchWorker(worker, registration) {
    worker.addEventListener('statechange', function () {
      if (worker.state === 'installed' && navigator.serviceWorker.controller) showUpdateToast(registration.waiting || worker);
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

    navigator.serviceWorker.register(swUrl).then(function (registration) {
      if (registration.waiting && navigator.serviceWorker.controller) showUpdateToast(registration.waiting);
      registration.addEventListener('updatefound', function () {
        if (registration.installing) watchWorker(registration.installing, registration);
      });

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
