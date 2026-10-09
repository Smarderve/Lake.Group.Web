/* shared site behaviour */
(function () {
  'use strict';

  /* Public pages render from their local/static content sources during the
     current production phase. Do not hydrate or fetch snapshot/CMS content
     during the critical startup path. Snapshot-aware modules keep their
     existing static fallbacks when no delivery promise is present. */

  /* Iconify web component for footer / chrome icons — vendored locally
     (assets/vendor/iconify) so the site loads no third-party scripts;
     keeps the CSP script-src to 'self' (SECURITY_ROADMAP Phase 7). */
  (function ensureIconify() {
    if (typeof customElements !== 'undefined' && customElements.get('iconify-icon')) return;
    if (document.querySelector('script[data-lake-iconify]')) return;
    var s = document.createElement('script');
    s.src = 'assets/vendor/iconify/iconify-icon.min.js';
    s.async = true;
    s.setAttribute('data-lake-iconify', '1');
    document.head.appendChild(s);
  })();

  function isInViewport(el) {
    const r = el.getBoundingClientRect();
    return r.top < window.innerHeight && r.bottom > 0;
  }

  function formatCounterDisplay(n, prefix, suffix) {
    const grouped = Number(n).toLocaleString('en-US');
    const raw = (prefix || '') + grouped + (suffix || '');
    if (window.LakeI18n && typeof LakeI18n.formatNumberForLang === 'function') {
      return LakeI18n.formatNumberForLang(LakeI18n.current || 'en', raw);
    }
    return raw;
  }

  function paintCounter(el, value) {
    const suffix = el.dataset.suffix || '';
    const prefix = el.dataset.prefix || '';
    el.textContent = formatCounterDisplay(value, prefix, suffix);
  }

  function prefersReducedMotion() {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (_) {
      return false;
    }
  }

  function animateCounter(el) {
    if (el.dataset.animated === '1' || el.dataset.counting === '1') return;
    const target = parseInt(el.dataset.count, 10);
    if (isNaN(target)) return;

    if (prefersReducedMotion()) {
      paintCounter(el, target);
      el.dataset.animated = '1';
      return;
    }

    // Mark in-flight so lake-i18n-applied cannot snap to the final value mid-count.
    el.dataset.counting = '1';
    paintCounter(el, 0);

    const duration = 1200;
    const start = performance.now();
    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      paintCounter(el, Math.floor(ease * target));
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        paintCounter(el, target);
        el.dataset.counting = '0';
        el.dataset.animated = '1';
      }
    };
    requestAnimationFrame(step);
  }

  function setCounterFallback(el) {
    const target = parseInt(el.dataset.count, 10);
    if (isNaN(target)) return;
    paintCounter(el, target);
  }

  function refreshCountersForLang() {
    document.querySelectorAll('[data-count]').forEach((el) => {
      // Never interrupt an in-flight count-up (i18n apply is sync via microtask).
      if (el.dataset.counting === '1') return;
      const target = parseInt(el.dataset.count, 10);
      if (isNaN(target)) return;
      if (el.dataset.animated === '1') paintCounter(el, target);
      else paintCounter(el, 0);
    });
  }

  function initReveal() {
    const reveals = document.querySelectorAll('.reveal:not(.visible)');
    if (!reveals.length) return;

    reveals.forEach(el => {
      if (isInViewport(el)) el.classList.add('visible');
    });

    if (typeof IntersectionObserver === 'undefined') {
      reveals.forEach(el => el.classList.add('visible'));
      return;
    }

    const ro = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          ro.unobserve(e.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.reveal:not(.visible)').forEach(el => ro.observe(el));
  }

  function initCounters() {
    const counters = document.querySelectorAll('[data-count]');
    if (!counters.length) return;

    if (prefersReducedMotion()) {
      counters.forEach((el) => {
        setCounterFallback(el);
        el.dataset.animated = '1';
      });
      return;
    }

    // Start at 0 so the final markup value is not visible before/during fade-in.
    counters.forEach((el) => paintCounter(el, 0));

    function startCounter(el) {
      if (el.dataset.animated === '1' || el.dataset.counting === '1') return;
      // Hero stats use CSS lg-fade-up (delay ~0.22s + 0.45s). Counting while
      // opacity is 0 made the animation finish before the row was readable .
      // worse after taller Jost hero type. Wait for the entrance, then count.
      const heroDelay = el.closest('.hero-stats') ? 420 : 0;
      if (heroDelay) {
        window.setTimeout(() => animateCounter(el), heroDelay);
      } else {
        animateCounter(el);
      }
    }

    if (typeof IntersectionObserver === 'undefined') {
      counters.forEach(startCounter);
      return;
    }

    const co = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        co.unobserve(e.target);
        startCounter(e.target);
      });
    }, { threshold: 0.35, rootMargin: '0px 0px -6% 0px' });

    counters.forEach((el) => {
      // An above-the-fold counter must start on this navigation, rather than
      // waiting for a later observer delivery that can be skipped on cached
      // or restored pages.
      if (isInViewport(el)) {
        startCounter(el);
      } else {
        co.observe(el);
      }
    });

    // Safety: if IO never fires, still run the count (do not paint the final
    // value early . that was hiding the animation on slow scrolls).
    window.setTimeout(() => {
      counters.forEach((el) => {
        if (el.dataset.animated !== '1' && el.dataset.counting !== '1') {
          try { co.unobserve(el); } catch (_) { /* ignore */ }
          animateCounter(el);
        }
      });
    }, 6000);
  }

  // Desktop nav dropdowns + Subsidiaries mega-menu.
  // Panels open via `.is-open` (hover-intent on the trigger link) or CSS
  // `:focus-within` (keyboard). This layer syncs aria-expanded, adds open/
  // close delays, click-to-toggle (touch), Escape, ArrowDown into the panel,
  // and click-outside close. Mega-menu category tabs swap the logo grid with
  // a restartable translateY enter animation.
  function initMegaMenu() {
    const items = document.querySelectorAll('.nav-links > li.has-dropdown');
    if (!items.length) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    // Open only after the pointer has clearly committed to the trigger (not just
    // passing through the column or the padding around the label text).
    const OPEN_DELAY_MS = 400;
    const CLOSE_DELAY_MS = 350;

    function canHoverOpen() {
      return false;
    }

    function closeItem(item, focusTrigger, opts) {
      const options = opts || {};
      if (item._navOpenTimer) {
        clearTimeout(item._navOpenTimer);
        item._navOpenTimer = null;
      }
      if (item._navCloseTimer) {
        clearTimeout(item._navCloseTimer);
        item._navCloseTimer = null;
      }
      if (!item.classList.contains('is-open')) return;
      const menu = options.instant ? item.querySelector('.nav-dropdown') : null;
      // Snap shut when another parent is taking over so the old panel cannot
      // linger semi-transparent behind the new one during opacity transition.
      if (menu) menu.style.transition = 'none';
      item.classList.remove('is-open');
      if (menu) {
        void menu.offsetWidth;
        menu.style.transition = '';
      }
      const trigger = item.querySelector(':scope > a');
      if (trigger) {
        trigger.setAttribute('aria-expanded', 'false');
        if (focusTrigger) trigger.focus();
      }
    }

    function openItem(item) {
      if (item._navCloseTimer) {
        clearTimeout(item._navCloseTimer);
        item._navCloseTimer = null;
      }
      if (item._navOpenTimer) {
        clearTimeout(item._navOpenTimer);
        item._navOpenTimer = null;
      }
      closeAll(item, { instant: true });
      item.classList.add('is-open');
      const trigger = item.querySelector(':scope > a');
      if (trigger) trigger.setAttribute('aria-expanded', 'true');
    }

    function closeAll(except, opts) {
      items.forEach(item => { if (item !== except) closeItem(item, false, opts); });
    }

    function playPaneEnter(pane) {
      const grid = pane && pane.querySelector('.mm-companies');
      if (!grid) return;
      grid.classList.remove('is-entering');
      if (reduceMotion.matches) return;
      // Force restart so rapid category switches never stack mid-flight.
      void grid.offsetWidth;
      grid.classList.add('is-entering');
    }

    function selectCategory(menu, catId, opts) {
      const options = opts || {};
      const cats = menu.querySelectorAll('.mm-cat');
      const panes = menu.querySelectorAll('.mm-pane');
      if (!cats.length || !panes.length) return;

      let matched = false;
      cats.forEach(btn => {
        const on = btn.getAttribute('data-mm-cat') === catId;
        btn.classList.toggle('is-active', on);
        btn.setAttribute('aria-selected', String(on));
        btn.tabIndex = on ? 0 : -1;
        if (on) matched = true;
      });
      if (!matched && cats[0]) {
        selectCategory(menu, cats[0].getAttribute('data-mm-cat'), options);
        return;
      }

      panes.forEach(pane => {
        const on = pane.getAttribute('data-mm-pane') === catId;
        pane.classList.toggle('is-active', on);
        if (on) {
          pane.removeAttribute('hidden');
          if (options.animate !== false) playPaneEnter(pane);
          else {
            const grid = pane.querySelector('.mm-companies');
            if (grid) grid.classList.remove('is-entering');
          }
        } else {
          pane.setAttribute('hidden', '');
          const grid = pane.querySelector('.mm-companies');
          if (grid) grid.classList.remove('is-entering');
        }
      });
    }

    function initCategoryTabs(menu) {
      const cats = menu.querySelectorAll('.mm-cat');
      if (!cats.length) return;

      const active = menu.querySelector('.mm-cat.is-active') || cats[0];
      selectCategory(menu, active.getAttribute('data-mm-cat'), { animate: false });

      cats.forEach((btn, index) => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          selectCategory(menu, btn.getAttribute('data-mm-cat'), { animate: true });
        });

        btn.addEventListener('keydown', (e) => {
          let next = -1;
          if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = (index + 1) % cats.length;
          else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = (index - 1 + cats.length) % cats.length;
          else if (e.key === 'Home') next = 0;
          else if (e.key === 'End') next = cats.length - 1;
          else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            selectCategory(menu, btn.getAttribute('data-mm-cat'), { animate: true });
            return;
          } else {
            return;
          }
          e.preventDefault();
          const target = cats[next];
          selectCategory(menu, target.getAttribute('data-mm-cat'), { animate: true });
          target.focus();
        });
      });

      // Hover intent: swap pane while pointer moves across category blocks.
      cats.forEach(btn => {
        btn.addEventListener('mouseenter', () => {
          if (btn.classList.contains('is-active')) return;
          selectCategory(menu, btn.getAttribute('data-mm-cat'), { animate: true });
        });
      });
    }

    items.forEach(item => {
      const trigger = item.querySelector(':scope > a');
      const menu = item.querySelector('.nav-dropdown');
      if (!trigger || !menu) return;

      const isMega = item.classList.contains('has-megamenu');
      trigger.setAttribute('aria-haspopup', 'true');
      trigger.setAttribute('aria-expanded', 'false');
      if (isMega) initCategoryTabs(menu);

      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        if (item._navOpenTimer) {
          clearTimeout(item._navOpenTimer);
          item._navOpenTimer = null;
        }
        if (item._navCloseTimer) {
          clearTimeout(item._navCloseTimer);
          item._navCloseTimer = null;
        }
        const willOpen = !item.classList.contains('is-open');
        closeAll(item, { instant: true });
        item.classList.toggle('is-open', willOpen);
        trigger.setAttribute('aria-expanded', String(willOpen));
      });

      // Desktop hover-intent: open only when the pointer lingers on the
      // trigger link itself (tight hit box), not the full-height li.
      trigger.addEventListener('mouseenter', () => {
        if (!canHoverOpen()) return;
        if (item._navCloseTimer) {
          clearTimeout(item._navCloseTimer);
          item._navCloseTimer = null;
        }
        // Exclusive controller: close siblings immediately so rapid moves
        // (Network → Corporate) never leave two `.is-open` panels stacked.
        closeAll(item, { instant: true });
        if (item.classList.contains('is-open') || item._navOpenTimer) return;
        item._navOpenTimer = setTimeout(() => {
          item._navOpenTimer = null;
          openItem(item);
        }, OPEN_DELAY_MS);
      });
      trigger.addEventListener('mouseleave', (e) => {
        // Keep pending/open only when moving into the panel (or its bridge).
        if (e.relatedTarget && menu.contains(e.relatedTarget)) return;
        if (item._navOpenTimer) {
          clearTimeout(item._navOpenTimer);
          item._navOpenTimer = null;
        }
        // If the panel is already open and the cursor leaves the trigger
        // for an unknown target (not another nav item, not the panel),
        // start a brief close delay so the panel doesn't flap.
        if (item.classList.contains('is-open') &&
            e.relatedTarget &&
            !e.relatedTarget.closest('.nav-links')) {
          if (item._navCloseTimer) clearTimeout(item._navCloseTimer);
          item._navCloseTimer = setTimeout(() => {
            item._navCloseTimer = null;
            if (!item.matches(':focus-within')) closeItem(item, false);
          }, CLOSE_DELAY_MS);
        }
      });
      // Panel re-entry cancels a pending close (gap / bridge travel).
      menu.addEventListener('mouseenter', () => {
        if (item._navCloseTimer) {
          clearTimeout(item._navCloseTimer);
          item._navCloseTimer = null;
        }
      });
      // Close when leaving the whole item subtree (trigger + open panel).
      item.addEventListener('mouseleave', () => {
        if (item._navOpenTimer) {
          clearTimeout(item._navOpenTimer);
          item._navOpenTimer = null;
        }
        if (item._navCloseTimer) clearTimeout(item._navCloseTimer);
        item._navCloseTimer = setTimeout(() => {
          item._navCloseTimer = null;
          if (!item.matches(':focus-within')) closeItem(item, false);
        }, CLOSE_DELAY_MS);
      });

      item.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          closeItem(item, true);
        } else if (e.key === 'ArrowDown' && e.target === trigger) {
          e.preventDefault();
          openItem(item);
          if (isMega) {
            const firstCat = menu.querySelector('.mm-cat.is-active') || menu.querySelector('.mm-cat');
            const firstLink = menu.querySelector('.mm-pane.is-active .mm-company');
            if (firstCat) firstCat.focus();
            else if (firstLink) firstLink.focus();
          } else {
            const firstLink = menu.querySelector('a');
            if (firstLink) firstLink.focus();
          }
        }
      });

      item.addEventListener('focusout', (e) => {
        if (!item.contains(e.relatedTarget)) closeItem(item, false);
      });
    });

    document.addEventListener('click', (e) => {
      items.forEach(item => {
        if (item.classList.contains('is-open') && !item.contains(e.target)) {
          closeItem(item, false);
        }
      });
    });

    // On scroll, close any open dropdown (the CSS now requires `.is-open`
    // so stray `:focus-within` can't keep a panel visible, but this avoids
    // clutter when the user scrolls past the nav).
    window.addEventListener('scroll', () => {
      items.forEach(item => {
        if (item.classList.contains('is-open')) closeItem(item, false);
      });
    }, { passive: true });
  }

  // Mobile "Subsidiaries" accordion: each category button toggles its own
  // company-links panel independently (multiple can be open at once).
  function initMobileAccordion() {
    document.querySelectorAll('.mob-acc-btn').forEach(btn => {
      const panelId = btn.getAttribute('aria-controls');
      const panel = panelId && document.getElementById(panelId);
      if (!panel) return;
      // The markup ships with a `hidden` attribute so panels stay collapsed
      // with no JS. Once JS runs we switch to a class-driven open/close so
      // the panel can animate its height (max-height) instead of snapping
      // via display:none. Preserve any initially-open state.
      const startOpen = !panel.hasAttribute('hidden');
      panel.removeAttribute('hidden');
      panel.classList.toggle('is-open', startOpen);
      btn.setAttribute('aria-expanded', String(startOpen));
      btn.addEventListener('click', () => {
        const willOpen = !panel.classList.contains('is-open');
        panel.classList.toggle('is-open', willOpen);
        btn.setAttribute('aria-expanded', String(willOpen));
      });
    });
  }

  function initNav() {
    if (document.querySelector('[data-phase01-navbar]')) return;
    const toggle = document.getElementById('nav-toggle');
    const mobileNav = document.getElementById('nav-mobile');
    if (toggle && mobileNav) {
      toggle.addEventListener('click', () => {
        // Class drives visibility (theme.css `.nav-mobile.open`); the inline
        // style is kept in sync for pages where theme.css failed to load.
        const open = mobileNav.classList.toggle('open');
        mobileNav.style.display = open ? 'flex' : 'none';
      });
    }

    initMegaMenu();
    initMobileAccordion();

    // Compare exact filenames rather than substrings: a naive
    // href.includes(path) check would wrongly mark e.g. "fuel.html" active
    // while viewing any page whose href happens to contain "fuel" as a
    // substring. Strip query/hash before comparing.
    const path = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-links a, .nav-mobile a').forEach(a => {
      const href = a.getAttribute('href');
      if (!href) return;
      // Skip external links (target=_blank / absolute URLs): they never match
      // a local page and must not steal the active state.
      if (/^(https?:)?\/\//i.test(href)) return;
      const hrefFile = href.split('/').pop().split('?')[0].split('#')[0];
      if (hrefFile && hrefFile === path) a.classList.add('active');
    });

    // A current page reached through a dropdown/mega-menu (e.g. a company
    // page under "Subsidiaries") should also light up its top-level
    // trigger so the parent nav item reads as active, not just the buried
    // child link. Mark the trigger with .active (persistent accent) so it is
    // distinct beyond hover.
    document.querySelectorAll(
      '.nav-links .nav-dropdown a.active, .nav-links .nav-megamenu a.active'
    ).forEach(a => {
      const li = a.closest('li.has-dropdown');
      if (!li) return;
      const trigger = li.querySelector(':scope > a');
      if (trigger) trigger.classList.add('active');
    });
  }

  function initTabs() {
    document.querySelectorAll('.tab-nav').forEach(nav => {
      nav.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
          const target = btn.dataset.tab;
          const parent = btn.closest('.tab-container') || document;
          nav.querySelectorAll('button').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          parent.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
          const pane = parent.querySelector('#' + target);
          if (pane) pane.classList.add('active');
        });
      });
    });
  }

  function initAnchors() {
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', e => {
        const target = document.querySelector(a.getAttribute('href'));
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  function initForms() {
    document.querySelectorAll('form[data-mock]').forEach(form => {
      form.addEventListener('submit', e => {
        e.preventDefault();
        const btn = form.querySelector('[type=submit]');
        const original = btn.textContent;
        btn.textContent = 'Sending...';
        btn.disabled = true;
        setTimeout(() => {
          btn.textContent = 'Sent!';
          btn.style.background = '#16a34a';
          setTimeout(() => {
            btn.textContent = original;
            btn.disabled = false;
            btn.style.background = '';
            form.reset();
          }, 2000);
        }, 1200);
      });
    });
  }

  function initCurrency() {
    const select = document.getElementById('currency-select');
    if (!select) return;
    const rates = { USD: 1, TZS: 2650, KES: 153, ZMW: 27.5 };
    const symbols = { USD: '$', TZS: 'TSh ', KES: 'KSh ', ZMW: 'ZK ' };

    function format(val, cur) {
      const n = val * rates[cur];
      if (cur === 'USD') return symbols.USD + (n >= 1e9 ? (n / 1e9).toFixed(1) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(0) + 'M' : n.toLocaleString());
      return symbols[cur] + Math.round(n).toLocaleString();
    }

    function update() {
      const cur = select.value;
      document.querySelectorAll('[data-invest-usd]').forEach(el => {
        el.textContent = format(parseFloat(el.dataset.investUsd), cur);
      });
      const label = document.getElementById('currency-label');
      if (label) label.textContent = cur;
    }

    select.addEventListener('change', update);
    update();
  }

  // Company pages set data-company-logo / data-company-alt on <body>.
  // Optional data-nav-wordmark provides a text-only fallback when no approved
  // company logo exists. Company pages otherwise use their own official mark.
  // Nav/footer chrome is overwritten by normalize_nav.js from a shared
  // template that always uses the Lake Group mark - swap after paint so
  // company pages show their branding in nav and footer.
  function markLetterboxedNavLogo(img) {
    if (!img || !img.naturalWidth || !img.naturalHeight) return;
    // Tight group mark is ~2.6:1. Legacy square letterboxed company PNGs (~1:1 with ~18% mark fill)
    // were trimmed to wide assets; letterbox scale remains as a fallback for any leftover squares.
    const ratio = img.naturalWidth / img.naturalHeight;
    img.classList.toggle('nav-logo-img--letterboxed', ratio < 1.35);
  }

  function initCompanyBranding() {
    const companySrc = document.body && document.body.getAttribute('data-company-logo');
    if (!companySrc) return;
    const companyAlt = document.body.getAttribute('data-company-alt') || '';
    const navSrc = companySrc;
    const navAlt = companyAlt;
    const navWordmark = document.body.getAttribute('data-nav-wordmark');

    const navLink = document.querySelector('.site-nav .nav-logo');
    let navImg = navLink && navLink.querySelector('img');
    if (navLink && navWordmark) {
      navLink.classList.add('nav-logo--wordmark');
      navLink.innerHTML = '';
      const wordmark = document.createElement('span');
      wordmark.className = 'nav-logo-wordmark';
      wordmark.textContent = navWordmark;
      navLink.appendChild(wordmark);
      navImg = null;
    }
    if (navImg) {
      navLink.classList.add('nav-logo--company');
      navImg.src = navSrc;
      if (navAlt) navImg.alt = navAlt;
      navImg.removeAttribute('width');
      navImg.removeAttribute('height');
      navImg.style.removeProperty('height');
      navImg.style.removeProperty('width');
      navImg.style.removeProperty('max-width');
      navImg.style.removeProperty('max-height');
      // Size from tokens.css only; letterbox class applied after decode.
      const applyLetterbox = () => markLetterboxedNavLogo(navImg);
      if (navImg.complete && navImg.naturalWidth) applyLetterbox();
      else navImg.addEventListener('load', applyLetterbox, { once: true });
    }

    // The footer is a Lake Group corporate surface. Company identity belongs in
    // the page hero and navbar only; never replace the shared corporate mark.
  }

  /**
   * Warm images before they are visible. Native lazy-loading thresholds are
   * browser-controlled and are not consistent enough for a long, image-heavy
   * page, so the shared loader uses a deliberately early, section-aware
   * boundary. It still leaves genuinely distant content lazy.
   */
  function initSmartLazyImages() {
    const imgs = Array.from(document.querySelectorAll('img[loading="lazy"], img[data-src], img[data-lazy-src]'));
    if (!imgs.length) return;

    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const constrained = !!(connection && (connection.saveData || /(^|-)2g$/.test(connection.effectiveType || '')));
    const rootMargin = constrained ? '700px 0px' : (window.innerWidth < 700 ? '1000px 0px' : '1250px 0px');

    function sourceFor(img) {
      return img.dataset.lazySrc || img.dataset.src || img.currentSrc || img.getAttribute('src');
    }

    function decode(img) {
      if (!img || !img.complete || !img.naturalWidth || typeof img.decode !== 'function') return;
      img.decode().catch(function () { /* display the decoded-by-browser fallback */ });
    }

    function isDedicatedCarouselImage(img) {
      return img.closest('[data-action-track], [data-hero-carousel], [aria-roledescription="carousel"]');
    }

    function warm(img, options) {
      if (!img || img.dataset.lgWarmed === '1') return;
      if (!options?.allowCarousel && isDedicatedCarouselImage(img)) return;
      img.dataset.lgWarmed = '1';
      const src = sourceFor(img);
      if (!src) return;
      // Resolving the real image (rather than a separate probe) lets the
      // browser cache the fetched bytes and decode the image that will render.
      if (img.dataset.lazySrc) img.src = img.dataset.lazySrc;
      else if (img.dataset.src) img.src = img.dataset.src;
      img.removeAttribute('data-lazy-src');
      img.removeAttribute('data-src');
      try { img.loading = 'eager'; } catch (_) { /* ignore */ }
      img.decoding = 'async';
      if (img.complete && img.naturalWidth) {
        decode(img);
        return;
      }
      img.addEventListener('load', function () { decode(img); }, { once: true });
    }

    function sectionImages(img) {
      const section = img.closest('section, article, [role="region"], .section, main > div');
      if (!section) return [img];
      return Array.from(section.querySelectorAll('img[loading="lazy"], img[data-src], img[data-lazy-src]'))
        .filter(function (candidate) { return !isDedicatedCarouselImage(candidate); });
    }

    // Visible images must not wait for an observer callback. Only the first
    // truly critical hero candidate receives high fetch priority.
    const visible = imgs.filter(function (img) {
      const rect = img.getBoundingClientRect();
      return rect.top < window.innerHeight && rect.bottom > 0;
    });
    visible.forEach(function (img, index) {
      warm(img);
      const rect = img.getBoundingClientRect();
      const critical = img.closest('[class*="hero"], [data-hero], .ose-photo-bg, .hero-media')
        || (index === 0 && rect.top < window.innerHeight * 0.5);
      if (critical) {
        try { img.fetchPriority = 'high'; } catch (_) { /* ignore */ }
      }
    });

    if (typeof IntersectionObserver === 'undefined') {
      imgs.forEach(warm);
      return;
    }

    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        // Start the section's relevant imagery together so a card grid or
        // business panel does not render as a mixture of ready and blank tiles.
        sectionImages(e.target).forEach(warm);
        io.unobserve(e.target);
      });
    }, { rootMargin, threshold: 0 });

    imgs.forEach(function (img) {
      if (isDedicatedCarouselImage(img)) return;
      io.observe(img);
    });

    // The Home carousel owns its own responsive preload policy. Other
    // carousels get a bounded warm-up window: the active slide and its
    // immediate successor, never the entire collection.
    document.querySelectorAll('[aria-roledescription="carousel"]').forEach(function (carousel) {
      if (carousel.matches('[data-hero-carousel]')) return;
      const slides = Array.from(carousel.querySelectorAll('[role="tabpanel"]'));
      if (!slides.length) return;
      function warmVisiblePair() {
        const active = Math.max(0, slides.findIndex(function (slide) { return slide.classList.contains('is-active'); }));
        [slides[active], slides[(active + 1) % slides.length]].forEach(function (slide) {
          slide?.querySelectorAll('img[loading="lazy"], img[data-src], img[data-lazy-src]').forEach(function (img) {
            warm(img, { allowCarousel: true });
          });
        });
      }
      warmVisiblePair();
      new MutationObserver(warmVisiblePair).observe(carousel, { subtree: true, attributes: true, attributeFilter: ['class'] });
    });
  }

  /* Keep heavyweight video providers out of the critical request path. The
     local poster is immediately useful; the iframe is created only after an
     explicit user action. */
  function initVideoFacades() {
    document.querySelectorAll('[data-youtube-id]').forEach((facade) => {
      const button = facade.querySelector('[data-video-play]');
      const load = () => {
        if (facade.dataset.videoLoaded === '1') return;
        const id = facade.getAttribute('data-youtube-id');
        if (!id) return;
        const iframe = document.createElement('iframe');
        iframe.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + '?rel=0&autoplay=1';
        iframe.title = facade.getAttribute('data-video-title') || 'Lake Group video';
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
        iframe.referrerPolicy = 'strict-origin-when-cross-origin';
        iframe.allowFullscreen = true;
        facade.replaceChildren(iframe);
        facade.dataset.videoLoaded = '1';
      };
      facade.addEventListener('click', load);
      if (button) button.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); load(); }
      });
    });
  }

  // A shared, hero-aware return control. It uses IntersectionObserver for the
  // visibility threshold; the passive scroll listener only supplies a tiny
  // direction cue and never performs layout reads on modern browsers.
  function initBackToTop() {
    if (document.getElementById('lake-back-to-top')) return;

    const button = document.createElement('button');
    button.id = 'lake-back-to-top';
    button.className = 'lake-back-to-top';
    button.type = 'button';
    button.setAttribute('aria-label', 'Back to top');
    button.setAttribute('title', 'Back to top');
    button.innerHTML = '<span aria-hidden="true">↑</span>';
    document.body.appendChild(button);

    // Legacy public pages without the shared theme stylesheet still receive
    // this global control without requiring page-specific visual changes.
    if (window.getComputedStyle(button).position !== 'fixed') {
      const fallbackStyles = document.createElement('style');
      fallbackStyles.id = 'lake-back-to-top-styles';
      fallbackStyles.textContent = '.lake-back-to-top{--btt-nudge:0px;position:fixed;right:max(28px,calc(env(safe-area-inset-right) + 18px));bottom:max(86px,calc(env(safe-area-inset-bottom) + 76px));z-index:9997;width:46px;height:46px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.28);border-radius:50%;background:var(--lake-deep-blue,#0181BB);color:#fff;box-shadow:0 10px 28px rgba(0,0,0,.14);opacity:0;pointer-events:none;transform:translate3d(0,12px,0) scale(.92);transition:opacity .24s ease,transform .38s cubic-bezier(.22,1.28,.36,1),box-shadow .2s ease,border-color .2s ease}.lake-back-to-top span{font:500 1.35rem/1 Arial,sans-serif;transform:translateY(1px);transition:transform .2s ease}.lake-back-to-top.is-visible{opacity:1;pointer-events:auto;transform:translate3d(0,var(--btt-nudge),0) scale(1)}.lake-back-to-top.is-react-down{--btt-nudge:6px}.lake-back-to-top.is-react-up{--btt-nudge:-5px}.lake-back-to-top:hover{border-color:rgba(255,242,0,.78);box-shadow:0 14px 32px rgba(0,0,0,.18)}.lake-back-to-top:hover span{transform:translateY(-2px)}.lake-back-to-top:active{transform:translate3d(0,var(--btt-nudge),0) scale(.95)}.lake-back-to-top:focus-visible{outline:3px solid #fff200;outline-offset:3px}@media(max-width:600px){.lake-back-to-top{right:max(16px,calc(env(safe-area-inset-right) + 12px));bottom:max(76px,calc(env(safe-area-inset-bottom) + 62px));width:44px;height:44px}}@media(prefers-reduced-motion:reduce){.lake-back-to-top{transition:opacity .18s ease}.lake-back-to-top span{transition:none}.lake-back-to-top.is-react-down,.lake-back-to-top.is-react-up{--btt-nudge:0px}}';
      document.head.appendChild(fallbackStyles);
    }

    const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const thresholdSelectors = [
      '.hero, .page-hero, [data-hero], .our-story-embed',
      'main > section',
      'main',
      'body > section',
      'body > header',
      'body > div:not(.nav-mobile):not(.la-widget)'
    ];
    const hero = thresholdSelectors.reduce(function (match, selector) {
      if (match) return match;
      return Array.from(document.querySelectorAll(selector)).find(function (candidate) {
        const rect = candidate.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      }) || null;
    }, null);
    let visible = false;
    let lastY = window.scrollY || 0;
    let directionFrame = 0;
    let thresholdFrame = 0;
    let settleTimer = 0;

    function setVisible(next) {
      if (visible === next) return;
      visible = next;
      button.classList.toggle('is-visible', next);
      if (!next) button.classList.remove('is-react-up', 'is-react-down');
    }

    function reactToScroll() {
      directionFrame = 0;
      const nextY = window.scrollY || 0;
      const delta = nextY - lastY;
      lastY = nextY;
      if (!visible || reducedMotion || Math.abs(delta) < 2) return;
      button.classList.toggle('is-react-down', delta > 0);
      button.classList.toggle('is-react-up', delta < 0);
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(function () {
        button.classList.remove('is-react-up', 'is-react-down');
      }, 110);
    }

    if (hero && 'IntersectionObserver' in window) {
      const observer = new IntersectionObserver(function (entries) {
        setVisible(!entries[0].isIntersecting);
      }, { threshold: 0 });
      observer.observe(hero);
    } else if (hero) {
      const updateFallback = function () {
        thresholdFrame = 0;
        setVisible(hero.getBoundingClientRect().bottom <= 0);
      };
      window.addEventListener('scroll', function () {
        if (!thresholdFrame) thresholdFrame = window.requestAnimationFrame(updateFallback);
      }, { passive: true });
      updateFallback();
    }

    window.addEventListener('scroll', function () {
      if (!directionFrame) directionFrame = window.requestAnimationFrame(reactToScroll);
    }, { passive: true });

    button.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
    });
  }

  function initCompanyFaqs() {
    const faqs = {
      'lake-oil.html': ['When was Lake Oil established?|Lake Oil was established in 2006 as the flagship company of Lake Group.','What does Lake Oil provide?|Lake Oil operates retail fuel stations and provides bulk petroleum distribution.','Which markets are named on the page?|The page names operations in Tanzania, Zambia, DR Congo, Burundi, Kenya and Mozambique.','Does Lake Oil operate its own storage facilities?|Yes. The page describes oil storage facilities in Tanzania, Kenya, Burundi and DR Congo.'],
      'lake-aviation.html': ['What services does Lake Aviation provide?|Lake Aviation provides aviation fuel supply and into-plane fueling services.','When was Lake Aviation established?|Lake Aviation was established in 2020 as part of Lake Energies.','Which airports are listed?|The page lists JRO, DAR, ZNZ and EBB airport operations.','What supports its fuel supply?|Operations began at JRO with support from Lake Oil’s bulk fuel depot in Dar es Salaam.'],
      'lake-gas.html': ['What does Lake Gas provide?|Lake Gas provides retail and bulk LPG, bottled cylinders and commercial LPG services.','When was Lake Gas established?|Lake Gas was established in 2011.','Where are its Tanzania locations?|The page lists locations including Dar es Salaam, Mwanza, Arusha, Dodoma, Morogoro, Iringa, Mbeya, Tanga and Zanzibar.','When did Kenya operations begin?|The page states that Kenya operations have run since 2014.'],
      'lake-lubes.html': ['What does Lake Lubes manufacture?|Lake Lubes manufactures automotive, industrial and specialty lubricants and greases.','When was Lake Lubes established?|Lake Lubes was established in 2016.','What is the stated blending capacity?|The page states ten blenders with a combined capacity of 54,000 litres per day.','How is quality controlled?|The company describes in-house laboratory quality control across blending, filling and packaging.'],
      'lake-buildings.html': ['What does Lake Building Solution manufacture?|It manufactures gypsum boards and marine boards for construction applications.','Where is the facility located?|The page identifies Kibaha Visiga in Tanzania’s Coast Region.','What is marine board intended for?|The page describes marine board for moisture-exposed applications.','What guides its operations?|The page highlights quality, efficiency and environmental responsibility.'],
      'lake-pipes.html': ['What does Lake Pipes manufacture?|Lake Pipes manufactures PVC and HDPE pipes, water tanks and fittings.','When was Lake Pipes established?|Lake Pipes was established in 2019.','Where is the manufacturing plant?|The plant is in Visiga, Kibaha, Tanzania.','How are products checked?|The page states that products are quality tested at every production stage.'],
      'lake-steel.html': ['What does Lake Steel manufacture?|Lake Steel manufactures TBS-certified TMT reinforcement steel bars conforming to BS 500.','When was Lake Steel established?|Lake Steel was established in 2017.','What was commissioned in 2023?|A Steel Melting Shop and Continuous Casting Machine were commissioned in 2023.','What billet capacity is stated?|The page states 60,000 metric tons of annual billet production capacity.'],
      'lake-cylinders.html': ['What does Lake Cylinders manufacture?|Lake Cylinders manufactures LPG cylinders for domestic, commercial and industrial use.','Where is the manufacturing base?|The company is based in Tanzania.','What is its quality focus?|The page describes modern processes, quality-control systems and applicable safety and quality requirements.','Which regional markets are named?|The page names Tanzania, DR Congo, Rwanda and Zambia.'],
      'lake-premix-cement.html': ['What does Lake Premix provide?|Lake Premix provides ready-mix concrete for construction applications.','When was Lake Premix established?|Lake Premix was established in 2010.','Which concrete grades are listed?|The page lists grades from C10 to C55.','Where does Gulf Premix operate?|The page says Gulf Premix provides ready-mix concrete to Nairobi and other regions of Kenya.'],
      'gulf-aggregates.html': ['What does Gulf Aggregates do?|It develops and operates quarry resources, crushing, screening and aggregate handling.','Where is the quarry located?|The page identifies Lugoba, Tanzania.','Who does it supply?|It supplies Lake Group’s own consumption and third-party construction customers.','What is its operating model?|The page describes an integrated resource-to-market model with in-house production capability.'],
      'aficd.html': ['What does AFICD provide?|AFICD provides ICD, CFS, ECD, bonded warehousing and cargo-handling services.','When did AFICD commence operations?|AFICD commenced operations in 2010.','Who does AFICD serve?|The page names shipping lines, manufacturers, traders and logistics partners.','What regions does it serve?|It serves East, Central and Southern Africa.'],
      'aill.html': ['What cargo does AILL handle?|AILL handles bulk, break-bulk and containerized cargo.','What services does AILL provide?|Services include port handling, warehousing, bagging, customs clearance, and road and rail transport.','How does AILL support cargo movement?|The page describes coordination from vessel discharge through clearance, transport, storage, processing and final delivery.','Which countries are named in its network?|The page names Tanzania, Zambia and Mozambique.'],
      'lake-trans.html': ['What does Lake Trans specialize in?|Lake Trans specializes in secure and efficient petroleum-product transportation.','When did Lake Trans join Lake Group?|Lake Trans has been part of Lake Group since 2011.','What fleet size is stated?|The page states a fleet of more than 1,500 trucks.','What monitoring is used?|The page describes GPS monitoring across all routes.'],
      'cross-country.html': ['What does Cross Country Developer Limited do?|It develops and manages commercial, retail, hospitality and mixed-use properties.','When was the company established?|The page states that it was established in 2021.','Where does it operate?|The company operates in Tanzania.','Which development locations are named?|The page names Lake Avenue, Kingsway, Waterfront Mall and UN Road in Dar es Salaam.'],
      'lake-agro.html': ['What does Lake Agro do?|Lake Agro combines commercial farming, crop and livestock production, technology and agricultural infrastructure.','When was Lake Agro established?|Lake Agro was established in Zambia in 2017.','What crops are listed?|The page lists maize, soya beans, wheat and sugarcane.','What Tanzania project is described?|The page describes an integrated sugarcane plantation and sugar manufacturing project initiated in 2021.'],
      'assembly-tech.html': ['What does Assembly Tech provide?|Assembly Tech assembles commercial vehicles and trailers for transport, logistics and specialized requirements.','When was ATL established?|The page states that ATL was established in 2019.','What trailer types are named?|The page names aluminium fuel tankers, flatbed trailers and curtain-side trailers.','What market does it serve?|The page describes East and Central Africa as its target market.'],
      'nextdrive-motors.html': ['What does NexDrive Motors provide?|NexDrive provides sales, distribution and support for commercial vehicle solutions.','Which vehicle brands are listed?|The portfolio includes JAC pick-ups, Ashok Leyland trucks and SANY heavy commercial trucks.','What applications are described for JAC pick-ups?|The page lists personal use, small businesses, deliveries, agriculture and field operations.','What trailer support is included?|The page identifies ATL / Assembly Tech Limited trailer solutions for cargo, equipment, fuel transport and specialized transport requirements.']
    };
    const entries = faqs[location.pathname.split('/').pop()];
    const main = document.querySelector('main');
    const pageRoot = (main && main.querySelector('.page-wrapper')) || main || document.querySelector('.page-wrapper');
    if (!entries || !pageRoot || document.querySelector('.lg-company-faq')) return;
    const section = document.createElement('section');
    section.className = 'lg-company-faq';
    section.setAttribute('aria-labelledby', 'company-faq-title');
    const items = entries.map(function (entry) { const parts = entry.split('|'); return '<details><summary>' + parts[0] + '</summary><p>' + parts[1] + '</p></details>'; }).join('');
    section.innerHTML = '<div class="lg-company-faq__inner"><h2 id="company-faq-title" class="lg-company-faq__title">Questions about this business</h2><p class="lg-company-faq__lead">Helpful answers based on the information presented on this page.</p><div class="lg-company-faq__list">' + items + '</div></div>';
    pageRoot.appendChild(section);
  }

  document.addEventListener('DOMContentLoaded', () => {
    initNav();
    initCompanyBranding();
    initReveal();
    initCounters();
    initTabs();
    initAnchors();
    initForms();
    initCurrency();
    initSmartLazyImages();
    initVideoFacades();
    initCompanyFaqs();
    initBackToTop();
    document.addEventListener('lake-i18n-applied', refreshCountersForLang);
    if (window.LakeI18n) window.LakeI18n.init();
    else refreshCountersForLang();
    window.LakeSite = { initReveal, initCounters, refreshCountersForLang, initSmartLazyImages, initBackToTop };
  });
})();
