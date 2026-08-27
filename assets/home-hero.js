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

  // Per-slide subtitles. The canonical texts live in the i18n dictionary
  // (hero.slide1 .. hero.slide5, one entry per language) so a translation
  // survives every carousel rotation and never reverts to the previous
  // language's text. This array is only the English fallback for pages
  // where assets/i18n.js has not run.
  var slideTexts = [
    "Fueling East Africa for two decades",
    "Manufacturing the Foundations of Progress.",
    "Shaping the Future of Mobility Through Automotive Excellence.",
    "Building Strategic Commercial Hubs Across the Region.",
    "Advancing Agriculture and Agro-Processing Across East Africa.",
    "Dar es Salaam: East Africa's Gateway to Global Trade."
  ];

  function slideTextFor(i) {
    var t = window.LakeI18n && window.LakeI18n.t ? window.LakeI18n.t('hero.slide' + (i + 1)) : null;
    return t != null && t !== '' ? t : (slideTexts[i] || slideTexts[0]);
  }

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
        subtitle.textContent = slideTextFor(i);
        subtitle.classList.remove("hero-sub-exit");
        void subtitle.offsetWidth;
        subtitle.classList.add("hero-sub-slide");
      }, 250);
    }
  }

  function stop() {
    if (timer !== null) { clearTimeout(timer); timer = null; }
  }

  /* One authoritative tick per active slide. Every transition schedules the
     next one after it has completed, so no external event can leave autoplay
     without a future tick or create competing timers. */
  function schedule() {
    stop();
    if (!paused) {
      timer = setTimeout(function advance() {
        timer = null;
        if (paused) return;
        index = (index + 1) % slides.length;
        setActive(index);
        schedule();
      }, DURATION);
    }
  }

  setActive(0);
  schedule();

  /* Tab click: jump to slide */
  tabs.forEach(function (tab, n) {
    tab.addEventListener("click", function () {
      index = n;
      setActive(index);
      schedule();
    });
  });

  /* Pause on touch (mobile) */
  root.addEventListener("touchstart", function () { paused = true; stop(); }, { passive: true });
  root.addEventListener("touchend", function () { paused = false; schedule(); }, { passive: true });
  root.addEventListener("touchcancel", function () { paused = false; schedule(); }, { passive: true });

  /* When the visitor switches language (or i18n first applies), re-render the
     subtitle for the current slide so it never keeps stale text from a
     previous language. */
  document.addEventListener("lake-i18n-applied", function () {
    if (subtitle) {
      subtitle.textContent = slideTextFor(index);
    }
  });
})();
/* Stat count-up animation */
(function () {
  "use strict";

  var keyfacts = document.querySelector(".hero-keyfacts");
  if (!keyfacts) return;

  var nums = keyfacts.querySelectorAll(".hero-kf-num");
  if (!nums.length) return;

  function parseValue(raw) {
    var trimmed = raw.trim();
    var suffix = "";
    if (trimmed.charAt(trimmed.length - 1) === "+") {
      suffix = "+";
      trimmed = trimmed.slice(0, -1);
    }
    return { end: parseInt(trimmed.replace(/,/g, ""), 10) || 0, suffix: suffix };
  }

  function formatWithCommas(n) {
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  var DURATION_MS = 2200;
  var reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var animationFrame = null;
  var isAnimating = false;

  function animate() {
    var infos = [];
    nums.forEach(function (el) {
      var raw = el.getAttribute("data-count-end") || el.textContent;
      var info = parseValue(raw);
      info.el = el;
      infos.push(info);
    });

    if (animationFrame !== null) cancelAnimationFrame(animationFrame);
    if (reducedMotion) {
      infos.forEach(function (info) {
        info.el.textContent = formatWithCommas(info.end) + info.suffix;
      });
      return;
    }

    isAnimating = true;
    var start = performance.now();
    infos.forEach(function (info) { info.start = start; });

    function tick(now) {
      var allDone = true;
      infos.forEach(function (info) {
        var elapsed = now - info.start;
        var t = Math.min(1, elapsed / DURATION_MS);
        var current = Math.round(easeOutCubic(t) * info.end);
        info.el.textContent = formatWithCommas(current) + info.suffix;
        if (t < 1) allDone = false;
      });
      if (!allDone) animationFrame = requestAnimationFrame(tick);
      else {
        animationFrame = null;
        isAnimating = false;
      }
    }
    animationFrame = requestAnimationFrame(tick);
  }

  nums.forEach(function (el) {
    el.setAttribute("data-count-end", el.textContent.trim());
  });

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) {
        animate();
      }
    }, { threshold: 0.1 });
    io.observe(keyfacts);
  } else {
    animate();
  }

  /* Metrics hydrate after this deferred script. Retarget and replay once the
     published value arrives, while ignoring our own animation writes. */
  document.addEventListener("lake:metric-updated", function (event) {
    if (isAnimating || !event.detail || !event.detail.key) return;
    nums.forEach(function (el) {
      if (el.getAttribute("data-metric-key") === event.detail.key) {
        el.setAttribute("data-count-end", el.textContent.trim());
      }
    });
    animate();
  });
})();
