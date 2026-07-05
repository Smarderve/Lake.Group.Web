/*
 * Lake Group PWA bootstrap: registers the service worker and shows a
 * small branded toast when a new version is ready. Loaded with `defer`
 * on every page. Safe to include anywhere — bails out silently when
 * service workers aren't supported (file://, old browsers).
 */
(function () {
  'use strict';

  if (!('serviceWorker' in navigator)) return;

  // Resolve sw.js relative to this script's own URL so the site keeps
  // working when served from a subpath (pwa.js lives in assets/, sw.js
  // one level up at the site root).
  var scriptEl = document.currentScript;
  var swUrl = 'sw.js';
  try {
    swUrl = new URL('../sw.js', scriptEl && scriptEl.src ? scriptEl.src : location.href).href;
  } catch (err) { /* fall back to relative path */ }

  var reloadingAfterUpdate = false;

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
      'background:#0E1F5A',
      'color:#fff',
      'border:1px solid rgba(255,215,0,0.5)',
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
    text.textContent = 'A new version of this site is available.';

    var button = document.createElement('button');
    button.textContent = 'Refresh';
    button.style.cssText = [
      'background:#FFD700',
      'color:#0E1F5A',
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
      worker.postMessage({ type: 'SKIP_WAITING' });
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
      // "installed" + an existing controller means an update is waiting
      // (on first-ever install there is no controller — nothing to show).
      if (worker.state === 'installed' && navigator.serviceWorker.controller) {
        showUpdateToast(registration.waiting || worker);
      }
    });
  }

  window.addEventListener('load', function () {
    navigator.serviceWorker.register(swUrl).then(function (registration) {
      // An update may already be sitting in "waiting" (e.g. from a
      // previous visit where the user dismissed the toast).
      if (registration.waiting && navigator.serviceWorker.controller) {
        showUpdateToast(registration.waiting);
      }
      registration.addEventListener('updatefound', function () {
        if (registration.installing) watchWorker(registration.installing, registration);
      });
    }).catch(function (err) {
      // Registration failure (e.g. http on a non-localhost host) is
      // non-fatal: the site simply works without offline support.
      if (window.console && console.warn) console.warn('SW registration failed:', err);
    });

    // Reload once the new worker takes control — but only in response to
    // the user clicking "Refresh" (never auto-reload mid-browsing).
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (reloadingAfterUpdate) return;
      var toast = document.getElementById('lake-pwa-toast');
      if (!toast) return; // controller changed for some other reason
      reloadingAfterUpdate = true;
      location.reload();
    });
  });
})();
