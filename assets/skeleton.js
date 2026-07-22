/* Lake Group — sitewide skeleton loader (pair with assets/skeleton.css) */
(function () {
  'use strict';

  if (window.__lgSkelInit) return;
  window.__lgSkelInit = true;

  var html = document.documentElement;
  if (html.classList.contains('lg-skel-done')) return;

  html.classList.add('lg-loading');

  var MAX_MS = 8000;
  var FADE_MS = 380;
  var hidden = false;

  function isHome() {
    var path = (location.pathname || '').replace(/\\/g, '/');
    return /(?:^|\/)(index\.html)?$/.test(path) || path === '/' || path.endsWith('/lake.group.web/');
  }

  function footCol() {
    return (
      '<div class="lg-skel-foot-col">' +
      '<div class="lg-skel-foot-line lg-skel-shimmer"></div>' +
      '<div class="lg-skel-foot-line sm lg-skel-shimmer"></div>' +
      '<div class="lg-skel-foot-line sm lg-skel-shimmer"></div>' +
      '</div>'
    );
  }

  function mount() {
    if (document.getElementById('lg-skel')) return;
    var host = document.body;
    if (!host) return;

    var el = document.createElement('div');
    el.id = 'lg-skel';
    el.setAttribute('aria-hidden', 'true');
    if (isHome()) el.setAttribute('data-layout', 'home');

    var cards = isHome()
      ? '<div class="lg-skel-card lg-skel-shimmer"></div>'.repeat(4)
      : '<div class="lg-skel-card lg-skel-shimmer"></div>'.repeat(3);

    el.innerHTML =
      '<div class="lg-skel-nav">' +
      '<div class="lg-skel-logo lg-skel-shimmer"></div>' +
      '<div class="lg-skel-nav-links">' +
      '<div class="lg-skel-pill lg-skel-shimmer"></div>' +
      '<div class="lg-skel-pill lg-skel-shimmer"></div>' +
      '<div class="lg-skel-pill lg-skel-shimmer"></div>' +
      '<div class="lg-skel-pill lg-skel-shimmer"></div>' +
      '<div class="lg-skel-pill lg-skel-shimmer"></div>' +
      '</div></div>' +
      '<div class="lg-skel-main">' +
      '<div class="lg-skel-hero">' +
      '<div class="lg-skel-line lg-skel-eyebrow lg-skel-shimmer"></div>' +
      '<div class="lg-skel-line lg-skel-title lg-skel-shimmer"></div>' +
      '<div class="lg-skel-line lg-skel-title-sm lg-skel-shimmer"></div>' +
      '<div class="lg-skel-line lg-skel-lede lg-skel-shimmer"></div>' +
      '<div class="lg-skel-cta">' +
      '<div class="lg-skel-btn lg-skel-shimmer"></div>' +
      '<div class="lg-skel-btn-ghost lg-skel-shimmer"></div>' +
      '</div></div>' +
      '<div class="lg-skel-blocks">' +
      cards +
      '</div></div>' +
      '<div class="lg-skel-footer">' +
      '<div class="lg-skel-foot-col">' +
      '<div class="lg-skel-foot-logo lg-skel-shimmer"></div>' +
      '<div class="lg-skel-foot-line lg-skel-shimmer"></div>' +
      '<div class="lg-skel-foot-line sm lg-skel-shimmer"></div>' +
      '</div>' +
      footCol() +
      footCol() +
      footCol() +
      '</div>';

    host.insertBefore(el, host.firstChild);
  }

  function hide() {
    if (hidden) return;
    hidden = true;
    html.classList.remove('lg-loading');
    html.classList.add('lg-skel-done');
    var el = document.getElementById('lg-skel');
    if (!el) return;
    el.classList.add('lg-skel-hide');
    window.setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, FADE_MS);
  }

  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount);

  if (document.readyState === 'complete') {
    window.requestAnimationFrame(hide);
  } else {
    window.addEventListener('load', hide);
  }

  window.setTimeout(hide, MAX_MS);
})();
