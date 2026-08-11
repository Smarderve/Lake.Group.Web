/* Hero: full-viewport background slideshow with slow zoom,
   "turn out" content, tab indicators, and per-slide subtitles.
   Reduced-motion users get the static first slide. */
(function () {
  "use strict";
  var root = document.querySelector(".hero[data-hero-carousel]");
  if (!root) return;
  var slides = root.querySelectorAll(".hero-slide");
  if (slides.length < 2) return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var content = document.querySelector(".hero-content");
  var subtitle = content ? content.querySelector(".hero-sub") : null;
  var tabs = root.querySelectorAll(".hero-tab");
  var DURATION = 8000;
  var index = 0;
  var timer = null;
  var paused = false;
  var inView = true;

  var slideTexts = [
    "Fueling East Africa's growth from refinery to roadside.",
    "Clean LPG energy for homes and industries across the region.",
    "World-class terminal infrastructure on the Indian Ocean coast.",
    "Connecting East Africa to global trade through Dar es Salaam.",
    "1,200+ trucks keeping supply chains moving daily."
  ];

  function setActive(i) {
    slides.forEach(function (s, n) {
      s.classList.toggle("is-active", n === i);
    });
    tabs.forEach(function (t, n) {
      t.classList.toggle("is-active", n === i);
      t.setAttribute("aria-selected", n === i ? "true" : "false");
      var fill = t.querySelector(".hero-tab-fill");
      if (fill) {
        fill.classList.remove("is-running");
        void fill.offsetWidth;
        if (n === i) {
          fill.classList.add("is-running");
        }
      }
    });
    if (subtitle) {
      subtitle.classList.remove("hero-sub-slide");
      subtitle.classList.add("hero-sub-exit");
      setTimeout(function () {
        subtitle.textContent = slideTexts[i] || slideTexts[0];
        subtitle.classList.remove("hero-sub-exit");
        void subtitle.offsetWidth;
        subtitle.classList.add("hero-sub-slide");
      }, 250);
    }
  }

  function stop() {
    if (timer) { clearInterval(timer); timer = null; }
  }

  function start() {
    stop();
    if (!paused && inView && !document.hidden) {
      timer = setInterval(function () {
        index = (index + 1) % slides.length;
        setActive(index);
      }, DURATION);
    }
  }

  setActive(0);
  start();

  /* Tab click: jump to slide */
  tabs.forEach(function (tab, n) {
    tab.addEventListener("click", function () {
      index = n;
      setActive(index);
      start();
    });
  });

  /* Pause on touch (mobile) */
  root.addEventListener("touchstart", function () { paused = true; }, { passive: true });
  root.addEventListener("touchend", function () { paused = false; start(); }, { passive: true });

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      inView = entries[0].isIntersecting;
      start();
    }, { threshold: 0.05 });
    io.observe(root);
  }

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stop(); else start();
  });
})();
