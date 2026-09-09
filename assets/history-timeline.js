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
  const smoothing = reduceMotion ? 1 : 0.09;
  const state = {
    anchors: [],
    lineStart: 0,
    lineEnd: 0,
    finalNodeOffset: 0,
    nodeProgress: [],
    targetProgress: 0,
    renderedProgress: 0,
    activeIndex: null,
    frame: 0,
    geometryReady: false,
    initialized: false,
  };

  groups.forEach((group) => {
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
    const distance = state.targetProgress - state.renderedProgress;
    state.renderedProgress = reduceMotion || Math.abs(distance) < 0.0005
      ? state.targetProgress
      : state.renderedProgress + distance * smoothing;
    timeline.style.setProperty('--timeline-progress', state.renderedProgress.toFixed(5));
    const travelled = state.renderedProgress * Math.max(1, state.lineEnd - state.lineStart);
    timeline.style.setProperty('--timeline-line-height', `${Math.min(travelled, state.finalNodeOffset).toFixed(2)}px`);
    tail.style.setProperty('--timeline-tail-height', `${Math.max(0, travelled - state.finalNodeOffset).toFixed(2)}px`);
    applyGroupState(getActiveIndex(state.renderedProgress));

    if (!reduceMotion && Math.abs(state.targetProgress - state.renderedProgress) >= 0.0005) {
      state.frame = window.requestAnimationFrame(render);
    }
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
      if (cards.length > 1) {
        const spineX = Math.max(sx + 34, Math.min(...cards.map((card) => card.getBoundingClientRect().left - groupRect.left)) - 20);
        const ys = cards.map((card) => { const r = card.getBoundingClientRect(); return r.top + r.height / 2 - groupRect.top; });
        const spine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        spine.setAttribute('d', `M ${sx.toFixed(1)} ${sy.toFixed(1)} C ${(sx + 18).toFixed(1)} ${sy.toFixed(1)}, ${(spineX - 18).toFixed(1)} ${sy.toFixed(1)}, ${spineX.toFixed(1)} ${ys[0].toFixed(1)} M ${spineX.toFixed(1)} ${Math.min(...ys).toFixed(1)} C ${(spineX + 2).toFixed(1)} ${((Math.min(...ys)+Math.max(...ys))/2).toFixed(1)}, ${(spineX + 2).toFixed(1)} ${((Math.min(...ys)+Math.max(...ys))/2).toFixed(1)}, ${spineX.toFixed(1)} ${Math.max(...ys).toFixed(1)}`);
        spine.classList.add('history-branch', 'history-branch--primary');
        svg.append(spine);
      }
      cards.forEach((card, cardIndex) => {
        const cardRect = card.getBoundingClientRect();
        const ex = cardRect.left - groupRect.left;
        const ey = cardRect.top + cardRect.height / 2 - groupRect.top;
        const spineX = cards.length > 1 ? Math.max(sx + 34, Math.min(...cards.map((item) => item.getBoundingClientRect().left - groupRect.left)) - 20) : sx;
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const bend = Math.max(18, (ex - spineX) * .34);
        const twigBend = Math.max(24, (ex - spineX) * .34);
        const twigBow = Math.max(28, Math.min(64, Math.abs(ey - sy) * .22 + 28));
        path.setAttribute('d', cards.length > 1
          ? `M ${spineX.toFixed(1)} ${ey.toFixed(1)} C ${(spineX + twigBend * .42).toFixed(1)} ${(ey - twigBow).toFixed(1)}, ${(ex - twigBend * .42).toFixed(1)} ${(ey + twigBow).toFixed(1)}, ${ex.toFixed(1)} ${ey.toFixed(1)}`
          : `M ${sx.toFixed(1)} ${sy.toFixed(1)} C ${(sx + Math.max(28, (ex - sx) * .28)).toFixed(1)} ${(sy - twigBow).toFixed(1)}, ${(ex - Math.max(28, (ex - sx) * .28)).toFixed(1)} ${(ey + twigBow).toFixed(1)}, ${ex.toFixed(1)} ${ey.toFixed(1)}`);
        path.classList.add('history-branch', cards.length > 1 ? 'history-branch--twig' : 'history-branch--primary');
        path.style.setProperty('--branch-delay', `${cardIndex * 120}ms`);
        svg.append(path);
        requestAnimationFrame(() => path.style.setProperty('--branch-length', `${Math.ceil(path.getTotalLength())}`));
        const reveal = card.parentElement;
        if (reveal) reveal.style.setProperty('--branch-delay', `${cardIndex * 120 + 220}ms`);
      });
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
    state.geometryReady = true;
    state.targetProgress = readTargetProgress();
    if (!state.initialized) {
      state.renderedProgress = state.targetProgress;
      state.initialized = true;
    }
    scheduleRender();
  };

  const onScroll = () => {
    state.targetProgress = readTargetProgress();
    scheduleRender();
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', measureGeometry, { passive: true });
  window.addEventListener('load', measureGeometry, { once: true });
  measureGeometry();
  if (document.fonts?.ready) document.fonts.ready.then(measureGeometry);
  window.addEventListener('pagehide', () => {
    if (cardFrame) cancelAnimationFrame(cardFrame);
    cardCleanup.forEach((cleanup) => cleanup());
  }, { once: true });
})();
