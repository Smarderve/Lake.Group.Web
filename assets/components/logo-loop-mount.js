/**
 * Static-site adapter for LogoLoop (assets/components/LogoLoop.jsx).
 * The marketing site is plain HTML with no React bundler, so this mount
 * reproduces LogoLoop's DOM and CSS variables with a compositor animation using
 * LogoLoop.css. Keep behavior aligned with LogoLoop.jsx when updating.
 */
(function () {
  'use strict';

  var ANIMATION_CONFIG = { COPIES: 2, DURATION_SECONDS: 36 };

  /* Path-verified PNGs under assets/images/logos/companies/ + real nav routes only */
    var SUBSIDIARY_LOGOS = [
    { src: 'assets/images/logos/companies/lake-oil-blue.png?v=70', alt: 'Lake Oil', title: 'Lake Oil', href: 'lake-oil.html' },
    { src: 'assets/images/logos/companies/lake-gas-blue.png?v=70', alt: 'Lake Gas', title: 'Lake Gas', href: 'lake-gas.html' },
    { src: 'assets/images/logos/companies/lake-lubes-blue.png?v=70', alt: 'Lake Lubes', title: 'Lake Lubes', href: 'lake-lubes.html' },
    { src: 'assets/images/logos/companies/lake-steel-blue.png?v=70', alt: 'Lake Steel', title: 'Lake Steel', href: 'lake-steel.html' },
    { src: 'assets/images/logos/companies/lake-trans-blue.png?v=70', alt: 'Lake Trans', title: 'Lake Trans', href: 'lake-trans.html' },
    { src: 'assets/images/logos/companies/lake-aviation-blue.png?v=70', alt: 'Lake Aviation', title: 'Lake Aviation', href: 'lake-aviation.html' },
    { src: 'assets/images/logos/companies/lake-buildings-blue.png?v=70', alt: 'Lake Buildings', title: 'Lake Buildings', href: 'lake-buildings.html' },
    { src: 'assets/images/logos/companies/lake-pipes-scrolling.webp?v=1', alt: 'Lake Pipes', title: 'Lake Pipes', href: 'lake-pipes.html', scale: 0.85 },
    { src: 'assets/images/logos/companies/lake-premix-cement-blue.png?v=70', alt: 'Lake Premix & Cement', title: 'Lake Premix & Cement', href: 'lake-premix-cement.html' },
    { src: 'assets/images/logos/companies/lake-cylinders-blue.png?v=70', alt: 'Lake Cylinders', title: 'Lake Cylinders', href: 'lake-cylinders.html' },
    /* Marquee-only approved lockup: white wordmark with the authentic swoosh. */
    { src: 'assets/images/logos/companies/gulf-aggregates-blue.png?v=71', alt: 'Gulf Aggregates', title: 'Gulf Aggregates', href: 'gulf-aggregates.html' },
    { src: 'assets/images/logos/companies/aficd.png?v=69', alt: 'AFICD', title: 'AFICD', href: 'aficd.html' },
    { src: 'assets/images/logos/companies/aill.png?v=58', alt: 'AILL', title: 'AILL', href: 'aill.html' },
    /* Tight-crop marks read larger than padded Lake logos at the same CSS height */
    { src: 'assets/images/logos/companies/assembly-tech-limited-logo.webp?v=1', alt: 'ATL', title: 'ATL', href: 'assembly-tech.html', scale: 0.85 },
    { src: 'assets/images/logos/companies/lake-agro-blue.png?v=70', alt: 'Lake Agro', title: 'Lake Agro', href: 'lake-agro.html', scale: 0.8 },
    { src: 'assets/images/logos/companies/agrinova-tech.png?v=1', alt: 'Agrinova Tech Limited', title: 'Agrinova Tech Limited', href: 'agrinova-tech.html', scale: 0.78, className: 'logoloop__item--agrinova' },
    { src: 'assets/images/logos/companies/cross-country.png?v=69', alt: 'Cross Country', title: 'Cross Country', href: 'cross-country.html', scale: 1.15 },

  ];

  var DEFAULTS = {
    logos: SUBSIDIARY_LOGOS,
    speed: 40,
    direction: 'left',
    logoHeight: 44,
    gap: 52,
    logoHeightMobile: 34,
    gapMobile: 34,
    fadeOut: true,
    fadeOutColor: '#ffffff',
    scaleOnHover: true,
    ariaLabel: (window.LakeI18n && LakeI18n.t('logoloop.aria')) || 'Lake Group subsidiary companies',
    pauseOnHover: true
  };

  function isExternalHref(href) {
    return typeof href === 'string' && /^(https?:)?\/\//i.test(href);
  }

  function isMobileViewport() {
    return window.matchMedia('(max-width: 720px)').matches;
  }

  function hideFailedLogoItem(img) {
    var item = img.closest ? img.closest('.logoloop__item') : null;
    if (item) item.style.setProperty('display', 'none');
  }

  function createLogoItem(item, eager) {
    var li = document.createElement('li');
    li.className = 'logoloop__item';
    if (item.className) li.classList.add(item.className);
    li.setAttribute('role', 'listitem');
    if (item.scale != null && item.scale > 0 && item.scale !== 1) {
      li.classList.add('logoloop__item--scaled');
      li.style.setProperty('--logoloop-item-scale', String(item.scale));
    }

    var img = document.createElement('img');
    img.src = item.src;
    img.alt = item.alt || '';
    if (item.title) img.title = item.title;
    img.loading = eager ? 'eager' : 'lazy';
    img.decoding = 'async';
    img.draggable = false;
    img.addEventListener('error', function () {
      hideFailedLogoItem(img);
    });

    if (item.href) {
      var link = document.createElement('a');
      link.className = 'logoloop__link';
      link.href = item.href;
      link.setAttribute('aria-label', item.alt || item.title || 'logo link');
      if (isExternalHref(item.href)) {
        link.target = '_blank';
        link.rel = 'noreferrer noopener';
      }
      link.appendChild(img);
      li.appendChild(link);
    } else {
      li.appendChild(img);
    }

    return li;
  }

  function createSequence(logos, copyIndex) {
    var ul = document.createElement('ul');
    ul.className = 'logoloop__list';
    ul.setAttribute('role', 'list');
    if (copyIndex > 0) ul.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < logos.length; i++) {
      /* The first, accessible sequence is above the fold and only ~294 KB.
         Load it eagerly so CSS-transformed movement never reveals an
         unloaded transparent slot; duplicate sequences stay lazy. */
      ul.appendChild(createLogoItem(logos[i], copyIndex === 0));
    }
    return ul;
  }

  function onImagesReady(sequence, callback) {
    var images = sequence ? sequence.querySelectorAll('img') : [];
    var remaining = images.length;
    if (!remaining) {
      requestAnimationFrame(callback);
      return;
    }
    function done() {
      remaining -= 1;
      if (remaining === 0) callback();
    }
    images.forEach(function (image) {
      if (image.complete) done();
      else {
        image.addEventListener('load', done, { once: true });
        image.addEventListener('error', done, { once: true });
      }
    });
  }

  function resolveMetrics(opts) {
    var mobile = isMobileViewport();
    return {
      logoHeight: mobile
        ? (opts.logoHeightMobile != null ? opts.logoHeightMobile : 22)
        : (opts.logoHeight != null ? opts.logoHeight : 28),
      gap: mobile
        ? (opts.gapMobile != null ? opts.gapMobile : 24)
        : (opts.gap != null ? opts.gap : 36)
    };
  }

  function mountLogoLoop(root, options) {
    var opts = Object.assign({}, DEFAULTS, options || {});
    var logos = opts.logos || [];
    var speed = opts.speed;
    var direction = opts.direction || 'left';
    var fadeOut = opts.fadeOut;
    var fadeOutColor = opts.fadeOutColor;
    var scaleOnHover = opts.scaleOnHover;
    var ariaLabel = opts.ariaLabel;
    var pauseOnHover = opts.pauseOnHover !== false;
    var hoverSpeed = opts.hoverSpeed !== undefined ? opts.hoverSpeed : pauseOnHover ? 0 : undefined;

    var isVertical = direction === 'up' || direction === 'down';
    var magnitude = Math.abs(speed);
    var directionMultiplier = isVertical
      ? direction === 'up' ? 1 : -1
      : direction === 'left' ? 1 : -1;
    var speedMultiplier = speed < 0 ? -1 : 1;
    var targetVelocity = magnitude * directionMultiplier * speedMultiplier;

    root.innerHTML = '';

    var container = document.createElement('div');
    container.className = [
      'logoloop',
      isVertical ? 'logoloop--vertical' : 'logoloop--horizontal',
      fadeOut ? 'logoloop--fade' : '',
      scaleOnHover ? 'logoloop--scale-hover' : ''
    ].filter(Boolean).join(' ');
    container.setAttribute('role', 'region');
    container.setAttribute('aria-label', ariaLabel);
    container.style.width = '100%';
    if (fadeOutColor) container.style.setProperty('--logoloop-fadeColor', fadeOutColor);

    function applyMetrics() {
      var metrics = resolveMetrics(opts);
      container.style.setProperty('--logoloop-gap', metrics.gap + 'px');
      container.style.setProperty('--logoloop-logoHeight', metrics.logoHeight + 'px');
    }
    applyMetrics();

    var track = document.createElement('div');
    track.className = 'logoloop__track';

    var seqWidth = 0;
    var seqHeight = 0;
    var seqEl = null;
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function applyAnimation() {
      track.classList.remove('logoloop__track--animate');
      if (reduceMotion) return;
      var sequenceSize = isVertical ? seqHeight : seqWidth;
      if (!sequenceSize) return;
      /* CSS owns every animation frame. Dimensions are measured only at setup
         and resize, never in an animation loop. */
      var duration = opts.duration || ANIMATION_CONFIG.DURATION_SECONDS;
      track.style.setProperty('--logoloop-distance', sequenceSize + 'px');
      track.style.setProperty('--logoloop-duration', duration + 's');
      track.classList.add('logoloop__track--animate');
    }

    function rebuildCopies() {
      track.innerHTML = '';
      /* Exactly two matching sequences create the seamless transform loop.
         No extra clone calculation or runtime DOM rebuild is needed. */
      for (var i = 0; i < ANIMATION_CONFIG.COPIES; i++) {
        var list = createSequence(logos, i);
        if (i === 0) seqEl = list;
        track.appendChild(list);
      }
    }

    function updateDimensions() {
      if (!seqEl) return;
      var sequenceRect = seqEl.getBoundingClientRect();
      var sequenceWidth = sequenceRect.width || 0;
      var sequenceHeight = sequenceRect.height || 0;
      if (isVertical) {
        if (sequenceHeight > 0) seqHeight = Math.ceil(sequenceHeight);
      } else if (sequenceWidth > 0) {
        seqWidth = Math.ceil(sequenceWidth);
      }
      applyAnimation();
    }

    rebuildCopies();
    container.appendChild(track);
    root.appendChild(container);

    var resizeFrame = null;
    var mobileMq = window.matchMedia('(max-width: 720px)');
    function scheduleDimensionUpdate() {
      if (resizeFrame !== null) cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(function () {
        resizeFrame = null;
        updateDimensions();
      });
    }
    function onViewportChange() { applyMetrics(); scheduleDimensionUpdate(); }
    if (mobileMq.addEventListener) mobileMq.addEventListener('change', onViewportChange);
    else if (mobileMq.addListener) mobileMq.addListener(onViewportChange);

    window.addEventListener('resize', scheduleDimensionUpdate, { passive: true });
    updateDimensions();
    onImagesReady(seqEl, updateDimensions);

    return function destroy() {
      if (resizeFrame !== null) cancelAnimationFrame(resizeFrame);
      window.removeEventListener('resize', scheduleDimensionUpdate);
      if (mobileMq.removeEventListener) mobileMq.removeEventListener('change', onViewportChange);
      else if (mobileMq.removeListener) mobileMq.removeListener(onViewportChange);
      root.innerHTML = '';
    };
  }

  function init() {
    var root = document.getElementById('hero-logo-loop');
    if (!root) return;
    mountLogoLoop(root);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.LakeLogoLoop = { mount: mountLogoLoop, logos: SUBSIDIARY_LOGOS };

  document.addEventListener('lake-i18n-applied', function () {
    var label = (window.LakeI18n && LakeI18n.t('logoloop.aria')) || 'Lake Group subsidiary companies';
    document.querySelectorAll('.logoloop[aria-label]').forEach(function (el) {
      el.setAttribute('aria-label', label);
    });
  });
})();
