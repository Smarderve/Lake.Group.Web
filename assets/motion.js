/*
 * Lake Group — shared motion & micro-interaction layer.
 * Pairs with assets/theme.css. Loaded deferred after site.js on every page.
 *
 * - Auto-tags meaningful content with .reveal (+ stagger) so every page
 *   participates in the scroll-reveal system without hand-editing markup.
 * - Nav: hide on scroll down / show on scroll up, blur+shadow once scrolled.
 * - Cards: subtle 3D tilt tracking the cursor (pointer: fine only, max ~3deg).
 * - Everything respects prefers-reduced-motion and uses transform/opacity only.
 */
(function () {
  'use strict';

  var reducedMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Marker class gating all reveal-hiding CSS (theme.css). Added only when
     JS is actually running so that a script failure can never leave content
     stuck invisible. Skipped entirely under reduced motion. */
  if (!reducedMotion) {
    document.documentElement.classList.add('lg-motion');
  }

  /* Zones owned by other systems (3D experience, cinematic embeds, chrome)
     that the auto-tagger and tilt must never touch. */
  var SKIP_ZONES = '#fuel-experience, .experience-3d, .our-story-embed, .ose-stage, ' +
    '.hero, .page-hero, .site-nav, .nav-mobile, #lightbox, #chat-widget, .site-footer';

  function inSkipZone(el) {
    return !!el.closest(SKIP_ZONES);
  }

  /* ------------------------------------------------------------------ */
  /* Scroll-reveal auto-tagger                                           */
  /* ------------------------------------------------------------------ */

  var GRID_SELECTOR = '.grid-2, .grid-3, .grid-4, .divisions-grid, .stats-grid, ' +
    '.photo-feature, .gallery-masonry, .footer-grid';

  function tagGridChildren(grid) {
    var children = grid.children;
    for (var i = 0; i < children.length; i++) {
      var child = children[i];
      if (child.classList.contains('reveal')) continue;
      child.classList.add('reveal', 'reveal-scale');
      // Stagger within the grid row; cap so long grids don't feel sluggish.
      child.style.setProperty('--reveal-delay', (Math.min(i % 8, 5) * 0.07) + 's');
    }
    grid.setAttribute('data-reveal-tagged', '1');
  }

  function autoTagReveals() {
    // 1. Grids of cards/stats anywhere in the page body.
    document.querySelectorAll(GRID_SELECTOR).forEach(function (grid) {
      if (grid.hasAttribute('data-reveal-tagged') || inSkipZone(grid)) return;
      if (grid.classList.contains('footer-grid')) return; // chrome, keep static
      tagGridChildren(grid);
    });

    // 2. Direct children of section containers (headings, intro rows, CTAs...).
    document.querySelectorAll('.section > .container, .section-sm > .container, ' +
      '.stats-band > .container, .cta-band > .container').forEach(function (container) {
      if (inSkipZone(container)) return;
      var idx = 0;
      Array.prototype.forEach.call(container.children, function (child) {
        if (child.matches('style, script, noscript')) return;
        if (child.classList.contains('reveal') || child.hasAttribute('data-reveal-tagged')) return;
        // Grids were handled above (children tagged individually).
        if (child.matches(GRID_SELECTOR)) return;
        child.classList.add('reveal');
        child.style.setProperty('--reveal-delay', (Math.min(idx, 4) * 0.08) + 's');
        idx++;
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Nav: hide on scroll down, show on scroll up, elevate once scrolled  */
  /* ------------------------------------------------------------------ */

  function initNavScroll() {
    var nav = document.querySelector('.site-nav');
    if (!nav) return;

    var lastY = window.scrollY || 0;
    var ticking = false;

    function update() {
      ticking = false;
      var y = window.scrollY || 0;
      var mobileOpen = document.querySelector('.nav-mobile.open');

      nav.classList.toggle('nav-scrolled', y > 24);

      if (reducedMotion || mobileOpen) {
        nav.classList.remove('nav-hidden');
        lastY = y;
        return;
      }

      var delta = y - lastY;
      if (y < 120) {
        nav.classList.remove('nav-hidden');
      } else if (delta > 6) {
        nav.classList.add('nav-hidden');
      } else if (delta < -6) {
        nav.classList.remove('nav-hidden');
      }
      lastY = y;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }, { passive: true });
    update();
  }

  /* ------------------------------------------------------------------ */
  /* Card tilt: subtle 3D tracking, desktop pointers only                */
  /* ------------------------------------------------------------------ */

  var MAX_TILT = 3; // degrees

  function initCardTilt() {
    if (reducedMotion) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;

    document.querySelectorAll('.card, .div-card').forEach(function (card) {
      if (inSkipZone(card)) return;

      card.addEventListener('pointerenter', function (e) {
        if (e.pointerType !== 'mouse') return;
        card.classList.add('is-tilting');
      });

      card.addEventListener('pointermove', function (e) {
        if (e.pointerType !== 'mouse') return;
        var rect = card.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        var px = (e.clientX - rect.left) / rect.width - 0.5;
        var py = (e.clientY - rect.top) / rect.height - 0.5;
        card.style.setProperty('--tilt-y', (px * MAX_TILT * 2).toFixed(2) + 'deg');
        card.style.setProperty('--tilt-x', (-py * MAX_TILT * 2).toFixed(2) + 'deg');
      });

      card.addEventListener('pointerleave', function () {
        card.classList.remove('is-tilting');
        card.style.setProperty('--tilt-x', '0deg');
        card.style.setProperty('--tilt-y', '0deg');
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Boot                                                                */
  /* ------------------------------------------------------------------ */

  function init() {
    if (!reducedMotion) {
      // If site.js's reveal observer isn't available for any reason, drop the
      // gating class so nothing stays hidden.
      if (window.LakeSite && typeof window.LakeSite.initReveal === 'function') {
        autoTagReveals();
        // site.js runs its own initReveal at DOMContentLoaded before this
        // handler; re-run it so newly tagged elements get observed.
        window.LakeSite.initReveal();
      } else {
        document.documentElement.classList.remove('lg-motion');
      }
    }
    initNavScroll();
    initCardTilt();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
