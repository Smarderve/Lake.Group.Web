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
    { src: 'assets/images/logos/companies/lake-pipes-scrolling.webp?v=1', alt: 'Lake Pipes', title: 'Lake Pipes', href: 'lake-pipes.html', scale: 0.91, className: 'logoloop__item--lake-pipes' },
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
    var isLakePipes = item.className === 'logoloop__item--lake-pipes';
    img.src = item.src;
    img.alt = item.alt || '';
    if (item.title) img.title = item.title;
    img.loading = eager ? 'eager' : 'lazy';
    img.decoding = 'async';
    img.draggable = false;
    if (isLakePipes) img.classList.add('logoloop__pipes-main');
    img.addEventListener('error', function () {
      hideFailedLogoItem(img);
    });

    if (item.href) {
      var link = document.createElement('a');
      link.className = 'logoloop__link';
      link.href = item.href;
      link.setAttribute('aria-label', 'Visit ' + (item.alt || item.title || 'company'));
      if (isExternalHref(item.href)) {
        link.target = '_blank';
        link.rel = 'noreferrer noopener';
      }
      link.appendChild(img);
      if (isLakePipes) {
        /* Reuses the approved artwork: only the small PIPES lockup is
           optically enlarged, while the Lake wordmark stays at its approved
           marquee scale. */
        var secondary = document.createElement('span');
        secondary.className = 'logoloop__pipes-secondary';
        secondary.setAttribute('aria-hidden', 'true');
        var secondaryImage = document.createElement('img');
        secondaryImage.src = item.src;
        secondaryImage.alt = '';
        secondaryImage.decoding = 'async';
        secondaryImage.draggable = false;
        secondary.appendChild(secondaryImage);
        link.appendChild(secondary);
      }
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
    var position = 0;
    var velocity = 0;
    var animationFrame = null;
    var lastFrameTime = null;
    var viewportVisible = true;
    var documentVisible = !document.hidden;
    var pointerInside = false;
    var dragState = null;
    var manualTimer = null;
    var suppressClick = false;

    function sequenceSize() {
      return isVertical ? seqHeight : seqWidth;
    }

    function normalizePosition() {
      var size = sequenceSize();
      if (!size) return;
      /* Keep the transform inside the first/duplicate sequence pair. This
         wrap is visually identical, so a drag can cross either boundary
         without exposing a track end or jumping back to the beginning. */
      position = position % size;
      if (position > 0) position -= size;
    }

    function renderPosition() {
      if (isVertical) track.style.transform = 'translate3d(0,' + position + 'px,0)';
      else track.style.transform = 'translate3d(' + position + 'px,0,0)';
    }

    function shouldAutoScroll() {
      return !reduceMotion && viewportVisible && documentVisible && !!sequenceSize() && !pointerInside && !dragState && !manualTimer;
    }

    function syncAnimationState() {
      var active = shouldAutoScroll();
      track.style.willChange = active || dragState ? 'transform' : '';
      if (active && animationFrame === null) {
        lastFrameTime = null;
        animationFrame = requestAnimationFrame(step);
      }
    }

    function step(timestamp) {
      animationFrame = null;
      if (!shouldAutoScroll()) {
        lastFrameTime = null;
        syncAnimationState();
        return;
      }
      if (lastFrameTime !== null) {
        /* The duration remains the existing approved duration. Only this
           compositor transform updates per frame; no layout is read here. */
        position += velocity * Math.min((timestamp - lastFrameTime) / 1000, 0.05);
        normalizePosition();
        renderPosition();
      }
      lastFrameTime = timestamp;
      animationFrame = requestAnimationFrame(step);
    }

    function applyAnimation() {
      if (reduceMotion) {
        position = 0;
        renderPosition();
        syncAnimationState();
        return;
      }
      var size = sequenceSize();
      if (!size) return;
      var duration = opts.duration || ANIMATION_CONFIG.DURATION_SECONDS;
      velocity = (size / duration) * (direction === 'right' || direction === 'down' ? 1 : -1);
      normalizePosition();
      renderPosition();
      syncAnimationState();
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
      var previousSize = sequenceSize();
      var previousProgress = previousSize ? position / previousSize : 0;
      var sequenceRect = seqEl.getBoundingClientRect();
      var sequenceWidth = sequenceRect.width || 0;
      var sequenceHeight = sequenceRect.height || 0;
      if (isVertical) {
        if (sequenceHeight > 0) seqHeight = Math.ceil(sequenceHeight);
      } else if (sequenceWidth > 0) {
        seqWidth = Math.ceil(sequenceWidth);
      }
      if (previousSize && sequenceSize()) position = previousProgress * sequenceSize();
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
    var visibilityObserver = null;
    if ('IntersectionObserver' in window) {
      visibilityObserver = new IntersectionObserver(function (entries) {
        viewportVisible = !!(entries[0] && entries[0].isIntersecting);
        lastFrameTime = null;
        syncAnimationState();
      }, { threshold: 0 });
      visibilityObserver.observe(container);
    }
    updateDimensions();
    onImagesReady(seqEl, updateDimensions);

    function pauseForManualInput() {
      if (manualTimer !== null) {
        clearTimeout(manualTimer);
        manualTimer = null;
      }
      syncAnimationState();
    }

    function resumeAfterTouch() {
      if (manualTimer !== null) clearTimeout(manualTimer);
      /* A small pause preserves the natural end of a touch swipe without
         adding carousel-style inertia or a visible speed change. */
      manualTimer = setTimeout(function () {
        manualTimer = null;
        syncAnimationState();
      }, 180);
    }

    function applyManualDelta(delta) {
      if (!sequenceSize()) return;
      position += delta;
      normalizePosition();
      renderPosition();
    }

    function pointerIsInside(event) {
      var rect = container.getBoundingClientRect();
      return event.clientX >= rect.left && event.clientX <= rect.right &&
        event.clientY >= rect.top && event.clientY <= rect.bottom;
    }

    function onPointerEnter(event) {
      if (event.pointerType === 'touch') return;
      pointerInside = true;
      pauseForManualInput();
    }

    function onPointerLeave(event) {
      if (event.pointerType === 'touch' || dragState) return;
      pointerInside = false;
      syncAnimationState();
    }

    function onPointerDown(event) {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      pointerInside = event.pointerType !== 'touch';
      dragState = {
        id: event.pointerId,
        type: event.pointerType,
        startX: event.clientX,
        startY: event.clientY,
        lastX: event.clientX,
        lastY: event.clientY,
        horizontal: false,
        moved: false
      };
      container.classList.add('is-dragging');
      pauseForManualInput();
    }

    function onPointerMove(event) {
      if (!dragState || event.pointerId !== dragState.id) return;
      var dx = event.clientX - dragState.startX;
      var dy = event.clientY - dragState.startY;
      if (!dragState.horizontal) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
        dragState.horizontal = isVertical ? Math.abs(dy) > Math.abs(dx) : Math.abs(dx) > Math.abs(dy);
        if (!dragState.horizontal) return;
        if (container.setPointerCapture) {
          try { container.setPointerCapture(event.pointerId); } catch (ignore) {}
        }
      }
      var delta = isVertical ? event.clientY - dragState.lastY : event.clientX - dragState.lastX;
      dragState.lastX = event.clientX;
      dragState.lastY = event.clientY;
      if (Math.abs(delta) > 0) {
        dragState.moved = true;
        applyManualDelta(delta);
        if (event.cancelable) event.preventDefault();
      }
    }

    function onPointerEnd(event) {
      if (!dragState || event.pointerId !== dragState.id) return;
      var state = dragState;
      dragState = null;
      container.classList.remove('is-dragging');
      if (container.hasPointerCapture && container.hasPointerCapture(event.pointerId)) {
        container.releasePointerCapture(event.pointerId);
      }
      suppressClick = state.moved;
      if (suppressClick) {
        // Some touch browsers omit the compatibility click after a drag. Clear
        // the suppression immediately after that event turn so the next tap
        // is always free to follow its company link.
        setTimeout(function () { suppressClick = false; }, 0);
      }
      if (state.type === 'touch') {
        pointerInside = false;
        resumeAfterTouch();
      } else {
        pointerInside = pointerIsInside(event);
        syncAnimationState();
      }
    }

    function onWheel(event) {
      var horizontalDelta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : (event.shiftKey ? event.deltaY : 0);
      if (!horizontalDelta) return;
      pointerInside = true;
      pauseForManualInput();
      applyManualDelta(-horizontalDelta);
      if (event.cancelable) event.preventDefault();
    }

    function onClick(event) {
      if (!suppressClick) return;
      suppressClick = false;
      event.preventDefault();
      event.stopPropagation();
    }

    function onDragStart(event) {
      /* Links remain clickable, but native link dragging must not cancel the
         pointer stream that drives the seamless manual marquee drag. */
      event.preventDefault();
    }

    function onVisibilityChange() {
      documentVisible = !document.hidden;
      lastFrameTime = null;
      syncAnimationState();
    }

    container.addEventListener('pointerenter', onPointerEnter);
    container.addEventListener('pointerleave', onPointerLeave);
    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointermove', onPointerMove, { passive: false });
    container.addEventListener('pointerup', onPointerEnd);
    container.addEventListener('pointercancel', onPointerEnd);
    container.addEventListener('wheel', onWheel, { passive: false });
    container.addEventListener('click', onClick, true);
    container.addEventListener('dragstart', onDragStart);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return function destroy() {
      if (resizeFrame !== null) cancelAnimationFrame(resizeFrame);
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
      if (manualTimer !== null) clearTimeout(manualTimer);
      window.removeEventListener('resize', scheduleDimensionUpdate);
      if (visibilityObserver) visibilityObserver.disconnect();
      if (mobileMq.removeEventListener) mobileMq.removeEventListener('change', onViewportChange);
      else if (mobileMq.removeListener) mobileMq.removeListener(onViewportChange);
      container.removeEventListener('pointerenter', onPointerEnter);
      container.removeEventListener('pointerleave', onPointerLeave);
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerup', onPointerEnd);
      container.removeEventListener('pointercancel', onPointerEnd);
      container.removeEventListener('wheel', onWheel);
      container.removeEventListener('click', onClick, true);
      container.removeEventListener('dragstart', onDragStart);
      document.removeEventListener('visibilitychange', onVisibilityChange);
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
