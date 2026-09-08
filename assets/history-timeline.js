(() => {
  const timeline = document.querySelector('[data-history-timeline]');
  if (!timeline) return;

  const groups = [...timeline.querySelectorAll('.history-year-group')];
  if (!groups.length) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const focusRatio = 0.42;
  let frame = 0;

  groups.forEach((group) => {
    if (group.querySelector('.history-node')) return;
    const node = document.createElement('span');
    node.className = 'history-node';
    node.setAttribute('aria-hidden', 'true');
    group.prepend(node);
  });

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  const update = () => {
    frame = 0;
    const bounds = timeline.getBoundingClientRect();
    const viewportLine = window.innerHeight * focusRatio;
    const anchors = groups.map((group) => {
      const groupBounds = group.getBoundingClientRect();
      const yearBounds = group.querySelector('.history-year').getBoundingClientRect();
      const anchor = yearBounds.top + yearBounds.height / 2;
      group.style.setProperty('--history-node-y', `${anchor - groupBounds.top}px`);
      return anchor;
    });

    const start = anchors[0] - bounds.top;
    const end = anchors[anchors.length - 1] - bounds.top;
    timeline.style.setProperty('--timeline-axis-start', `${start}px`);
    timeline.style.setProperty('--timeline-axis-end', `${end}px`);
    timeline.style.setProperty('--timeline-progress', clamp((viewportLine - (bounds.top + start)) / Math.max(1, end - start), 0, 1).toFixed(4));

    let activeIndex = anchors.findIndex((anchor) => anchor >= viewportLine);
    if (activeIndex === -1) activeIndex = anchors.length - 1;
    if (activeIndex > 0 && viewportLine - anchors[activeIndex - 1] < anchors[activeIndex] - viewportLine) activeIndex -= 1;

    groups.forEach((group, index) => {
      const groupBounds = group.getBoundingClientRect();
      if (reduceMotion || (groupBounds.top < window.innerHeight * 0.92 && groupBounds.bottom > 0)) {
        group.classList.add('is-visible');
      }
      group.classList.toggle('is-active', index === activeIndex);
    });
  };

  const onScroll = () => {
    if (frame) return;
    frame = window.requestAnimationFrame(update);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  update();
})();
