/**
 * Static-site adapter for LogoLoop (assets/components/LogoLoop.jsx).
 * The marketing site is plain HTML with no React bundler, so this mount
 * reproduces LogoLoop's DOM, CSS variables, and rAF scroll loop using
 * LogoLoop.css. Keep behavior aligned with LogoLoop.jsx when updating.
 */
(function () {
  'use strict';

  var ANIMATION_CONFIG = { SMOOTH_TAU: 0.25, MIN_COPIES: 2, COPY_HEADROOM: 2 };

  /* Path-verified PNGs under assets/images/logos/companies/ + real nav routes only */
    var SUBSIDIARY_LOGOS = [
    { src: 'assets/images/logos/companies/lake-oil.png', alt: 'Lake Oil', title: 'Lake Oil', href: 'lake-oil.html' },
    { src: 'assets/images/logos/companies/lake-gas.png', alt: 'Lake Gas', title: 'Lake Gas', href: 'lake-gas.html' },
    { src: 'assets/images/logos/companies/lake-lubes.png', alt: 'Lake Lubes', title: 'Lake Lubes', href: 'lake-lubes.html' },
    { src: 'assets/images/logos/companies/lake-steel.png', alt: 'Lake Steel', title: 'Lake Steel', href: 'lake-steel.html' },
    { src: 'assets/images/logos/companies/lake-trans.png', alt: 'Lake Trans', title: 'Lake Trans', href: 'lake-trans.html' },
    { src: 'assets/images/logos/companies/lake-aviation.png', alt: 'Lake Aviation', title: 'Lake Aviation', href: 'lake-aviation.html' },
    { src: 'assets/images/logos/companies/lake-buildings.png', alt: 'Lake Buildings', title: 'Lake Buildings', href: 'lake-buildings.html' },
    { src: 'assets/images/logos/companies/lake-plastics.png', alt: 'Lake Plastics', title: 'Lake Plastics', href: 'lake-plastics.html' },
    { src: 'assets/images/logos/companies/lake-premix-cement.png', alt: 'Lake Premix & Cement', title: 'Lake Premix & Cement', href: 'lake-premix-cement.html' },
    { src: 'assets/images/logos/companies/lake-cylinders.png?v=58', alt: 'Lake Cylinders', title: 'Lake Cylinders', href: 'lake-cylinders.html' },
    { src: 'assets/images/logos/companies/gulf-aggregates.png', alt: 'Gulf Aggregates', title: 'Gulf Aggregates', href: 'gulf-aggregates.html' },
    { src: 'assets/images/logos/companies/aficd.png?v=58', alt: 'AFICD', title: 'AFICD', href: 'aficd.html' },
    { src: 'assets/images/logos/companies/aill.png?v=58', alt: 'AILL', title: 'AILL', href: 'aill.html' },
    /* Tight-crop marks read larger than padded Lake logos at the same CSS height */
    /* Circles-only ATL mark (no tagline) — matches brand sheet */
    { src: 'assets/images/logos/companies/atl.png?v=53', alt: 'ATL', title: 'ATL', href: 'atl.html', scale: 0.9 },
    { src: 'assets/images/logos/companies/lake-agro.png?v=50', alt: 'Lake Agro', title: 'Lake Agro', href: 'lake-agro.html', scale: 0.8 },
    { src: 'assets/images/logos/companies/cross-country.png?v=50', alt: 'Cross Country', title: 'Cross Country', href: 'cross-country.html', scale: 0.85 },
    { src: 'assets/images/logos/companies/ocean-galleria.png?v=50', alt: 'Ocean Galleria', title: 'Ocean Galleria', href: 'ocean-galleria.html', scale: 0.85 }
  ];

  var DEFAULTS = {
    logos: SUBSIDIARY_LOGOS,
    speed: 40,
    direction: 'left',
    logoHeight: 28,
    gap: 36,
    logoHeightMobile: 22,
    gapMobile: 24,
    fadeOut: true,
    fadeOutColor: 'var(--color-brand-blue)',
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

  function createLogoItem(item) {
    var li = document.createElement('li');
    li.className = 'logoloop__item';
    li.setAttribute('role', 'listitem');
    if (item.scale != null && item.scale > 0 && item.scale !== 1) {
      li.classList.add('logoloop__item--scaled');
      li.style.setProperty('--logoloop-item-scale', String(item.scale));
    }

    var img = document.createElement('img');
    img.src = item.src;
    img.alt = item.alt || '';
    if (item.title) img.title = item.title;
    img.loading = 'lazy';
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
      ul.appendChild(createLogoItem(logos[i]));
    }
    return ul;
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

    var copyCount = ANIMATION_CONFIG.MIN_COPIES;
    var seqWidth = 0;
    var seqHeight = 0;
    var seqEl = null;
    var isHovered = false;
    var rafId = null;
    var lastTimestamp = null;
    var offset = 0;
    var velocity = 0;
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function rebuildCopies() {
      var prevTransform = track.style.transform;
      track.innerHTML = '';
      for (var i = 0; i < copyCount; i++) {
        var list = createSequence(logos, i);
        if (i === 0) seqEl = list;
        track.appendChild(list);
      }
      if (prevTransform) track.style.transform = prevTransform;
    }

    function updateDimensions() {
      if (!seqEl) return;
      var containerWidth = container.clientWidth || 0;
      var sequenceRect = seqEl.getBoundingClientRect();
      var sequenceWidth = sequenceRect.width || 0;
      var sequenceHeight = sequenceRect.height || 0;

      if (isVertical) {
        var parentHeight = container.parentElement ? container.parentElement.clientHeight : 0;
        if (parentHeight > 0) container.style.height = Math.ceil(parentHeight) + 'px';
        if (sequenceHeight > 0) {
          seqHeight = Math.ceil(sequenceHeight);
          var viewport = container.clientHeight || parentHeight || sequenceHeight;
          var copiesNeededV = Math.ceil(viewport / sequenceHeight) + ANIMATION_CONFIG.COPY_HEADROOM;
          var nextCountV = Math.max(ANIMATION_CONFIG.MIN_COPIES, copiesNeededV);
          if (nextCountV !== copyCount) {
            copyCount = nextCountV;
            rebuildCopies();
          }
        }
      } else if (sequenceWidth > 0) {
        seqWidth = Math.ceil(sequenceWidth);
        var copiesNeeded = Math.ceil(containerWidth / sequenceWidth) + ANIMATION_CONFIG.COPY_HEADROOM;
        var nextCount = Math.max(ANIMATION_CONFIG.MIN_COPIES, copiesNeeded);
        if (nextCount !== copyCount) {
          copyCount = nextCount;
          rebuildCopies();
        }
      }
    }

    function onImagesReady(callback) {
      var images = seqEl ? seqEl.querySelectorAll('img') : [];
      if (!images.length) {
        callback();
        return;
      }
      var remaining = images.length;
      var done = function () {
        remaining -= 1;
        if (remaining <= 0) callback();
      };
      for (var i = 0; i < images.length; i++) {
        if (images[i].complete) done();
        else {
          images[i].addEventListener('load', done, { once: true });
          images[i].addEventListener('error', done, { once: true });
        }
      }
    }

    function animate(timestamp) {
      if (lastTimestamp === null) lastTimestamp = timestamp;
      var deltaTime = Math.max(0, timestamp - lastTimestamp) / 1000;
      lastTimestamp = timestamp;

      var target = isHovered && hoverSpeed !== undefined ? hoverSpeed : targetVelocity;
      var easingFactor = 1 - Math.exp(-deltaTime / ANIMATION_CONFIG.SMOOTH_TAU);
      velocity += (target - velocity) * easingFactor;

      var seqSize = isVertical ? seqHeight : seqWidth;
      if (seqSize > 0 && !reduceMotion) {
        offset = ((offset + velocity * deltaTime) % seqSize + seqSize) % seqSize;
        track.style.transform = isVertical
          ? 'translate3d(0, ' + -offset + 'px, 0)'
          : 'translate3d(' + -offset + 'px, 0, 0)';
      }

      rafId = requestAnimationFrame(animate);
    }

    rebuildCopies();
    container.appendChild(track);
    root.appendChild(container);

    track.addEventListener('mouseenter', function () {
      if (hoverSpeed !== undefined) isHovered = true;
    });
    track.addEventListener('mouseleave', function () {
      if (hoverSpeed !== undefined) isHovered = false;
    });

    var resizeObserver = null;
    var mobileMq = window.matchMedia('(max-width: 720px)');
    function onViewportChange() {
      applyMetrics();
      updateDimensions();
    }
    if (mobileMq.addEventListener) mobileMq.addEventListener('change', onViewportChange);
    else if (mobileMq.addListener) mobileMq.addListener(onViewportChange);

    function observe() {
      if (window.ResizeObserver) {
        resizeObserver = new ResizeObserver(updateDimensions);
        resizeObserver.observe(container);
        if (seqEl) resizeObserver.observe(seqEl);
      } else {
        window.addEventListener('resize', updateDimensions);
      }
    }

    onImagesReady(function () {
      updateDimensions();
      observe();
      if (!reduceMotion) rafId = requestAnimationFrame(animate);
    });

    return function destroy() {
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (resizeObserver) resizeObserver.disconnect();
      else window.removeEventListener('resize', updateDimensions);
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
