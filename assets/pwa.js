/*
 * Lake Group PWA bootstrap: registers the service worker and shows a
 * small branded toast when a new version is ready. Loaded with `defer`
 * on every page. Safe to include anywhere — bails out silently when
 * service workers aren't supported (file://, old browsers).
 *
 * v59: bump SW registration query, check for updates often, auto-apply
 * waiting workers, and reload when a new SW activates so offline matches
 * the latest deploy without a manual hard refresh.
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
    u.searchParams.set('v', '59');
    swUrl = u.href;
  } catch (err2) {
    swUrl = swUrl + (swUrl.indexOf('?') === -1 ? '?v=59' : '&v=59');
  }

  var reloadingAfterUpdate = false;
  var expectingControllerChange = false;
  var RECOVERY_KEY = 'lake-sw-recovery-v59';

  function activateWaitingWorker(worker) {
    if (!worker) return;
    expectingControllerChange = true;
    worker.postMessage({ type: 'SKIP_WAITING' });
  }

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
      "font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      'font-size:0.85rem',
      'line-height:1.4',
      'box-shadow:0 8px 32px rgba(0,0,0,0.35)',
      'max-width:calc(100vw - 32px)',
      'opacity:0',
      'transform:translateY(8px)',
      'transition:opacity 0.25s ease,transform 0.25s ease',
    ].join(';');

    var text = document.createElement('span');
    text.textContent = 'Site updated — refreshing offline copy\u2026';

    var button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Refresh now';
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
      button.disabled = true;
      button.textContent = 'Updating\u2026';
      activateWaitingWorker(worker);
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

    // Auto-apply shortly after showing so offline stays current without a click.
    window.setTimeout(function () {
      activateWaitingWorker(worker);
    }, 1200);
  }

  function watchWorker(worker, registration) {
    worker.addEventListener('statechange', function () {
      if (worker.state === 'installed' && navigator.serviceWorker.controller) {
        activateWaitingWorker(registration.waiting || worker);
        showUpdateToast(registration.waiting || worker);
      }
    });
  }

  /**
   * Detect the classic "giant unstyled logo" failure: design tokens never
   * applied, so nav logo renders at intrinsic PNG size. Recover once by
   * clearing Lake caches, unregistering the SW, and hard-reloading.
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
          location.reload();
        }).catch(function () {
          location.reload();
        });
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

  window.addEventListener('load', function () {
    maybeRecoverBrokenStyles();

    navigator.serviceWorker.register(swUrl).then(function (registration) {
      if (registration.waiting && navigator.serviceWorker.controller) {
        activateWaitingWorker(registration.waiting);
        showUpdateToast(registration.waiting);
      }
      registration.addEventListener('updatefound', function () {
        if (registration.installing) watchWorker(registration.installing, registration);
      });

      // Check often while the tab stays open — offline should track deploys.
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

    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (reloadingAfterUpdate) return;
      var toast = document.getElementById('lake-pwa-toast');
      if (!expectingControllerChange && !toast) return;
      reloadingAfterUpdate = true;
      location.reload();
    });

    navigator.serviceWorker.addEventListener('message', function (event) {
      if (!event.data || event.data.type !== 'SW_ACTIVATED') return;
      if (reloadingAfterUpdate) return;
      // Only reload when we asked for an update — not on first-ever install.
      if (!expectingControllerChange) return;
      reloadingAfterUpdate = true;
      location.reload();
    });
  });
})();
