/*
 * Lake Group  FLAGSHIP motion engine (flagship-motion.js)
 * Pairs with assets/flagship.css. Loaded deferred, last in the script chain,
 * on every migrated page (replaces assets/motion.js there).
 *
 * Responsibilities:
 *  - Gate: adds html.fs-motion only when JS runs and reduced motion is off,
 *    so reveal-hiding CSS can never strand content invisible.
 *  - Auto-tagger: assigns varied entrance choreography (.fx-rise/.fx-clip/
 *    .fx-mask/.fx-wipe + stagger) to untagged content so migrated pages get
 *    the full motion language without hand-tagging every node. Hand-placed
 *    .fx classes are always respected.
 *  - IntersectionObserver reveal (adds .in, unobserves).
 *  - Scroll progress: elements with [data-fx-scroll] get a --fxp custom
 *    property (0 → 1 across their viewport journey) for parallax/emphasis.
 *  - Nav: hide on scroll down / show on scroll up, elevation once scrolled.
 *  - Counters: [data-fs-count] ease from 0 with expo-out (also honours
 *    legacy [data-count] if site.js hasn't claimed it).
 *  - Magnetic hover on primary CTAs (subtle, pointer:fine only).
 *
 * Constraints: transform/opacity/clip-path only; all reads batched in rAF;
 * zero layout thrash; everything inert under prefers-reduced-motion.
 */
(function () {
  'use strict';

  var reducedMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!reducedMotion) {
    document.documentElement.classList.add('fs-motion');
  }

  /* Zones owned by other systems  never auto-tag or decorate. */
  var SKIP_ZONES = '#fuel-experience, .experience-3d, .our-story-embed, .ose-stage, ' +
    '.site-nav, .nav-mobile, #lightbox, #chat-widget, .page-hero';

  function inSkipZone(el) {
    return !!el.closest(SKIP_ZONES);
  }

  /* ------------------------------------------------------------------ */
  /* 1. Auto-tagger  varied choreography, not a wall of identical fades */
  /* ------------------------------------------------------------------ */

  var GRID_SELECTOR = '.grid-2, .grid-3, .grid-4, .fs-stat-rail, .stats-grid, ' +
    '.divisions-grid, .division-grid, .gallery-masonry, .photo-feature, ' +
    '.kpi-rail, .story-stats, .sus-stats, .country-grid, .footer-grid';

  var GRID_VARIANTS = ['fx-rise', 'fx-scale', 'fx-left', 'fx-right'];

  var ORPHAN_SELECTOR = '.timeline-item, .division-item, .sus-item, .ev-row, ' +
    '.country-cell, .kpi, .ld-panel, .side-ink, .side-gold, .fs-marker, ' +
    '.alert-info, .alert, blockquote, .fs-serif-quote, .cta-band > .container > *';

  function hasFx(el) {
    return el.classList.contains('fx') || el.classList.contains('reveal');
  }

  function tag(el, variant, delay) {
    if (hasFx(el)) return;
    el.classList.add('fx', variant);
    if (delay != null) el.style.setProperty('--fx-d', delay.toFixed(2) + 's');
  }

  function chooseVariant(el) {
    if (el.matches('.fs-media, .photo-card, figure, .news-thumb, .leader-photo')) return 'fx-clip';
    if (el.matches('.fs-display, .section-title, h2, .fs-hero-title')) return 'fx-mask';
    if (el.matches('.fs-rule, .divider-yellow, hr, .section-label, .fs-eyebrow')) return 'fx-wipe';
    if (el.matches('.fs-stat, .stat-number, .hero-stat-num, .kpi-no')) return 'fx-rise';
    if (el.matches('img')) return 'fx-img';
    if (el.matches('ul, ol')) return 'fx-rise';
    return 'fx-rise';
  }

  var IMG_SKIP = '.site-nav, .nav-mobile, .nav-megamenu, .nav-dropdown, .mm-company, ' +
    '.footer-logo, .site-footer, #chat-widget, .flag-icon, .flag-icon-lg';

  function enhanceImages() {
    /* Media containers: clip-reveal (home hero photo-grid feel) */
    document.querySelectorAll(
      '.fs-media, .photo-card, .leader-photo, .news-thumb, .g-item, figure.photo-feature'
    ).forEach(function (media, i) {
      if (inSkipZone(media) || hasFx(media)) return;
      tag(media, 'fx-clip', Math.min(i % 6, 3) * 0.05);
    });

    /* Bare content images: scale-settle + hover zoom */
    document.querySelectorAll(
      'main img, .section img, .fs-section img, .page-wrapper img, ' +
      '.photo-feature img, .gallery-masonry img, .g-item img, .news-thumb img, ' +
      '.leader-photo img, .fs-media img, .photo-card img, .card img, .div-card img'
    ).forEach(function (img, i) {
      if (img.closest(IMG_SKIP)) return;
      if (inSkipZone(img)) return;

      img.classList.add('img-hover-zoom');

      /* Parent already tagged with fx-clip - only hover zoom on the img */
      if (img.closest('.fx-clip, .fs-media, .photo-card, .leader-photo, .news-thumb, .g-item')) {
        return;
      }
      if (hasFx(img) || img.classList.contains('reveal-img')) return;

      img.classList.add('fx', 'fx-img', 'reveal-img');
      img.style.setProperty('--fx-d', (Math.min(i % 8, 4) * 0.05).toFixed(2) + 's');

      var parent = img.parentElement;
      if (parent) {
        try {
          var style = window.getComputedStyle(parent);
          if (style.overflow === 'visible') parent.style.overflow = 'hidden';
        } catch (err) { /* ignore */ }
      }
    });
  }

  function gridVariant(i) {
    return GRID_VARIANTS[i % GRID_VARIANTS.length];
  }

  function tagGridChildren(grid) {
    var children = grid.children;
    for (var i = 0; i < children.length; i++) {
      tag(children[i], gridVariant(i), Math.min(i % 8, 5) * 0.08);
    }
  }

  function autoTag() {
    /* Grids: staggered varied choreography per cell. */
    document.querySelectorAll(GRID_SELECTOR).forEach(function (grid) {
      if (grid.hasAttribute('data-fx-tagged') || inSkipZone(grid)) return;
      if (grid.classList.contains('footer-grid')) return; /* chrome stays static */
      tagGridChildren(grid);
      grid.setAttribute('data-fx-tagged', '1');
    });

    /* Section containers: choreograph direct children by content type. */
    document.querySelectorAll(
      '.fs-section > .container, .fs-section > .fs-container, ' +
      '.fs-section-sm > .container, .fs-section-sm > .fs-container, ' +
      '.section > .container, .section-sm > .container, ' +
      '.stats-band > .container, .cta-band > .container, ' +
      '.page-wrapper > section:not(.page-hero):not(.our-story-embed)'
    ).forEach(function (container) {
      if (inSkipZone(container) || container.hasAttribute('data-fx-tagged')) return;
      var idx = 0;
      Array.prototype.forEach.call(container.children, function (child) {
        if (child.matches('style, script, noscript')) return;
        if (child.matches(GRID_SELECTOR) || child.hasAttribute('data-fx-tagged')) return;
        if (hasFx(child)) return;
        tag(child, chooseVariant(child), Math.min(idx, 5) * 0.1);
        idx++;
      });
      container.setAttribute('data-fx-tagged', '1');
    });

    /* Orphan rows/tiles not inside a tagged grid. */
    document.querySelectorAll(ORPHAN_SELECTOR).forEach(function (el, i) {
      if (inSkipZone(el) || hasFx(el)) return;
      tag(el, 'fx-rise', Math.min(i % 6, 3) * 0.05);
    });

    /* List items inside editorial sections (stagger within list). */
    document.querySelectorAll(
      '.section ul > li, .section ol > li, .fs-section ul > li, .fs-section ol > li'
    ).forEach(function (li, i) {
      if (inSkipZone(li) || hasFx(li)) return;
      if (li.closest('.site-footer, .nav-mobile, .nav-dropdown')) return;
      tag(li, i % 2 ? 'fx-left' : 'fx-rise', Math.min(i % 6, 3) * 0.04);
    });

    /* All content images - clip / scale-settle + hover zoom. */
    enhanceImages();
  }

  /* ------------------------------------------------------------------ */
  /* 2. Reveal observer                                                  */
  /* ------------------------------------------------------------------ */

  function initReveal() {
    var targets = document.querySelectorAll(
      '.fx:not(.in), .reveal:not(.visible), .reveal-img:not(.in):not(.visible)'
    );
    if (!targets.length) return;

    var pending = [];

    function show(el) {
      el.classList.add('in');
      if (el.classList.contains('reveal') || el.classList.contains('reveal-img')) {
        el.classList.add('visible');
      }
      var i = pending.indexOf(el);
      if (i !== -1) pending.splice(i, 1);
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
    }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });

    targets.forEach(function (el) {
      /* Anything already in the viewport on load shows immediately. */
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) {
        show(el);
      } else {
        pending.push(el);
        io.observe(el);
      }
    });

    /* Safety net: IntersectionObserver only reports intersections that exist
       during a rendered frame, so an element jumped over in one large scroll
       (End key, scrollbar drag, anchor jump) can be missed and stay hidden
       forever. On scroll, reveal anything whose top has passed the viewport
       bottom  already-seen-or-passed content must never be invisible. */
    var sweeping = false;
    function sweep() {
      sweeping = false;
      var limit = window.innerHeight;
      for (var i = pending.length - 1; i >= 0; i--) {
        var el = pending[i];
        if (el.getBoundingClientRect().top < limit) {
          show(el); /* show() removes el from pending */
          io.unobserve(el);
        }
      }
      if (!pending.length) window.removeEventListener('scroll', onSweep);
    }
    function onSweep() {
      if (!sweeping) {
        sweeping = true;
        requestAnimationFrame(sweep);
      }
    }
    window.addEventListener('scroll', onSweep, { passive: true });
  }

  /* ------------------------------------------------------------------ */
  /* 3. Scroll-progress variable (--fxp) for [data-fx-scroll]            */
  /* ------------------------------------------------------------------ */

  function initScrollProgress() {
    if (reducedMotion) return;
    var targets = Array.prototype.slice.call(document.querySelectorAll('[data-fx-scroll]'));
    if (!targets.length) return;

    var ticking = false;

    function update() {
      ticking = false;
      var vh = window.innerHeight;
      targets.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom < -80 || r.top > vh + 80) return; /* off screen, skip write */
        var p = (vh - r.top) / (vh + r.height);
        p = Math.max(0, Math.min(1, p));
        el.style.setProperty('--fxp', p.toFixed(4));
      });
    }

    function onScroll() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
  }

  /* ------------------------------------------------------------------ */
  /* 4. Nav hide/show                                                    */
  /* ------------------------------------------------------------------ */

  function initNav() {
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
      if (y < 140) {
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
  /* 5. Counters  expo-out easing                                       */
  /* ------------------------------------------------------------------ */

  function animateCounter(el) {
    if (el.dataset.fsAnimated === '1') return;
    el.dataset.fsAnimated = '1';
    var target = parseInt(el.dataset.fsCount || el.dataset.count, 10);
    if (isNaN(target)) return;
    var suffix = el.dataset.suffix || '';
    var prefix = el.dataset.prefix || '';

    if (reducedMotion) {
      el.textContent = prefix + target.toLocaleString() + suffix;
      return;
    }

    var duration = 900;
    var start = performance.now();
    function step(now) {
      var p = Math.min((now - start) / duration, 1);
      var ease = p === 1 ? 1 : 1 - Math.pow(2, -10 * p); /* expo-out */
      el.textContent = prefix + Math.round(ease * target).toLocaleString() + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function initCounters() {
    var counters = document.querySelectorAll('[data-fs-count]');
    if (!counters.length) return;

    if (typeof IntersectionObserver === 'undefined') {
      counters.forEach(animateCounter);
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });

    counters.forEach(function (el) { io.observe(el); });

    /* Safety: never leave a counter stuck at its markup value. */
    setTimeout(function () {
      counters.forEach(function (el) {
        if (el.dataset.fsAnimated !== '1') animateCounter(el);
      });
    }, 4000);
  }

  /* ------------------------------------------------------------------ */
  /* 6. Magnetic hover on primary CTAs (subtle)                          */
  /* ------------------------------------------------------------------ */

  var MAGNET_RANGE = 4; /* px max displacement  a nudge, not a gimmick */

  /* ------------------------------------------------------------------ */
  /* 7. Card tilt  subtle 3D tracking (desktop pointers only)         */
  /* ------------------------------------------------------------------ */

  var MAX_TILT = 3;

  function initCardTilt() {
    if (reducedMotion) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;

    document.querySelectorAll(
      '.card, .fs-card, .div-card, .leader-card, .prj-card, .g-item, .news-item, .photo-card'
    ).forEach(function (card) {
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
  /* 8. Dynamic content  re-tag when lists are injected (news, etc.)  */
  /* ------------------------------------------------------------------ */

  var dynamicQueued = false;

  function refreshMotion() {
    if (reducedMotion) return;
    try {
      autoTag();
      initReveal();
    } catch (err) { /* initReveal is idempotent; swallow */ }
  }

  function queueRefresh() {
    if (dynamicQueued) return;
    dynamicQueued = true;
    requestAnimationFrame(function () {
      dynamicQueued = false;
      refreshMotion();
    });
  }

  function initDynamicObserver() {
    if (typeof MutationObserver === 'undefined') return;

    var watched = ['#news-list', '#chat-messages', '.gallery-masonry', '.news-layout'];
    watched.forEach(function (sel) {
      var node = document.querySelector(sel);
      if (!node) return;
      var mo = new MutationObserver(function (mutations) {
        for (var i = 0; i < mutations.length; i++) {
          if (mutations[i].addedNodes.length) {
            queueRefresh();
            break;
          }
        }
      });
      mo.observe(node, { childList: true, subtree: true });
    });
  }

  function hookLakeSite() {
    window.LakeSite = window.LakeSite || {};
    window.LakeSite.initReveal = initReveal;
    window.LakeSite.refreshMotion = refreshMotion;
  }

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
  /* Boot                                                                */
  /* ------------------------------------------------------------------ */

  function init() {
    hookLakeSite();
    if (!reducedMotion) {
      try {
        autoTag();
        initReveal();
        document.documentElement.classList.add('fs-ready');
      } catch (err) {
        /* Any failure: drop the gate so nothing stays hidden. */
        document.documentElement.classList.remove('fs-motion');
      }
    }
    initScrollProgress();
    initNav();
    initCounters();
    initCardTilt();
    initMagnetic();
    initDynamicObserver();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
