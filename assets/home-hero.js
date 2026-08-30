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
  var mobileSelector = root.querySelector("[data-hero-mobile-indicator]");
  var mobileLabel = mobileSelector ? mobileSelector.querySelector("[data-hero-mobile-sector-label]") : null;
  var mobileProgress = mobileSelector ? mobileSelector.querySelector(".hero-mobile-sector-progress") : null;
  var DURATION = 7000;
  var TRANSITION_DURATION = 900;
  var index = 0;
  var timer = null;
  var paused = false;
  var transitionTimer = null;
  var preloaded = {};

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

  function preloadNext(i) {
    var nextIndex = (i + 1) % slides.length;
    if (preloaded[nextIndex]) return;
    var image = slides[nextIndex].querySelector("img");
    if (!image) return;
    var preload = new Image();
    preload.decoding = "async";
    preload.src = image.currentSrc || image.src;
    preloaded[nextIndex] = preload;
  }

  function setActive(i, shouldTransition) {
    slides.forEach(function (s, n) {
      s.classList.toggle("is-active", n === i);
    });
    preloadNext(i);
    if (shouldTransition !== false) {
      root.classList.add("hero--transitioning");
      if (transitionTimer !== null) clearTimeout(transitionTimer);
      transitionTimer = setTimeout(function () {
        root.classList.remove("hero--transitioning");
        transitionTimer = null;
      }, TRANSITION_DURATION);
    }
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
    if (mobileLabel && tabs[i]) {
      mobileLabel.textContent = (tabs[i].children[1] || tabs[i]).textContent.trim();
      mobileLabel.classList.remove("is-updating");
      void mobileLabel.offsetWidth;
      mobileLabel.classList.add("is-updating");
    }
    if (mobileProgress) {
      mobileProgress.classList.remove("is-running");
      void mobileProgress.offsetWidth;
      mobileProgress.classList.add("is-running");
    }
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

  setActive(0, false);
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

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stop();
    else schedule();
  });

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

  var DURATION_MS = 1600;
  var reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var animationFrame = null;
  var state = "idle";
  var observer = null;
  var safetyTimer = null;

  function finalText(el) {
    return (el.getAttribute("data-count-end") || el.textContent || "").trim();
  }

  function renderFinalValues() {
    nums.forEach(function (el) {
      var info = parseValue(finalText(el));
      el.textContent = formatWithCommas(info.end) + info.suffix;
    });
  }

  function renderStartValues() {
    nums.forEach(function (el) {
      el.textContent = "0";
    });
  }

  function heroIsVisible() {
    var rect = keyfacts.getBoundingClientRect();
    return rect.bottom > 0 && rect.top < (window.innerHeight || document.documentElement.clientHeight);
  }

  function animate() {
    if (state !== "idle") return;
    var infos = [];
    nums.forEach(function (el) {
      var raw = finalText(el);
      var info = parseValue(raw);
      info.el = el;
      infos.push(info);
    });

    if (animationFrame !== null) cancelAnimationFrame(animationFrame);
    if (safetyTimer !== null) { clearTimeout(safetyTimer); safetyTimer = null; }
    if (reducedMotion) {
      renderFinalValues();
      state = "completed";
      return;
    }

    state = "running";
    if (observer) { observer.disconnect(); observer = null; }
    var start = null;

    function tick(now) {
      if (start === null) start = now;
      var allDone = true;
      infos.forEach(function (info) {
        var elapsed = now - start;
        var t = Math.min(1, elapsed / DURATION_MS);
        var current = Math.round(easeOutCubic(t) * info.end);
        info.el.textContent = current === 0 ? "0" : formatWithCommas(current) + info.suffix;
        if (t < 1) allDone = false;
      });
      if (!allDone) animationFrame = requestAnimationFrame(tick);
      else {
        animationFrame = null;
        renderFinalValues();
        state = "completed";
      }
    }
    animationFrame = requestAnimationFrame(tick);
  }

  /* Store final values from the static markup as animation targets. */
  nums.forEach(function (el) {
    el.setAttribute("data-count-end", finalText(el));
  });

  /* ---- IntersectionObserver: fires animation when hero scrolls into view ---- */
  function setupIntersectionObserver() {
    if (state !== "idle" || observer) return;
    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver(function (entries) {
        if (entries.some(function (entry) { return entry.isIntersecting; })) {
          animate();
        }
      }, { threshold: 0.1 });
      observer.observe(keyfacts);
    }
  }

  /* ---- Core: check visibility and either animate or observe ---- */
  function beginWhenVisible() {
    if (state !== "idle") return;
    if (heroIsVisible()) {
      animate();
    } else {
      setupIntersectionObserver();
    }
  }

  /* ---- Loader-aware startup ---- */
  function beginAfterLoader() {
    /* If loader is already gone, wait one rAF for the browser to paint
       the revealed state, then start. Also set up the intersection
       observer as a backup in case the hero is off-screen. */
    if (!document.documentElement.classList.contains("lg-loading")) {
      setupIntersectionObserver();
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          beginWhenVisible();
        });
      });
      return;
    }

    /* Loader is still active. Watch for its removal. */
    var loaderObserver = new MutationObserver(function () {
      if (!document.documentElement.classList.contains("lg-loading")) {
        loaderObserver.disconnect();
        /* The skeleton overlay fades out over ~400 ms after lg-loading
           is removed.  Wait for the overlay DOM element to actually
           disappear so the animation starts after the hero is visible. */
        waitForOverlayGone();
      }
    });
    loaderObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  }

  /* Poll for the skeleton overlay element to be removed from the DOM
     (it fades for 380 ms, then the skeleton JS removes it). */
  function waitForOverlayGone() {
    var overlay = document.querySelector("[data-lg-skeleton-overlay]");
    if (!overlay) {
      onLoaderFullyGone();
      return;
    }
    var goneObserver = new MutationObserver(function () {
      if (!document.querySelector("[data-lg-skeleton-overlay]")) {
        goneObserver.disconnect();
        onLoaderFullyGone();
      }
    });
    goneObserver.observe(overlay.parentNode || document.documentElement, { childList: true });
    /* Safety: don't wait forever — if the overlay lingers for any reason,
       start after 600 ms anyway. */
    setTimeout(function () {
      goneObserver.disconnect();
      onLoaderFullyGone();
    }, 600);
  }

  function onLoaderFullyGone() {
    if (state !== "idle") return;
    /* Set up the intersection observer unconditionally so a scroll
       can still trigger the animation if the hero is off-screen. */
    setupIntersectionObserver();
    /* One rAF to let the browser paint the revealed state before we
       measure heroIsVisible(). */
    requestAnimationFrame(function () {
      beginWhenVisible();
    });
    /* Final safety: if neither the visibility check nor the observer
       has started the animation within 2 s, force it. */
    safetyTimer = setTimeout(function () {
      if (state === "idle") {
        safetyTimer = null;
        animate();
      }
    }, 2000);
  }

  if (reducedMotion) {
    renderFinalValues();
    state = "completed";
  } else {
    renderStartValues();
    beginAfterLoader();
  }

  window.addEventListener("pageshow", function (event) {
    if (event.persisted) {
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
      if (observer) observer.disconnect();
      if (safetyTimer !== null) clearTimeout(safetyTimer);
      animationFrame = null;
      safetyTimer = null;
      observer = null;
      renderFinalValues();
      state = "completed";
    }
  });

  /* Metrics hydrate after this deferred script. Update the final target
     without replaying a completed counter for every data refresh. */
  document.addEventListener("lake:metric-updated", function (event) {
    if (!event.detail || !event.detail.key) return;
    nums.forEach(function (el) {
      if (el.getAttribute("data-metric-key") === event.detail.key) {
        el.setAttribute("data-count-end", el.textContent.trim());
      }
    });
    if (state === "idle" && !reducedMotion) {
      renderStartValues();
    } else if (state === "completed") {
      renderFinalValues();
    }
  });
})();
