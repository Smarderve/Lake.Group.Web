(() => {
  const timeline = document.querySelector('[data-history-timeline]');
  if (!timeline) return;

  const groups = [...timeline.querySelectorAll('.history-year-group')];
  if (!groups.length) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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

    const tailLength = Math.max(96, Math.min(160, window.innerHeight * 0.16));
    const start = Math.max(0, anchors[0] - timelineDocumentTop - 72);
    const finalAnchor = anchors[anchors.length - 1] - timelineDocumentTop;
    const end = anchors[anchors.length - 1] + tailLength - timelineDocumentTop;
    timeline.style.setProperty('--timeline-axis-start', `${start}px`);
    timeline.style.setProperty('--timeline-axis-end', `${end}px`);
    timeline.style.setProperty('--timeline-tail-start', `${finalAnchor}px`);
    state.anchors = anchors;
    state.lineStart = timelineDocumentTop + start;
    state.lineEnd = anchors[anchors.length - 1] + tailLength;
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
})();
