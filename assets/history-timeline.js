(() => {
  const timeline = document.querySelector('[data-history-timeline]');
  if (!timeline) return;

  const groups = [...timeline.querySelectorAll('.history-year-group')];
  if (!groups.length) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const updateProgress = () => {
    const bounds = timeline.getBoundingClientRect();
    const viewportLine = window.innerHeight * 0.42;
    const progress = Math.max(0, Math.min(1, (viewportLine - bounds.top) / Math.max(1, bounds.height)));
    timeline.style.setProperty('--timeline-progress', progress.toFixed(4));

    let active = groups[0];
    groups.forEach((group) => {
      if (group.getBoundingClientRect().top <= viewportLine) active = group;
    });
    groups.forEach((group) => group.classList.toggle('is-active', group === active));
  };

  let frame = 0;
  const onScroll = () => {
    if (frame) return;
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      updateProgress();
    });
  };

  if (!reduceMotion && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => entry.target.classList.toggle('is-visible', entry.isIntersecting));
      updateProgress();
    }, { rootMargin: '-35% 0px -45% 0px', threshold: 0 });
    groups.forEach((group) => observer.observe(group));
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  updateProgress();
})();
