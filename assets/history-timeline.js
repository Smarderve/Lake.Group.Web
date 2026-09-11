(() => {
  const timeline = document.querySelector('[data-history-timeline]');
  if (!timeline) return;

  const groups = [...timeline.querySelectorAll('.history-year-group')];
  if (!groups.length) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Separate reveal motion from the rigid Aceternity card surface so the
  // timeline translation can never overwrite pointer tilt.
  groups.forEach((group) => {
    group.querySelectorAll('.history-event').forEach((card) => {
      if (card.parentElement?.classList.contains('history-event-reveal')) return;
      const reveal = document.createElement('div');
      reveal.className = 'history-event-reveal';
      card.replaceWith(reveal);
      reveal.append(card);
    });
  });
  const focusRatio = 0.42;
  const gradientAngles = {
    2006: 135, 2008: 72, 2010: 45, 2011: 155, 2013: 105,
    2014: 30, 2016: 165, 2017: 25, 2018: 92, 2019: 120,
    2020: 60, 2021: 145, 2023: 38, 2025: 112, 2026: 68,
  };
  const state = {
    anchors: [],
    groups: [],
    lineStart: 0,
    lineEnd: 0,
    finalNodeOffset: 0,
    nodeProgress: [],
    progress: 0,
    activeIndex: null,
    frame: 0,
    geometryReady: false,
    initialized: false,
  };

  groups.forEach((group) => {
    const year = Number.parseInt(group.querySelector('.history-year')?.textContent || '', 10);
    group.style.setProperty('--history-gradient-angle', `${gradientAngles[year] ?? 135}deg`);
    if (group.querySelector('.history-node')) return;
    const node = document.createElement('span');
    node.className = 'history-node';
    node.setAttribute('aria-hidden', 'true');
    group.prepend(node);
  });

  const tail = document.createElement('span');
  tail.className = 'history-timeline-tail';
  tail.setAttribute('aria-hidden', 'true');
  timeline.append(tail);

  // Branch SVGs stay anchored to each milestone and are measured only on layout.
  const branchSvgs = groups.map((group) => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('history-branches');
    svg.setAttribute('aria-hidden', 'true');
    group.prepend(svg);
    return svg;
  });

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const getLayoutBox = (element, ancestor) => {
    let left = 0;
    let top = 0;
    let current = element;
    while (current && current !== ancestor) {
      left += current.offsetLeft || 0;
      top += current.offsetTop || 0;
      current = current.offsetParent;
    }
    return {
      left,
      top,
      width: element.offsetWidth,
      height: element.offsetHeight,
    };
  };

  const readTargetProgress = () => {
    if (!state.geometryReady) return 0;
    const viewportLine = window.scrollY + window.innerHeight * focusRatio;
    return clamp((viewportLine - state.lineStart) / Math.max(1, state.lineEnd - state.lineStart), 0, 1);
  };

  const getActiveIndex = (progress) => {
    let activeIndex = -1;
    state.nodeProgress.forEach((nodeProgress, index) => {
      if (progress >= nodeProgress) activeIndex = index;
    });
    return activeIndex;
  };

  const applyGroupState = (activeIndex) => {
    if (activeIndex === state.activeIndex) return;
    state.activeIndex = activeIndex;
    groups.forEach((group, index) => {
      group.classList.toggle('is-complete', index < activeIndex);
      group.classList.toggle('is-active', index === activeIndex);
      group.classList.toggle('is-future', index > activeIndex);
    });
  };

  const render = () => {
    state.frame = 0;
    const progress = readTargetProgress();
    state.progress = progress;
    timeline.style.setProperty('--timeline-progress', progress.toFixed(5));
    const travelled = progress * Math.max(1, state.lineEnd - state.lineStart);
    timeline.style.setProperty('--timeline-line-height', `${Math.min(travelled, state.finalNodeOffset).toFixed(2)}px`);
    tail.style.setProperty('--timeline-tail-height', `${Math.max(0, travelled - state.finalNodeOffset).toFixed(2)}px`);
    applyGroupState(getActiveIndex(progress));

    state.groups.forEach(({ nodeOffset, branches }) => {
      branches.forEach(({ path, length, reveal, startOffset, distance }) => {
        const rawBranchProgress = clamp((travelled - nodeOffset - startOffset) / distance, 0, 1);
        const branchProgress = reduceMotion ? (rawBranchProgress > 0 ? 1 : 0) : rawBranchProgress;
        const revealProgressRaw = clamp((rawBranchProgress - 0.78) / 0.22, 0, 1);
        const revealProgress = reduceMotion ? (revealProgressRaw > 0 ? 1 : 0) : revealProgressRaw;
        path.style.setProperty('--branch-offset', `${(length * (1 - branchProgress)).toFixed(2)}`);
        path.style.setProperty('--branch-opacity', `${(branchProgress * 0.9).toFixed(3)}`);
        reveal.style.setProperty('--card-reveal-opacity', revealProgress.toFixed(3));
        reveal.style.setProperty('--card-reveal-x', `${(24 * (1 - revealProgress)).toFixed(2)}px`);
        reveal.style.setProperty('--card-reveal-scale', (0.985 + revealProgress * 0.015).toFixed(4));
      });
    });
  };

  const scheduleRender = () => {
    if (state.frame) return;
    state.frame = window.requestAnimationFrame(render);
  };

  // Cards use one shared pointer frame instead of a loop per card. Touch and
  // reduced-motion users keep the calm static presentation.
  const cardCleanup = [];
  let cardFrame = 0;
  let activeCard = null;
  let cardRect = null;
  let pointerX = 0;
  let pointerY = 0;
  const canTiltCards = !reduceMotion && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (canTiltCards) {
    const cards = [...timeline.querySelectorAll('.history-event')];
    const resetCard = () => {
      if (activeCard) {
        activeCard.style.setProperty('--card-tilt-x', '0deg');
        activeCard.style.setProperty('--card-tilt-y', '0deg');
      }
      activeCard = null;
      cardRect = null;
    };
    const renderCard = () => {
      cardFrame = 0;
      if (!activeCard || !cardRect) return;
      const x = (pointerX - cardRect.left) / Math.max(1, cardRect.width) - 0.5;
      const y = (pointerY - cardRect.top) / Math.max(1, cardRect.height) - 0.5;
      activeCard.style.setProperty('--card-tilt-x', `${(-y * 3.2).toFixed(2)}deg`);
      activeCard.style.setProperty('--card-tilt-y', `${(x * 3.2).toFixed(2)}deg`);
    };
    const scheduleCardFrame = () => {
      if (!cardFrame) cardFrame = window.requestAnimationFrame(renderCard);
    };
    cards.forEach((card) => {
      const onEnter = (event) => {
        activeCard = card;
        cardRect = card.getBoundingClientRect();
        pointerX = event.clientX;
        pointerY = event.clientY;
        scheduleCardFrame();
      };
      const onMove = (event) => {
        pointerX = event.clientX;
        pointerY = event.clientY;
        scheduleCardFrame();
      };
      const onLeave = () => {
        if (cardFrame) cancelAnimationFrame(cardFrame);
        cardFrame = 0;
        resetCard();
      };
      card.addEventListener('pointerenter', onEnter, { passive: true });
      card.addEventListener('pointermove', onMove, { passive: true });
      card.addEventListener('pointerleave', onLeave, { passive: true });
      cardCleanup.push(() => {
        card.removeEventListener('pointerenter', onEnter);
        card.removeEventListener('pointermove', onMove);
        card.removeEventListener('pointerleave', onLeave);
      });
    });
  }

  const measureGeometry = () => {
    const timelineBounds = timeline.getBoundingClientRect();
    const timelineDocumentTop = timelineBounds.top + window.scrollY;
    const anchors = groups.map((group) => {
      const groupBounds = group.getBoundingClientRect();
      const yearBounds = group.querySelector('.history-year').getBoundingClientRect();
      const anchor = yearBounds.top + yearBounds.height / 2;
      const borderTop = Number.parseFloat(window.getComputedStyle(group).borderTopWidth) || 0;
      group.style.setProperty('--history-node-y', `${anchor - groupBounds.top - borderTop}px`);
      return anchor + window.scrollY;
    });

    const groupGeometry = [];
    groups.forEach((group, index) => {
      const svg = branchSvgs[index];
      const groupRect = group.getBoundingClientRect();
      svg.setAttribute('viewBox', `0 0 ${Math.max(1, groupRect.width)} ${Math.max(1, groupRect.height)}`);
      svg.replaceChildren();
      const nodeRect = group.querySelector('.history-node')?.getBoundingClientRect();
      const cards = [...group.querySelectorAll('.history-event')];
      if (!nodeRect || !cards.length) return;
      const sx = nodeRect.left + nodeRect.width / 2 - groupRect.left;
      const sy = nodeRect.top + nodeRect.height / 2 - groupRect.top;
      const branches = [];
      cards.forEach((card, cardIndex) => {
        const cardBox = getLayoutBox(card, group);
        const ex = cardBox.left;
        const ey = cardBox.top + cardBox.height / 2;
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const dx = Math.max(1, ex - sx);
        const dy = ey - sy;
        const rank = cards.length === 1 ? 0.5 : cardIndex / (cards.length - 1);
        const departure = cards.length === 1
          ? (dy >= 0 ? -34 : 34)
          : -24 + rank * 92;
        const arrivalLift = Math.sign(dy || 1) * Math.min(108, 34 + Math.abs(dy) * .14);
        const controlOneX = sx + Math.max(28, dx * .32);
        const controlTwoX = ex - Math.max(24, dx * .3);
        const controlOneY = sy + departure;
        const controlTwoY = ey - arrivalLift;
        path.setAttribute('d', `M ${sx.toFixed(1)} ${sy.toFixed(1)} C ${controlOneX.toFixed(1)} ${controlOneY.toFixed(1)}, ${controlTwoX.toFixed(1)} ${controlTwoY.toFixed(1)}, ${ex.toFixed(1)} ${ey.toFixed(1)}`);
        path.classList.add('history-branch');
        svg.append(path);
        const reveal = card.parentElement;
        if (!reveal) return;
        const length = Math.ceil(path.getTotalLength());
        path.style.setProperty('--branch-length', `${length}`);
        path.style.setProperty('--branch-offset', `${length}`);
        branches.push({
          path,
          length,
          reveal,
          startOffset: cardIndex * 14,
          distance: clamp(86 + Math.abs(dy) * 0.06, 86, 124),
        });
      });
      groupGeometry[index] = { nodeOffset: anchors[index] - timelineDocumentTop - Math.max(0, anchors[0] - timelineDocumentTop - 72), branches };
    });

    const tailLength = Math.max(96, Math.min(160, window.innerHeight * 0.16));
    const start = Math.max(0, anchors[0] - timelineDocumentTop - 72);
    const finalAnchor = anchors[anchors.length - 1] - timelineDocumentTop;
    // The final tail follows the complete last year group, including its
    // upcoming event, instead of ending a fixed distance below the year dot.
    // This keeps the line attached to real content as the group reflows.
    const finalGroupBounds = groups[groups.length - 1].getBoundingClientRect();
    const finalGroupBottom = finalGroupBounds.bottom + window.scrollY;
    const end = finalGroupBottom + tailLength;
    timeline.style.setProperty('--timeline-axis-start', `${start}px`);
    timeline.style.setProperty('--timeline-axis-end', `${end}px`);
    timeline.style.setProperty('--timeline-tail-start', `${finalAnchor}px`);
    state.anchors = anchors;
    state.lineStart = timelineDocumentTop + start;
    state.lineEnd = end;
    state.finalNodeOffset = finalAnchor - start;
    state.nodeProgress = anchors.map((anchor) => clamp((anchor - state.lineStart) / Math.max(1, state.lineEnd - state.lineStart), 0, 1));
    state.groups = groupGeometry.filter(Boolean);
    state.geometryReady = true;
    state.initialized = true;
    scheduleRender();
  };

  const onScroll = () => {
    scheduleRender();
  };

  let measureFrame = 0;
  const scheduleMeasure = () => {
    if (measureFrame) return;
    measureFrame = window.requestAnimationFrame(() => {
      measureFrame = 0;
      measureGeometry();
    });
  };
  const resizeObserver = 'ResizeObserver' in window ? new ResizeObserver(scheduleMeasure) : null;
  if (resizeObserver) resizeObserver.observe(timeline);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', scheduleMeasure, { passive: true });
  window.addEventListener('load', measureGeometry, { once: true });
  measureGeometry();
  if (document.fonts?.ready) document.fonts.ready.then(measureGeometry);
  window.addEventListener('pagehide', () => {
    if (cardFrame) cancelAnimationFrame(cardFrame);
    if (measureFrame) cancelAnimationFrame(measureFrame);
    resizeObserver?.disconnect();
    cardCleanup.forEach((cleanup) => cleanup());
  }, { once: true });
})();
