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
    lineEnd: 0,
    nodeProgress: [],
    targetProgress: 0,
    renderedProgress: 0,
    activeIndex: -1,
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

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  const readTargetProgress = () => {
    if (!state.geometryReady) return 0;
    const viewportLine = window.scrollY + window.innerHeight * focusRatio;
    const firstAnchor = state.anchors[0];
    return clamp((viewportLine - firstAnchor) / Math.max(1, state.lineEnd - firstAnchor), 0, 1);
  };

  const getActiveIndex = (progress) => {
    let activeIndex = 0;
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

    const tail = Math.max(72, Math.min(120, window.innerHeight * 0.12));
    const start = anchors[0] - timelineDocumentTop;
    const end = anchors[anchors.length - 1] + tail - timelineDocumentTop;
    timeline.style.setProperty('--timeline-axis-start', `${start}px`);
    timeline.style.setProperty('--timeline-axis-end', `${end}px`);
    state.anchors = anchors;
    state.lineEnd = anchors[anchors.length - 1] + tail;
    state.nodeProgress = anchors.map((anchor) => clamp((anchor - anchors[0]) / Math.max(1, state.lineEnd - anchors[0]), 0, 1));
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
