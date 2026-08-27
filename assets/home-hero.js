

/* ── Stat count-up animation ─────────────────────────────────── */
(function () {
  "use strict";

  var keyfacts = document.querySelector(".hero-keyfacts");
  if (!keyfacts) return;

  var nums = keyfacts.querySelectorAll(".hero-kf-num");
  if (!nums.length) return;

  /* Skip animation for users who prefer reduced motion. */
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  /* Parse "30,000+" -> { end: 30000, suffix: "+" }  or "152" -> { end: 152, suffix: "" } */
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

  /* easeOutCubic for a crisp deceleration at the end */
  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  var DURATION_MS = 2200;
  var started = false;

  function animate() {
    if (started) return;
    started = true;

    var infos = [];
    nums.forEach(function (el) {
      var raw = el.getAttribute("data-count-end") || el.textContent;
      var info = parseValue(raw);
      info.el = el;
      info.start = performance.now();
      infos.push(info);
    });

    function tick(now) {
      var allDone = true;
      infos.forEach(function (info) {
        var elapsed = now - info.start;
        var t = Math.min(1, elapsed / DURATION_MS);
        var current = Math.round(easeOutCubic(t) * info.end);
        info.el.textContent = formatWithCommas(current) + info.suffix;
        if (t < 1) allDone = false;
      });
      if (!allDone) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* Stash final values so a mid-animation i18n refresh doesn't break things */
  nums.forEach(function (el) {
    el.setAttribute("data-count-end", el.textContent.trim());
  });

  /* Trigger when the statistics scroll into view */
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) {
        io.disconnect();
        animate();
      }
    }, { threshold: 0.3 });
    io.observe(keyfacts);
  } else {
    animate();
  }
})();
