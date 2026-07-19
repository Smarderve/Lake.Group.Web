/*
 * Lake Group  shared motion & micro-interaction layer.
 * Pairs with assets/theme.css. Loaded deferred after site.js on every page.
 *
 * - Auto-tags meaningful content with .reveal (+ stagger) so every page
 *   participates in the scroll-reveal system without hand-editing markup.
 * - Auto-enhances content images with .reveal-img + .img-hover-zoom.
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
    '.site-nav, .nav-mobile, #lightbox, #chat-widget, .site-footer';

  function inSkipZone(el) {
    return !!el.closest(SKIP_ZONES);
  }

  /* ------------------------------------------------------------------ */
  /* Scroll-reveal auto-tagger                                           */
  /* ------------------------------------------------------------------ */

  var GRID_SELECTOR = '.grid-2, .grid-3, .grid-4, .divisions-grid, .stats-grid, ' +
    '.photo-feature, .gallery-masonry, .footer-grid, .division-grid, .kpi-rail';

  var REVEAL_VARIANTS = ['', 'reveal-scale', 'reveal-left', 'reveal-right'];

  var ORPHAN_SELECTOR = '.timeline-item, .division-item, .sus-item, .country-cell, ' +
    '.kpi, .marquee-item, .hero-stat, blockquote';

  var IMG_SKIP = '.site-nav, .nav-mobile, .nav-megamenu, .nav-dropdown, .mm-company, ' +
    '.footer-logo, .site-footer, #chat-widget, .flag-icon, .flag-icon-lg';

  function tagGridChildren(grid) {
    var children = grid.children;
    for (var i = 0; i < children.length; i++) {
      var child = children[i];
      if (child.classList.contains('reveal')) continue;
      var variant = REVEAL_VARIANTS[i % REVEAL_VARIANTS.length];
      child.classList.add('reveal');
      if (variant) child.classList.add(variant);
      child.style.setProperty('--reveal-delay', (Math.min(i % 8, 5) * 0.05) + 's');
    }
    grid.setAttribute('data-reveal-tagged', '1');
  }

  function tagOrphans() {
    document.querySelectorAll(ORPHAN_SELECTOR).forEach(function (el, i) {
      if (inSkipZone(el) || el.classList.contains('reveal')) return;
      el.classList.add('reveal', i % 2 ? 'reveal-left' : 'reveal-scale');
      el.style.setProperty('--reveal-delay', (Math.min(i % 6, 3) * 0.05) + 's');
    });

    document.querySelectorAll(
      '.section ul > li, .section ol > li'
    ).forEach(function (li, i) {
      if (inSkipZone(li) || li.classList.contains('reveal')) return;
      if (li.closest('.site-footer, .nav-mobile, .nav-dropdown')) return;
      li.classList.add('reveal');
      li.style.setProperty('--reveal-delay', (Math.min(i % 6, 3) * 0.04) + 's');
    });
  }

  function enhanceImages() {
    document.querySelectorAll(
      'main img, .section img, .page-wrapper img, .hero-photo-grid img, ' +
      '.photo-feature img, .gallery-masonry img, .g-item img, .news-thumb img, ' +
      '.leader-photo img, .div-card-img, .photo-card img, .card img'
    ).forEach(function (img, i) {
      if (img.closest(IMG_SKIP)) return;
      if (inSkipZone(img) && !img.closest('.hero-photo-grid')) return;
      if (img.classList.contains('reveal-img')) return;

      img.classList.add('reveal-img', 'img-hover-zoom');
      if (!img.classList.contains('reveal')) {
        img.classList.add('reveal');
      }
      img.style.setProperty('--reveal-delay', (Math.min(i % 8, 4) * 0.05) + 's');

      /* Ensure parent clips hover zoom */
      var parent = img.parentElement;
      if (parent && !parent.classList.contains('hero-photo-grid')) {
        var style = window.getComputedStyle(parent);
        if (style.overflow === 'visible') {
          parent.style.overflow = 'hidden';
        }
      }
    });
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
      '.stats-band > .container, .cta-band > .container, ' +
      '.page-wrapper > section:not(.hero):not(.page-hero):not(.our-story-embed)').forEach(function (container) {
      if (inSkipZone(container)) return;
      var idx = 0;
      Array.prototype.forEach.call(container.children, function (child) {
        if (child.matches('style, script, noscript')) return;
        if (child.classList.contains('reveal') || child.hasAttribute('data-reveal-tagged')) return;
        if (child.matches(GRID_SELECTOR)) return;
        child.classList.add('reveal');
        if (idx % 3 === 1) child.classList.add('reveal-left');
        else if (idx % 3 === 2) child.classList.add('reveal-right');
        child.style.setProperty('--reveal-delay', (Math.min(idx, 5) * 0.05) + 's');
        idx++;
      });
    });

    // 3. Standalone rows/tiles outside grids.
    tagOrphans();

    // 4. All content images — reveal + hover zoom.
    enhanceImages();
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

    document.querySelectorAll('.card, .div-card, .leader-card, .prj-card, .g-item, .news-item').forEach(function (card) {
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
  /* Magnetic hover on primary CTAs (subtle)                              */
  /* ------------------------------------------------------------------ */

  var MAGNET_RANGE = 4;

  function initMagnetic() {
    if (reducedMotion) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;

    document.querySelectorAll('.btn, .btn-primary, .nav-cta, [data-magnetic]').forEach(function (el) {
      el.classList.add('fs-magnetic');

      el.addEventListener('pointermove', function (e) {
        if (e.pointerType !== 'mouse') return;
        var r = el.getBoundingClientRect();
        if (!r.width || !r.height) return;
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty('--mx', (px * MAGNET_RANGE * 2).toFixed(1) + 'px');
        el.style.setProperty('--my', (py * MAGNET_RANGE * 2).toFixed(1) + 'px');
      });

      el.addEventListener('pointerleave', function () {
        el.style.setProperty('--mx', '0px');
        el.style.setProperty('--my', '0px');
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Fallback reveal observer (when site.js is unavailable)              */
  /* ------------------------------------------------------------------ */

  function localInitReveal() {
    var targets = document.querySelectorAll('.reveal:not(.visible), .reveal-img:not(.visible)');
    if (!targets.length) return;

    function show(el) {
      el.classList.add('visible');
      if (el.classList.contains('reveal-img')) el.classList.add('in');
    }

    if (typeof IntersectionObserver === 'undefined') {
      targets.forEach(show);
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          show(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -4% 0px' });

    targets.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) show(el);
      else io.observe(el);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Boot                                                                */
  /* ------------------------------------------------------------------ */

  function init() {
    if (!reducedMotion) {
      autoTagReveals();
      if (window.LakeSite && typeof window.LakeSite.initReveal === 'function') {
        window.LakeSite.initReveal();
        /* site.js only watches .reveal — ensure reveal-img gets observed too */
        localInitReveal();
      } else {
        localInitReveal();
      }
      document.documentElement.classList.add('lg-ready');
    } else {
      document.documentElement.classList.remove('lg-motion');
    }
    initNavScroll();
    initCardTilt();
    initMagnetic();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
