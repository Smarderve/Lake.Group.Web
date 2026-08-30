/* Lake Group local media placeholders.
 * Static HTML is intentionally never gated: only media that is still pending
 * after a short threshold receives a decorative, same-size placeholder. */
(function () {
  'use strict';

  if (window.__lgSkelInit) return;
  window.__lgSkelInit = true;

  var DELAY_MS = 150;
  var EXCLUDED = '.site-nav, .nav-mobile, .site-footer, footer, .logoloop, [data-lg-skeleton-ignore]';
  var viewportObserver = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      viewportObserver.unobserve(entry.target);
      entry.target.__lgSkeletonObserved = false;
      if (entry.target.tagName === 'IMG') waitForImage(entry.target);
      else waitForBackground(entry.target);
    });
  }, { rootMargin: '300px 0px' }) : null;

  function isEligible(element) {
    if (!(element && element.nodeType === 1) || element.closest(EXCLUDED)) return false;
    /* Inactive carousel slides are intentionally deferred until selected. */
    if (element.closest('.hero-slide:not(.is-active)')) return false;
    var node = element;
    while (node && node.nodeType === 1) {
      var style = window.getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      node = node.parentElement;
    }
    return true;
  }

  function settle(element) {
    if (!element) return;
    if (element.__lgSkeletonTimer) window.clearTimeout(element.__lgSkeletonTimer);
    element.__lgSkeletonTimer = null;
    element.classList.remove('lg-media-pending', 'lg-media-background-pending');
    element.removeAttribute('aria-busy');
  }

  function show(element, background) {
    if (!isEligible(element) || element.__lgSkeletonReady) return;
    element.classList.add('lg-media-pending');
    if (background) element.classList.add('lg-media-background-pending');
    element.setAttribute('aria-busy', 'true');
  }

  function deferUntilNearViewport(element) {
    if (!viewportObserver) return false;
    var rect = element.getBoundingClientRect();
    var near = rect.bottom > -300 && rect.top < window.innerHeight + 300 && rect.right > -100 && rect.left < window.innerWidth + 100;
    if (near) return false;
    if (!element.__lgSkeletonObserved) {
      element.__lgSkeletonObserved = true;
      viewportObserver.observe(element);
    }
    return true;
  }

  function waitForImage(image) {
    if (!isEligible(image) || image.__lgSkeletonTracked) return;
    if (deferUntilNearViewport(image)) return;
    image.__lgSkeletonTracked = true;
    if (image.complete && image.naturalWidth > 0) {
      image.__lgSkeletonReady = true;
      return;
    }
    image.__lgSkeletonTimer = window.setTimeout(function () {
      if (!(image.complete && image.naturalWidth > 0)) show(image, false);
    }, DELAY_MS);
    function finish() {
      image.__lgSkeletonReady = true;
      settle(image);
    }
    image.addEventListener('load', function () {
      if (typeof image.decode === 'function') image.decode().catch(function () {}).then(finish);
      else finish();
    }, { once: true });
    image.addEventListener('error', finish, { once: true });
  }

  function backgroundUrl(element) {
    var value = window.getComputedStyle(element).backgroundImage || '';
    var match = /url\(["']?(.+?)["']?\)/.exec(value);
    return match && match[1] ? match[1] : '';
  }

  function waitForBackground(element) {
    if (!isEligible(element) || element.__lgSkeletonTracked) return;
    if (deferUntilNearViewport(element)) return;
    var src = backgroundUrl(element);
    if (!src || src === 'none') return;
    element.__lgSkeletonTracked = true;
    var probe = new Image();
    var ready = false;
    function finish() {
      if (ready) return;
      ready = true;
      element.__lgSkeletonReady = true;
      settle(element);
    }
    element.__lgSkeletonTimer = window.setTimeout(function () {
      if (!ready) show(element, true);
    }, DELAY_MS);
    probe.onload = function () {
      if (typeof probe.decode === 'function') probe.decode().catch(function () {}).then(finish);
      else finish();
    };
    probe.onerror = finish;
    probe.src = src;
  }

  function scan(root) {
    if (!root || (root.nodeType !== 1 && root !== document)) return;
    if (root.matches && root.matches('img')) waitForImage(root);
    if (root.matches && root.matches('[style*="background-image"], [data-lg-skeleton-background]')) waitForBackground(root);
    var scope = root.querySelectorAll ? root : document;
    scope.querySelectorAll('img').forEach(waitForImage);
    scope.querySelectorAll('[style*="background-image"], [data-lg-skeleton-background]').forEach(waitForBackground);
  }

  function start() {
    scan(document);
    new MutationObserver(function (records) {
      records.forEach(function (record) {
        if (record.type === 'attributes') {
          var element = record.target;
          element.__lgSkeletonTracked = false;
          element.__lgSkeletonReady = false;
          settle(element);
          if (element.tagName === 'IMG') waitForImage(element);
          else waitForBackground(element);
          return;
        }
        record.addedNodes.forEach(function (node) {
          if (node.nodeType === 1) scan(node);
        });
      });
    }).observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src', 'srcset', 'style']
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
