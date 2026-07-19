/**
 * Split-text hero enhancement (vanilla port of React Bits <SplitText />).
 *
 * Static HTML site — no React mount. Manually wraps chars/words in spans
 * (GSAP Club SplitText is not used) and animates with free gsap.fromTo.
 *
 * Targets: .hero h1, .page-hero h1
 * Preserves nested markup (<em>, .gold, .fs-outline, etc.) so yellow lines
 * like home "Central Africa" keep their color while chars animate inside.
 *
 * Listens for lake-i18n-applied and re-splits after language changes.
 */
(function () {
  'use strict';

  var SELECTOR = '.hero h1, .page-hero h1';
  var CHAR_LIMIT_FOR_WORDS = 36;

  var DEFAULTS = {
    delay: 55,
    duration: 0.7,
    ease: 'power3.out',
    splitType: 'chars',
    from: { opacity: 0, y: 40 },
    to: { opacity: 1, y: 0 },
    threshold: 0.1,
    rootMargin: '0px 0px -8% 0px',
    textAlign: 'left'
  };

  var reducedMotion =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var gsapReady = null;
  var instances = [];

  function scriptBase() {
    var scripts = document.getElementsByTagName('script');
    for (var i = scripts.length - 1; i >= 0; i--) {
      var src = scripts[i].src || '';
      if (/split-text\.js/i.test(src)) {
        return src.replace(/[^/]+$/, '');
      }
    }
    return 'assets/';
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var existing = document.querySelector('script[src="' + src + '"]');
      if (existing) {
        if (existing.dataset.loaded === '1' || (src.indexOf('gsap') !== -1 && window.gsap)) {
          resolve();
          return;
        }
        existing.addEventListener('load', function () {
          resolve();
        });
        existing.addEventListener('error', reject);
        return;
      }
      var s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = function () {
        s.dataset.loaded = '1';
        resolve();
      };
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function ensureGsap() {
    if (window.gsap) {
      if (window.ScrollTrigger) window.gsap.registerPlugin(window.ScrollTrigger);
      return Promise.resolve(window.gsap);
    }
    if (gsapReady) return gsapReady;
    var base = scriptBase().replace(/components\/?$/, '');
    // Prefer vendored copies next to this script's assets root.
    var root = /\/assets\/?$/.test(base) ? base : 'assets/';
    gsapReady = loadScript(root + 'vendor/gsap/gsap.min.js')
      .then(function () {
        return loadScript(root + 'vendor/gsap/ScrollTrigger.min.js');
      })
      .then(function () {
        if (!window.gsap) throw new Error('GSAP failed to load');
        if (window.ScrollTrigger) window.gsap.registerPlugin(window.ScrollTrigger);
        return window.gsap;
      });
    return gsapReady;
  }

  function plainTextLength(el) {
    return (el.textContent || '').replace(/\s+/g, ' ').trim().length;
  }

  function resolveSplitType(el, preferred) {
    if (preferred && preferred !== 'auto') return preferred;
    return plainTextLength(el) > CHAR_LIMIT_FOR_WORDS ? 'words' : 'chars';
  }

  function wrapCharsInText(text, className) {
    var frag = document.createDocumentFragment();
    var chars = Array.from(text);
    for (var i = 0; i < chars.length; i++) {
      var ch = chars[i];
      if (ch === ' ') {
        frag.appendChild(document.createTextNode(' '));
        continue;
      }
      var span = document.createElement('span');
      span.className = className;
      span.setAttribute('aria-hidden', 'true');
      span.textContent = ch;
      frag.appendChild(span);
    }
    return frag;
  }

  function wrapWordsInText(text, className) {
    var frag = document.createDocumentFragment();
    var parts = text.split(/(\s+)/);
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i];
      if (!part) continue;
      if (/^\s+$/.test(part)) {
        frag.appendChild(document.createTextNode(part));
        continue;
      }
      var span = document.createElement('span');
      span.className = className;
      span.setAttribute('aria-hidden', 'true');
      span.textContent = part;
      frag.appendChild(span);
    }
    return frag;
  }

  function splitNodeContents(node, mode, className) {
    var children = Array.prototype.slice.call(node.childNodes);
    for (var i = 0; i < children.length; i++) {
      var child = children[i];
      if (child.nodeType === 3) {
        var text = child.textContent;
        if (!text) continue;
        var frag =
          mode === 'words' ? wrapWordsInText(text, className) : wrapCharsInText(text, className);
        node.replaceChild(frag, child);
      } else if (child.nodeType === 1) {
        var tag = child.tagName.toLowerCase();
        if (tag === 'br') continue;
        // Keep colored wrappers (em / .gold / .fs-outline); split inside them.
        splitNodeContents(child, mode, className);
      }
    }
  }

  function collectTargets(el, className) {
    return Array.prototype.slice.call(el.querySelectorAll('.' + className));
  }

  function storeOriginal(el) {
    if (!el.dataset.splitOriginal) {
      el.dataset.splitOriginal = el.innerHTML;
    }
  }

  function revert(el) {
    if (el._splitTextTween) {
      try {
        el._splitTextTween.kill();
      } catch (_) {
        /* noop */
      }
      el._splitTextTween = null;
    }
    if (el._splitTextObserver) {
      try {
        el._splitTextObserver.disconnect();
      } catch (_) {
        /* noop */
      }
      el._splitTextObserver = null;
    }
    if (el.dataset.splitOriginal != null) {
      el.innerHTML = el.dataset.splitOriginal;
    }
    el.classList.remove('split-text', 'split-text--ready', 'split-text--done');
    el.removeAttribute('aria-label');
    delete el.dataset.splitEnhanced;
  }

  function waitForFonts() {
    if (!document.fonts || !document.fonts.ready) return Promise.resolve();
    if (document.fonts.status === 'loaded') return Promise.resolve();
    return document.fonts.ready.then(function () {}, function () {});
  }

  function animateTargets(gsap, el, targets, opts, onComplete) {
    gsap.set(targets, Object.assign({ force3D: true }, opts.from));
    el.classList.add('split-text--ready');
    var tween = gsap.fromTo(
      targets,
      Object.assign({}, opts.from),
      Object.assign({}, opts.to, {
        duration: opts.duration,
        ease: opts.ease,
        stagger: opts.delay / 1000,
        force3D: true,
        onComplete: function () {
          el.classList.add('split-text--done');
          if (typeof onComplete === 'function') onComplete();
        }
      })
    );
    el._splitTextTween = tween;
    return tween;
  }

  function enhanceOne(gsap, el, options) {
    if (!el || el.dataset.splitEnhanced === '1') return null;
    if (!el.textContent || !el.textContent.trim()) return null;

    storeOriginal(el);
    var opts = Object.assign({}, DEFAULTS, options || {});
    var mode = resolveSplitType(el, opts.splitType);
    var className = mode === 'words' ? 'split-word' : 'split-char';

    var label = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (label) el.setAttribute('aria-label', label);

    el.classList.add('split-text');
    el.style.textAlign = opts.textAlign || 'left';
    el.dataset.splitEnhanced = '1';
    el.dataset.splitMode = mode;

    // Rebuild from stored original so i18n re-runs stay clean.
    el.innerHTML = el.dataset.splitOriginal;
    splitNodeContents(el, mode, className);

    var targets = collectTargets(el, className);
    if (!targets.length) {
      el.classList.add('split-text--ready', 'split-text--done');
      return { el: el, revert: function () { revert(el); } };
    }

    if (reducedMotion) {
      gsap.set(targets, { opacity: 1, y: 0, clearProps: 'willChange' });
      el.classList.add('split-text--ready', 'split-text--done');
      return { el: el, revert: function () { revert(el); } };
    }

    var startAnim = function () {
      if (el._splitTextPlayed) return;
      el._splitTextPlayed = true;
      animateTargets(gsap, el, targets, opts);
    };

    // Above-fold heroes: play once fonts are ready (home hero is in view).
    var rect = el.getBoundingClientRect();
    var inView = rect.top < window.innerHeight * 0.92 && rect.bottom > 0;

    if (inView || !('IntersectionObserver' in window)) {
      startAnim();
    } else {
      var io = new IntersectionObserver(
        function (entries) {
          if (entries[0] && entries[0].isIntersecting) {
            io.disconnect();
            el._splitTextObserver = null;
            startAnim();
          }
        },
        { threshold: opts.threshold, rootMargin: opts.rootMargin }
      );
      el._splitTextObserver = io;
      io.observe(el.closest('.hero, .page-hero') || el);
    }

    return {
      el: el,
      revert: function () {
        revert(el);
      }
    };
  }

  function destroyAll() {
    while (instances.length) {
      var inst = instances.pop();
      try {
        inst.revert();
      } catch (_) {
        /* noop */
      }
    }
    document.querySelectorAll(SELECTOR).forEach(function (el) {
      if (el.dataset.splitEnhanced === '1' || el.dataset.splitOriginal != null) {
        revert(el);
      }
    });
  }

  function killTween(el) {
    if (el._splitTextTween) {
      try {
        el._splitTextTween.kill();
      } catch (_) {
        /* noop */
      }
      el._splitTextTween = null;
    }
    if (el._splitTextObserver) {
      try {
        el._splitTextObserver.disconnect();
      } catch (_) {
        /* noop */
      }
      el._splitTextObserver = null;
    }
  }

  function resetForReboot(el) {
    killTween(el);
    el.classList.remove('split-text', 'split-text--ready', 'split-text--done');
    el.removeAttribute('aria-label');
    el._splitTextPlayed = false;
    delete el.dataset.splitEnhanced;
    delete el.dataset.splitMode;
    // data-i18n heroes: lake-i18n-applied already wrote clean translated HTML
    // (including <em> yellow line). Do not restore the previous-language snapshot.
    if (el.hasAttribute('data-i18n')) {
      delete el.dataset.splitOriginal;
      return;
    }
    // Non-i18n heroes still contain char/word spans — restore plain markup.
    if (el.dataset.splitOriginal != null) {
      el.innerHTML = el.dataset.splitOriginal;
      delete el.dataset.splitOriginal;
    }
  }

  function enhanceAll(options) {
    return ensureGsap().then(function (gsap) {
      return waitForFonts().then(function () {
        document.querySelectorAll(SELECTOR).forEach(function (el) {
          var inst = enhanceOne(gsap, el, options);
          if (inst) instances.push(inst);
        });
        return instances;
      });
    });
  }

  var bootedOnce = false;
  var bootTimer = null;

  function revealUnenhanced() {
    document.querySelectorAll(SELECTOR).forEach(function (el) {
      el.classList.add('split-text--ready', 'split-text--done');
    });
  }

  function boot() {
    if (bootTimer) {
      clearTimeout(bootTimer);
      bootTimer = null;
    }
    instances.length = 0;
    document.querySelectorAll(SELECTOR).forEach(resetForReboot);
    bootedOnce = true;
    enhanceAll().catch(function (err) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('[split-text]', err);
      }
      revealUnenhanced();
    });
  }

  // Prefer running after i18n so hero.title HTML (with <em>) is final.
  document.addEventListener('lake-i18n-applied', function () {
    requestAnimationFrame(function () {
      boot();
    });
  });

  function scheduleFallbackBoot() {
    // If i18n is on the page, wait briefly for lake-i18n-applied; else boot now.
    var hasI18n = !!(window.LakeI18n || document.querySelector('script[src*="i18n.js"]'));
    if (!hasI18n) {
      boot();
      return;
    }
    bootTimer = setTimeout(function () {
      if (!bootedOnce) boot();
    }, 400);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleFallbackBoot);
  } else {
    scheduleFallbackBoot();
  }

  window.LakeSplitText = {
    enhance: function (options) {
      instances.length = 0;
      document.querySelectorAll(SELECTOR).forEach(resetForReboot);
      return enhanceAll(options);
    },
    destroy: destroyAll,
    defaults: DEFAULTS
  };
})();
