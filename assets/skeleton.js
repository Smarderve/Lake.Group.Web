/* Lake Group sitewide layout-derived skeleton loader. */
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
  var progressFill = null;
  var progressValue = 0;
  var progressTarget = 0;
  var progressRaf = null;
  var progressObserver = null;

  var TARGET_SELECTOR = [
    'img', 'picture', 'video', 'canvas', 'iframe',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'li',
    'a', 'button', 'input', 'textarea', 'select',
    '[role="button"]', '[role="img"]', '[role="listitem"]',
    '[class*="card" i]', '[class*="tile" i]', '[class*="panel" i]',
    '[class*="map" i]', '[class*="gallery" i]', '[class*="hero" i]'
  ].join(',');

  /* Nav chrome (dropdowns, mega menu, mobile drawer) must never be skeletoned:
     these live collapsed/parked off-screen in the DOM and would ghost stray
     shapes over the real page layout. */
  var CHROME_SELECTOR = '.nav-dropdown, .nav-megamenu, .nav-mobile, .mm-layout, [class*="megamenu" i], [class*="mobile-menu" i]';

  function isVisibleTarget(element) {
    if (element.closest('[data-lg-skeleton-overlay], .lg-skel-status, script, style, template')) return false;
    if (element.closest(CHROME_SELECTOR)) return false;
    var style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
    var rect = element.getBoundingClientRect();
    if (rect.width <= 2 || rect.height <= 2 || rect.bottom <= 0 || rect.top >= window.innerHeight || rect.right <= 0 || rect.left >= window.innerWidth) return false;
    // Skip descendants of containers that are genuinely not rendered
    // (display:none / visibility:hidden ancestors). Load-time entrance fades
    // use opacity animations, so opacity is intentionally NOT walked here.
    var node = element.parentElement;
    while (node && node.nodeType === 1) {
      var parentStyle = window.getComputedStyle(node);
      if (parentStyle.display === 'none' || parentStyle.visibility === 'hidden' || parentStyle.visibility === 'collapse') return false;
      node = node.parentElement;
    }
    return true;
  }

  function classifyTarget(element, style) {
    var tag = element.tagName;
    var className = typeof element.className === 'string' ? element.className.toLowerCase() : '';
    if (/^(IMG|PICTURE|VIDEO|CANVAS|IFRAME)$/.test(tag) || /(?:map|gallery|media|image|photo|video)/.test(className)) return 'media';
    if (element.getAttribute('role') === 'button' || /(?:^|\s|-|\b)(?:btn|button|cta|pill|chip)(?:\b|-|$)/.test(className)) return 'button';
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(tag)) return 'field';
    if (/^(H1|H2|H3|H4|H5|H6|P|LI)$/.test(tag)) return 'text';
    if (tag === 'A') return 'link';
    return 'surface';
  }

  var TEXT_LINE_WIDTHS = {
    h1: [0.94, 0.6],
    h2: [0.9, 0.56],
    h3: [0.86, 0.5],
    h4: [0.6],
    h5: [0.56],
    h6: [0.5],
    p:  [0.94, 0.9, 0.78, 0.58],
    li: [0.62],
    a:  [0.55]
  };

  /* Clamp a generated block to the visible viewport before adding it. */
  function pushBlock(targets, block) {
    var left = Math.max(0, block.left);
    var top = Math.max(0, block.top);
    var width = Math.min(window.innerWidth, block.left + block.width) - left;
    var height = Math.min(window.innerHeight, block.top + block.height) - top;
    if (width < 2 || height < 2) return;
    targets.push({
      kind: block.kind,
      left: left,
      top: top,
      width: width,
      height: height,
      radius: block.radius
    });
  }

  /* Thin multi-line text placeholders (YouTube-style) instead of one solid block. */
  function pushTextLines(targets, kind, rect, style) {
    var tag = kind === 'link' ? 'a' : kind;
    var widths = TEXT_LINE_WIDTHS[tag] || [0.85, 0.6];
    var fontSize = parseFloat(style.fontSize) || 14;
    var lineHeightPx = style.lineHeight === 'normal'
      ? Math.round(fontSize * 1.4)
      : parseFloat(style.lineHeight);
    if (!lineHeightPx || lineHeightPx < fontSize * 0.6 || lineHeightPx > fontSize * 3) {
      lineHeightPx = Math.round(fontSize * 1.4);
    }
    var maxLines = tag === 'p' ? 4 : widths.length;
    var fit = Math.max(1, Math.floor(rect.height / lineHeightPx));
    var count = Math.min(maxLines, fit);
    if (tag === 'p' && count < 2 && rect.height >= lineHeightPx * 1.5) count = 2;

    var thickness = Math.max(6, Math.round(fontSize * 0.24));
    var gap = Math.max(2, lineHeightPx - thickness);
    var align = (style.textAlign || 'left').toLowerCase();
    var inset = Math.min(6, Math.round(rect.width * 0.03));

    for (var i = 0; i < count; i++) {
      var fraction = widths[Math.min(i, widths.length - 1)];
      var width = Math.max(12, Math.round(rect.width * fraction) - inset);
      var left = rect.left + inset;
      if (align === 'center') left = rect.left + (rect.width - width) / 2;
      else if (align === 'right') left = rect.left + rect.width - width - inset;
      pushBlock(targets, {
        kind: 'text',
        left: left,
        top: rect.top + i * (thickness + gap),
        width: width,
        height: thickness,
        radius: Math.round(thickness / 2)
      });
    }
  }

  /* Compact pill placeholder for buttons and CTA links (YouTube-style). */
  function pushPill(targets, rect) {
    var height = Math.min(rect.height, Math.max(20, Math.round(rect.height * 0.72)));
    var width = Math.max(44, Math.round(rect.width * 0.82));
    pushBlock(targets, {
      kind: 'control',
      left: rect.left + (rect.width - width) / 2,
      top: rect.top + (rect.height - height) / 2,
      width: width,
      height: height,
      radius: Math.round(height / 2)
    });
  }

  /* Rounded control placeholder for form fields. */
  function pushField(targets, rect) {
    var height = Math.min(rect.height, 44);
    pushBlock(targets, {
      kind: 'control',
      left: rect.left,
      top: rect.top + (rect.height - height) / 2,
      width: rect.width,
      height: height,
      radius: 12
    });
  }

  function collectSkeletonTargets(root) {
    var elements = Array.prototype.slice.call(root.querySelectorAll(TARGET_SELECTOR));
    var entries = [];
    var i, j, element, rect, style, kind, radius, blocks;

    for (i = 0; i < elements.length; i++) {
      element = elements[i];
      if (!isVisibleTarget(element)) continue;
      rect = element.getBoundingClientRect();
      style = window.getComputedStyle(element);
      kind = classifyTarget(element, style);
      radius = style.borderRadius && style.borderRadius !== '0px' ? style.borderRadius : null;

      blocks = [];
      if (kind === 'text' || kind === 'link') {
        pushTextLines(blocks, kind, rect, style);
      } else if (kind === 'button') {
        pushPill(blocks, rect);
      } else if (kind === 'field') {
        pushField(blocks, rect);
      } else {
        pushBlock(blocks, {
          kind: kind,
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
          radius: kind === 'media' ? (radius || 12) : radius
        });
      }
      if (!blocks.length) continue;
      entries.push({ element: element, kind: kind, blocks: blocks });
    }

    var targets = [];
    for (i = 0; i < entries.length; i++) {
      var entry = entries[i];
      // Delivery of nested structure: a container (card, hero, map, tile,
      // wrapped link, icon button...) must not draw its own fill on top of the
      // placeholders of the elements it contains, or shapes stack into mush.
      // Leaf text keeps its lines; every other kind is dropped when any inner
      // element already produces the skeleton for that region.
      if (entry.kind !== 'text') {
        var covered = false;
        for (j = 0; j < entries.length; j++) {
          if (j === i || !entries[j].blocks.length) continue;
          if (entry.element.contains(entries[j].element)) { covered = true; break; }
        }
        if (covered) continue;
      }
      targets = targets.concat(entry.blocks);
    }

    // Drop near-identical duplicates (e.g. several sibling full-bleed hero
    // background layers occupying the same viewport) so they don't stack up.
    var kept = [];
    for (i = 0; i < targets.length; i++) {
      var block = targets[i];
      var redundant = false;
      for (j = 0; j < kept.length; j++) {
        var other = kept[j];
        if (block.left >= other.left - 3 && block.top >= other.top - 3 &&
            block.left + block.width <= other.left + other.width + 3 &&
            block.top + block.height <= other.top + other.height + 3) {
          var blockArea = block.width * block.height;
          var otherArea = other.width * other.height;
          if (otherArea > 2000 && blockArea >= otherArea * 0.85) { redundant = true; break; }
        }
      }
      if (!redundant) kept.push(block);
    }
    return kept;
  }

  function createBlock(target) {
    var block = document.createElement('div');
    block.setAttribute('data-lg-skeleton-block', target.kind);
    block.style.left = target.left + 'px';
    block.style.top = target.top + 'px';
    block.style.width = Math.max(2, target.width) + 'px';
    block.style.height = Math.max(2, target.height) + 'px';
    if (target.radius && target.radius !== '0px') {
      block.style.borderRadius = typeof target.radius === 'number' ? target.radius + 'px' : target.radius;
    }
    return block;
  }

  function buildSkeletonOverlay(targets) {
    var overlay = document.createElement('div');
    overlay.id = 'lg-skel';
    overlay.dataset.lgSkeletonOverlay = '';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.inert = true;

    var progress = document.createElement('div');
    progress.className = 'lg-skel-progress';
    progress.innerHTML = '<div class="lg-skel-progress__fill"></div>';
    overlay.appendChild(progress);
    progressFill = progress.firstChild;

    var fragment = document.createDocumentFragment();
    for (var i = 0; i < targets.length; i++) fragment.appendChild(createBlock(targets[i]));
    overlay.appendChild(fragment);
    return overlay;
  }

  function createStatus() {
    var status = document.createElement('div');
    status.className = 'lg-skel-status';
    status.id = 'lg-skel-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.textContent = 'Loading…';
    return status;
  }

  function animateProgress() {
    if (!progressFill) return;
    progressValue += (progressTarget - progressValue) * 0.12;
    if (progressTarget - progressValue < 0.3) progressValue = progressTarget;
    progressFill.style.width = progressValue + '%';
    if (progressValue < 100) progressRaf = window.requestAnimationFrame(animateProgress);
    else progressRaf = null;
  }

  function setProgress(percent) {
    progressTarget = Math.min(percent, 100);
    if (!progressRaf) animateProgress();
  }

  function trackResources() {
    var resources = Array.prototype.slice.call(document.querySelectorAll('img[src], link[rel="stylesheet"], script[src], [style*="background-image"]'));
    var total = resources.length;
    if (!total) { setProgress(100); return; }

    var loaded = 0;
    function onDone() {
      loaded++;
      setProgress((loaded / total) * 100);
    }

    resources.forEach(function (resource) {
      if (resource.tagName === 'IMG' && resource.complete) return onDone();
      if (resource.tagName === 'LINK' && resource.sheet) return onDone();
      if (resource.tagName === 'SCRIPT' && (resource.readyState === 'complete' || resource.readyState === 'loaded')) return onDone();
      if (resource.matches('[style*="background-image"]')) return window.setTimeout(onDone, 200);
      resource.addEventListener('load', onDone, { once: true });
      resource.addEventListener('error', onDone, { once: true });
    });

    progressObserver = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        Array.prototype.forEach.call(mutation.addedNodes, function (node) {
          if (node.nodeType !== 1 || node.tagName !== 'IMG' || !node.src) return;
          total++;
          if (node.complete) onDone();
          else {
            node.addEventListener('load', onDone, { once: true });
            node.addEventListener('error', onDone, { once: true });
          }
        });
      });
    });
    progressObserver.observe(document.body, { childList: true, subtree: true });
    window.setTimeout(function () { setProgress(100); }, MAX_MS);
  }

  /* --------------------------------------------------------------------------
     Dynamic convergence. The first pass at DOMContentLoaded is a best guess:
     images have no intrinsic size yet, fonts are not swapped in, and scripts
     may still be injecting cards/grids. So we keep re-scanning the live DOM
     while the curtain is up and rebuild the blocks in place whenever the real
     layout meaningfully changes. The skeleton therefore mirrors the page's
     actual structure (and edits to those pages) instead of a frozen snapshot.
     -------------------------------------------------------------------------- */
  var polishTimer = null;
  var settleTimer = null;
  var polishCount = 0;
  var polishDebounce = 200;
  var settleQuiet = 360;
  var MAX_POLISH = 30;

  function byLeftTop(a, b) { return a.left - b.left || a.top - b.top; }

  function renderedBlocks(overlay) {
    var nodes = overlay.querySelectorAll('[data-lg-skeleton-block]');
    var blocks = [];
    for (var i = 0; i < nodes.length; i++) {
      var rect = nodes[i].getBoundingClientRect();
      blocks.push({
        kind: nodes[i].getAttribute('data-lg-skeleton-block') || '',
        left: rect.left, top: rect.top, width: rect.width, height: rect.height
      });
    }
    blocks.sort(byLeftTop);
    return blocks;
  }

  function layoutShifted(targets, rendered) {
    if (targets.length !== rendered.length) return true;
    for (var i = 0; i < rendered.length; i++) {
      var a = targets[i], b = rendered[i];
      if (Math.abs(a.left - b.left) > 12 || Math.abs(a.top - b.top) > 12 ||
          Math.abs(a.width - b.width) > 16 || Math.abs(a.height - b.height) > 16) return true;
    }
    return false;
  }

  function applyTargets(overlay, targets) {
    var old = overlay.querySelectorAll('[data-lg-skeleton-block]');
    for (var i = 0; i < old.length; i++) old[i].remove();
    var fragment = document.createDocumentFragment();
    for (var j = 0; j < targets.length; j++) fragment.appendChild(createBlock(targets[j]));
    overlay.appendChild(fragment);
  }

  function polish() {
    if (hidden || polishCount >= MAX_POLISH) return;
    var overlay = document.querySelector('[data-lg-skeleton-overlay]');
    if (!overlay) return;
    polishCount++;
    var targets = collectSkeletonTargets(document.body).sort(byLeftTop);
    if (!layoutShifted(targets, renderedBlocks(overlay))) return;
    applyTargets(overlay, targets);
    if (typeof window.__lgSkelPolishedCount === 'number') window.__lgSkelPolishedCount++;
  }

  function schedulePolish() {
    if (polishTimer) window.clearTimeout(polishTimer);
    polishTimer = window.setTimeout(polish, polishDebounce);
  }

  function scheduleSettle() {
    if (settleTimer) window.clearTimeout(settleTimer);
    settleTimer = window.setTimeout(function () {
      if (document.readyState === 'complete' && !hidden) hide();
    }, settleQuiet);
  }

  function mount() {
    if (!document.body || document.querySelector('[data-lg-skeleton-overlay]')) return;
    var targets = collectSkeletonTargets(document.body);
    var overlay = buildSkeletonOverlay(targets);
    document.body.insertBefore(overlay, document.body.firstChild);
    document.body.appendChild(createStatus());
    trackResources();

    window.__lgSkelPolishedCount = 0;
    // Serial backstops for image-height / font driven shifts that produce no
    // DOM mutation on their own.
    window.setTimeout(polish, 450);
    window.setTimeout(polish, 2000);

    // Hide once the page has settled: no new structural changes for a quiet
    // window after everything has loaded (respecting the hard MAX_MS cap).
    if (!window.__lgSkelSettleObserver) {
      window.__lgSkelSettleObserver = new MutationObserver(function () {
        if (!hidden) { schedulePolish(); scheduleSettle(); }
      });
      window.__lgSkelSettleObserver.observe(document.body, { childList: true, subtree: true });
    }
    if (document.readyState === 'complete') window.requestAnimationFrame(hide);
    else window.addEventListener('load', function onLoad() {
      schedulePolish();
      scheduleSettle();
    }, { once: true });
    scheduleSettle();
    window.setTimeout(hide, MAX_MS);
  }

  function hide() {
    if (hidden) return;
    polish(); // draw the final, accurate structure right before the reveal
    hidden = true;
    if (progressObserver) progressObserver.disconnect();
    if (progressRaf) window.cancelAnimationFrame(progressRaf);
    setProgress(100);
    html.classList.remove('lg-loading');
    html.classList.add('lg-skel-done');
    var overlay = document.querySelector('[data-lg-skeleton-overlay]');
    var status = document.getElementById('lg-skel-status');
    if (status) status.remove();
    if (!overlay) return;
    overlay.classList.add('lg-skel-hide');
    window.setTimeout(function () { overlay.remove(); }, FADE_MS);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
})();
