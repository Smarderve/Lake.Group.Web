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
    'img', 'picture', 'video', 'canvas', 'iframe', 'figure', 'hr',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'li',
    'a', 'button', 'input', 'textarea', 'select',
    '[role="button"]', '[role="img"]', '[role="listitem"]',
    '[class*="card" i]', '[class*="tile" i]', '[class*="panel" i]',
    '[class*="map" i]', '[class*="gallery" i]', '[class*="hero" i]',
    '[class*="media" i]', '[class*="figure" i]',
    '[class*="eyebrow" i]', '[class*="stamp" i]', '[class*="label" i]'
  ].join(',');

  /* Nav chrome (dropdowns, mega menu, mobile drawer) must never be skeletoned:
     these live collapsed/parked off-screen in the DOM and would ghost stray
     shapes over the real page layout. */
  var CHROME_SELECTOR = '.nav-dropdown, .nav-megamenu, .nav-mobile, .mm-layout, [class*="megamenu" i], [class*="mobile-menu" i]';

  /* True-visibility walker: an element only counts when neither it nor any
     ancestor is display:none / visibility:hidden. Static opacity:0 containers
     (carousel slides stacked full-viewport — home hero, the About story stage)
     collapse every slide at the same origin; muting the inactive ones is what
     lets the skeleton mirror only the live slide instead of a jumble of
     ghosts. Elements under a running entrance ANIMATION (fs-page-in,
     fs-nav-settle…) are exempt: they start at opacity 0 but are part of the
     true first paint. optOut = an ancestor whose opacity is ignored (the
     About page's first slide is forced visible while the curator JS has not
     activated it yet). */
  function isAnimated(style) {
    var name = style.animationName;
    return !!name && name !== 'none';
  }

  function isShown(element, optOut) {
    var style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') return false;
    if (!optOut && Number(style.opacity) === 0 && !isAnimated(style)) return false;
    var rect = element.getBoundingClientRect();
    if (rect.width <= 2 || rect.height <= 2) return false;
    var node = element.parentElement;
    while (node && node.nodeType === 1) {
      var parentStyle = window.getComputedStyle(node);
      if (parentStyle.display === 'none' || parentStyle.visibility === 'hidden' || parentStyle.visibility === 'collapse') return false;
      if (!optOut && Number(parentStyle.opacity) === 0 && !isAnimated(parentStyle)) return false;
      node = node.parentElement;
    }
    return true;
  }

  /* The About hero stage stacks eight full-viewport .ose-scene slides; the
     curator marks one .ose-active only after load. While the curtain is up,
     render the first scene's structure so the skeleton matches the true
     first paint instead of drawing nothing. */
  function forcedSceneFor(element) {
    var scene = element.closest('.ose-scene');
    if (!scene || scene.classList.contains('ose-active')) return null;
    var stage = scene.parentElement;
    if (!stage || stage.querySelector('.ose-scene') !== scene) return null;
    return scene;
  }

  function isVisibleTarget(element) {
    if (element.closest('[data-lg-skeleton-overlay], .lg-skel-status, script, style, template')) return false;
    if (element.closest(CHROME_SELECTOR)) return false;
    if (!isShown(element, forcedSceneFor(element))) return false;
    var rect = element.getBoundingClientRect();
    if (rect.bottom <= 0 || rect.top >= window.innerHeight || rect.right <= 0 || rect.left >= window.innerWidth) return false;
    return true;
  }

  function classifyTarget(element, style, rect) {
    var tag = element.tagName;
    var className = typeof element.className === 'string' ? element.className.toLowerCase() : '';
    if (tag === 'HR') return 'rule';
    if (/^(IMG|PICTURE|VIDEO|CANVAS|IFRAME|FIGURE)$/.test(tag) || /(?:map|gallery|media|figure|image|photo|video)/.test(className)) return 'media';
    if (element.getAttribute('role') === 'button' || /(?:^|\s|-|\b)(?:btn|button|cta|pill|chip)(?:\b|-|$)/.test(className)) return 'button';
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(tag)) return 'field';
    if (/^(H1|H2|H3|H4|H5|H6|P|LI)$/.test(tag)) return 'text';
    if (/^(SPAN|SMALL|LABEL)$/.test(tag)) {
      // Icon glyphs (inline svg, iconify, checkmarks) must never read as lines.
      if (element.querySelector('svg, img, iconify-icon, picture, [class*="icon" i], [data-icon]')) return null;
      return 'text';
    }
    if (tag === 'A') {
      // Icon-only links (social buttons etc.) are round media chips; links
      // carrying text are lines with a button-style indicator appended.
      if (rect && rect.width <= 96 && element.querySelector('svg, img, iconify-icon, picture')) return 'media';
      return 'link';
    }
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

    /* Links end in a small dot, mirroring the brand's button indicators. */
    if (kind === 'link' && count > 0) {
      var line = targets[targets.length - 1];
      var dot = Math.max(6, Math.min(10, Math.round(thickness * 1.15)));
      var dotX = line.left + line.width + 7;
      if (dotX + dot <= rect.right + 6 && dot * 3 <= rect.width) {
        pushBlock(targets, {
          kind: 'indicator',
          left: dotX,
          top: line.top + (thickness - dot) / 2,
          width: dot,
          height: dot,
          radius: dot / 2
        });
      }
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

  /* --------------------------------------------------------------------------
     Navbar chrome. The fixed .site-nav bar is drawn as the real design reads:
     a full-width band at the top of the screen, its brand border-bottom edge,
     the logo chip on the left, each nav label as a line with a button-style
     indicator dot, the language trigger as globe + line, and the mobile
     hamburger as three tiny bars. Geometry comes from the live bar, so it
     matches the true layout at any breakpoint.
     -------------------------------------------------------------------------- */
  function collectNavBlocks(nav) {
    var blocks = [];
    var rect = nav.getBoundingClientRect();
    if (rect.width < 4) return blocks;
    var top = Math.max(0, rect.top);
    var height = Math.min(window.innerHeight, rect.bottom) - top;
    if (height < 8) return blocks;

    var navStyle = window.getComputedStyle(nav);
    var bg = navStyle.backgroundColor;
    if (!bg || bg === 'transparent' || bg === 'rgba(0, 0, 0, 0)') bg = 'rgba(1, 102, 148, 0.6)';
    blocks.push({
      kind: 'navbar',
      left: 0, top: top,
      width: window.innerWidth, height: height,
      radius: 0, background: bg
    });

    var edgeH = Math.max(2, Math.min(4, Math.round(height * 0.045)));
    var edgeY = Math.min(window.innerHeight, rect.bottom) - edgeH;
    var edgeC = navStyle.borderBottomColor;
    if (!edgeC || edgeC === 'transparent' || edgeC === 'rgba(0, 0, 0, 0)') edgeC = 'rgba(255, 242, 0, 0.85)';
    if (edgeY >= top + 4) {
      blocks.push({
        kind: 'navrule',
        left: 0, top: edgeY,
        width: window.innerWidth, height: edgeH,
        radius: 0, background: edgeC
      });
    }

    var logo = nav.querySelector('.nav-logo img') || nav.querySelector('.nav-logo');
    if (logo && isShown(logo)) {
      var lr = logo.getBoundingClientRect();
      if (lr.width > 2 && lr.height > 2) {
        blocks.push({ kind: 'media', left: lr.left, top: lr.top, width: lr.width, height: lr.height, radius: 4 });
      }
    }

    var links = Array.prototype.slice.call(nav.querySelectorAll('.nav-links > li > a'));
    for (var i = 0; i < links.length; i++) {
      var link = links[i];
      if (!isShown(link)) continue;
      var lr = link.getBoundingClientRect();
      var ls = window.getComputedStyle(link);
      var padL = parseFloat(ls.paddingLeft) || 0;
      var padR = parseFloat(ls.paddingRight) || 0;
      var padT = parseFloat(ls.paddingTop) || 0;
      var padB = parseFloat(ls.paddingBottom) || 0;
      var textW = lr.width - padL - padR;
      if (textW < 14 || lr.bottom <= 0 || lr.top >= window.innerHeight) continue;
      var fs = parseFloat(ls.fontSize) || 13;
      var lh = ls.lineHeight === 'normal' ? Math.round(fs * 1.4) : parseFloat(ls.lineHeight);
      if (!lh || lh < fs * 0.6 || lh > fs * 3) lh = Math.round(fs * 1.4);
      var thick = Math.max(5, Math.round(fs * 0.24));
      var zoneTop = lr.top + padT;
      var zoneH = lr.height - padT - padB;
      if (zoneH < thick) { zoneTop = lr.top + (lr.height - thick) / 2; zoneH = thick; }
      var lineTop = zoneTop + (zoneH - thick) / 2;
      var lineLeft = lr.left + padL;
      blocks.push({
        kind: 'text',
        left: lineLeft, top: lineTop,
        width: Math.max(12, textW), height: thick,
        radius: Math.round(thick / 2)
      });
      var dot = Math.max(6, Math.min(9, Math.round(thick * 1.15)));
      var dotX = lineLeft + textW + 6;
      if (dotX + dot <= lr.right + 4) {
        blocks.push({
          kind: 'indicator',
          left: dotX, top: lineTop + (thick - dot) / 2,
          width: dot, height: dot,
          radius: dot / 2
        });
      }
    }

    var lang = nav.querySelector('.lang-trigger');
    if (lang && isShown(lang)) {
      var langRect = lang.getBoundingClientRect();
      if (langRect.width > 10 && langRect.bottom > 0 && langRect.top < window.innerHeight) {
        var globeD = Math.min(18, langRect.height * 0.32);
        blocks.push({
          kind: 'media',
          left: langRect.left + 2, top: langRect.top + (langRect.height - globeD) / 2,
          width: globeD, height: globeD,
          radius: globeD / 2
        });
        var tLeft = langRect.left + globeD + 12;
        var tWidth = Math.max(12, langRect.right - tLeft - 6);
        var tHeight = Math.max(5, Math.round(langRect.height * 0.18));
        blocks.push({
          kind: 'text',
          left: tLeft, top: langRect.top + (langRect.height - tHeight) / 2,
          width: tWidth, height: tHeight,
          radius: Math.round(tHeight / 2)
        });
      }
    }

    var toggle = nav.querySelector('.nav-toggle');
    if (toggle && isShown(toggle)) {
      var tr = toggle.getBoundingClientRect();
      if (tr.width > 4 && tr.height > 4) {
        var barW = Math.min(22, Math.round(tr.width * 0.55));
        var barH = Math.max(2, Math.round(tr.height * 0.07));
        var gap = Math.max(3, barH * 1.8);
        var barLeft = tr.left + (tr.width - barW) / 2;
        var barTop = tr.top + (tr.height - (barH * 3 + gap * 2)) / 2;
        for (var b = 0; b < 3; b++) {
          blocks.push({
            kind: 'control',
            left: barLeft, top: barTop + b * (barH + gap),
            width: barW, height: barH,
            radius: 1
          });
        }
      }
    }
    return blocks;
  }

  function collectSkeletonTargets(root) {
    var nav = root.querySelector('.site-nav');
    var elements = Array.prototype.slice.call(root.querySelectorAll(TARGET_SELECTOR));
    var entries = [];
    var i, j, element, rect, style, kind, radius, blocks;

    for (i = 0; i < elements.length; i++) {
      element = elements[i];
      if (element.closest('.site-nav')) continue; // nav chrome is drawn by collectNavBlocks
      if (!isVisibleTarget(element)) continue;
      rect = element.getBoundingClientRect();
      style = window.getComputedStyle(element);
      kind = classifyTarget(element, style, rect);
      if (!kind) continue;
      radius = style.borderRadius && style.borderRadius !== '0px' ? style.borderRadius : null;

      blocks = [];
      if (kind === 'text' || kind === 'link') {
        // List rows and eyebrow-style spans that wrap interactive elements
        // (li > a lists, span > button) hand over to their inner content.
        if (/^(LI|SPAN|SMALL|LABEL)$/.test(element.tagName) &&
            element.querySelector('a, button, [role="button"], input, select, textarea')) continue;
        pushTextLines(blocks, kind, rect, style);
      } else if (kind === 'button') {
        pushPill(blocks, rect);
      } else if (kind === 'field') {
        pushField(blocks, rect);
      } else if (kind === 'rule') {
        var ruleH = Math.max(2, rect.height);
        pushBlock(blocks, {
          kind: 'rule',
          left: rect.left,
          top: rect.top + (rect.height - ruleH) / 2,
          width: rect.width,
          height: ruleH,
          radius: 1
        });
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
      // element already produces the skeleton for that region. Text inside a
      // button / field / media placeholder is internal chrome of that control
      // and is dropped too.
      var covered = false;
      for (j = 0; j < entries.length; j++) {
        if (j === i || !entries[j].blocks.length) continue;
        if (entry.kind === 'text' && !/^(button|field|media|navbar|navrule|rule|indicator)$/i.test(entries[j].kind)) continue;
        if (entry.element.contains(entries[j].element)) { covered = true; break; }
      }
      if (covered) continue;
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
    // The navbar always paints last so it sits above full-bleed hero media.
    var navBlocks = nav && isShown(nav) ? collectNavBlocks(nav) : [];
    return kept.concat(navBlocks);
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
    if (target.background) block.style.background = target.background;
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
