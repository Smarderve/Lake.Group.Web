/* shared site behaviour */
(function () {
  'use strict';

  /* Start loading the immutable same-origin content release before feature
     modules run. All snapshot-aware modules await this shared promise. */
  if (!window.LakePublicContentReady) {
    window.LakePublicContentReady = new Promise(function (resolve) {
      if (window.LakePublicContent) return resolve(window.LakePublicContent);
      var contentScript = document.createElement('script');
      contentScript.src = '/assets/public-content.js?v=1';
      contentScript.async = true;
      contentScript.onload = function () { resolve(window.LakePublicContent || null); };
      contentScript.onerror = function () { resolve(null); };
      document.head.appendChild(contentScript);
    });
  }

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

  function initChat() {
    // CHATBOT_ENABLED guard: when false, both the new assistant and legacy
    // chat are disabled. The assistant.js checks this flag first and bails
    // before setting __LAKE_ASSISTANT_ACTIVE__, so this check catches the
    // case where assistant.js did not load at all.
    if (window.CHATBOT_ENABLED !== true) return;
    // The offline knowledge assistant (assets/assistant.js) replaces this
    // legacy canned-reply chat entirely. It sets this flag during script
    // execution (all deferred scripts run before DOMContentLoaded), so when
    // it is loaded on the page the old widget logic must not bind.
    if (window.__LAKE_ASSISTANT_ACTIVE__) return;
    const chatBtn = document.getElementById('chat-btn');
    const chatBox = document.getElementById('chat-box');
    if (!chatBtn || !chatBox) return;

    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const chatSend = document.getElementById('chat-send');

    // Bot reply keys are looked up through LakeI18n so they respect the
    // current language; chat.reply.* keys carry the actual sentences (see
    // assets/i18n-content.json). If i18n hasn't loaded yet or a key is
    // missing, the English fallback string is used so the chatbot never
    // shows a raw key or stays blank.
    const botReplyFallbacks = {
      fuel: 'Lake Oil supplies petroleum products across Tanzania, Kenya, Zambia, DR Congo, Rwanda, Burundi & Ethiopia. Contact admin@lakeoilgroup.com for pricing.',
      lpg: 'Lake Gas offers 6kg, 10kg, 15kg and 38kg cylinders for domestic and commercial use. Available in 6 countries across East & Central Africa.',
      truck: 'Lake Trans operates a fleet of 1,600+ trucks across East & Central Africa for bulk liquid haulage and general cargo.',
      contact: 'Our headquarters: Plots 72 & 73, Vijibweni Area, Kigamboni, Dar es Salaam. Tel: +255 222780510 | Email: admin@lakeoilgroup.com',
      station: 'Visit our Station Locator page to find the nearest Lake Oil fuel station. Lake Group operates 290+ fuel stations across its network.',
      careers: "We're always looking for talented people. Visit our Careers page to explore opportunities across our 20+ subsidiaries.",
      steel: 'Lake Steel & Allied Products Limited manufactures TBS-certified TMT reinforcement steel bars conforming to BS 500. Its computerized rolling mill has 25T/hr capacity and its integrated SMS and CCM produces 60,000 metric tons of billets annually.',
      concrete: "GCCP (Gulf Concrete & Cement Products) is Dar es Salaam's leading ready-mix concrete supplier, established 2010.",
      hello: 'Hello! Welcome to Lake Group. How can I help you today?',
      hi: "Hi there! I'm the Lake Group assistant. Ask me about our services, locations, or how to get in touch."
    };
    const defaultReplyFallback = 'Thank you for your message. Email admin@lakeoilgroup.com or call +255 222780510. Mon–Fri 9:00–18:00.';

    function botReply(key) {
      const i18nKey = 'chat.reply.' + key;
      if (window.LakeI18n) {
        const val = window.LakeI18n.t(i18nKey);
        if (val !== null && val !== i18nKey) return val;
      }
      return botReplyFallbacks[key];
    }

    function defaultReply() {
      if (window.LakeI18n) {
        const val = window.LakeI18n.t('chat.reply.default');
        if (val !== null) return val;
      }
      return defaultReplyFallback;
    }

    const botReplies = botReplyFallbacks;

    function addMsg(text, type) {
      const m = document.createElement('div');
      m.className = 'msg msg-' + type;
      m.textContent = text;
      chatMessages.appendChild(m);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function sendMessage() {
      const text = chatInput.value.trim();
      if (!text) return;
      addMsg(text, 'user');
      chatInput.value = '';
      setTimeout(() => {
        const lower = text.toLowerCase();
        let reply = defaultReply();
        // Word-boundary matching: a naive lower.includes(key) check matches
        // "hi" inside "this"/"history"/"shipping" and "fuel" inside
        // "refuel", causing wrong replies for unrelated messages. \b keeps
        // matches to whole words. When multiple keywords match, prefer the
        // longest (most specific) one rather than whichever Object.keys()
        // happens to iterate last.
        let matchedLength = 0;
        Object.keys(botReplies).forEach(key => {
          const re = new RegExp('\\b' + key + '\\b', 'i');
          if (re.test(lower) && key.length > matchedLength) {
            reply = botReply(key);
            matchedLength = key.length;
          }
        });
        addMsg(reply, 'bot');
      }, 600);
    }

    chatBtn.addEventListener('click', () => chatBox.classList.toggle('open'));
    if (chatSend) chatSend.addEventListener('click', sendMessage);
    if (chatInput) chatInput.addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(); });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && chatBox.classList.contains('open')) {
        chatBox.classList.remove('open');
      }
    });
    document.addEventListener('pointerdown', (e) => {
      if (!chatBox.classList.contains('open')) return;
      const t = e.target;
      if (chatBox.contains(t) || chatBtn.contains(t)) return;
      chatBox.classList.remove('open');
    }, true);
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
   * Early warm for native lazy images: start fetch ~800px before viewport
   * so users rarely see empty/pop-in, without blocking initial load.
   * Coverflow manages its own ±2 preload . skip those tiles.
   */
  function initSmartLazyImages() {
    const imgs = document.querySelectorAll('img[loading="lazy"]');
    if (!imgs.length) return;

    function warm(img) {
      if (!img || img.dataset.lgWarmed === '1') return;
      if (img.closest('[data-action-track]')) return;
      img.dataset.lgWarmed = '1';
      const src = img.currentSrc || img.getAttribute('src');
      if (!src) return;
      try { img.loading = 'eager'; } catch (_) { /* ignore */ }
      if (img.complete && img.naturalWidth) return;
      const probe = new Image();
      probe.decoding = 'async';
      probe.src = src;
    }

    if (typeof IntersectionObserver === 'undefined') {
      imgs.forEach(warm);
      return;
    }

    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        warm(e.target);
        io.unobserve(e.target);
      });
    }, { rootMargin: '800px 0px', threshold: 0.01 });

    imgs.forEach(function (img) {
      if (img.closest('[data-action-track]')) return;
      io.observe(img);
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
      fallbackStyles.textContent = '.lake-back-to-top{--btt-nudge:0px;position:fixed;right:max(28px,calc(env(safe-area-inset-right) + 18px));bottom:max(86px,calc(env(safe-area-inset-bottom) + 76px));z-index:9997;width:46px;height:46px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.28);border-radius:50%;background:#013c5c;color:#fff;box-shadow:0 10px 28px rgba(1,43,66,.24);opacity:0;pointer-events:none;transform:translate3d(0,12px,0) scale(.92);transition:opacity .24s ease,transform .38s cubic-bezier(.22,1.28,.36,1),box-shadow .2s ease,border-color .2s ease}.lake-back-to-top span{font:500 1.35rem/1 Arial,sans-serif;transform:translateY(1px);transition:transform .2s ease}.lake-back-to-top.is-visible{opacity:1;pointer-events:auto;transform:translate3d(0,var(--btt-nudge),0) scale(1)}.lake-back-to-top.is-react-down{--btt-nudge:6px}.lake-back-to-top.is-react-up{--btt-nudge:-5px}.lake-back-to-top:hover{border-color:rgba(255,242,0,.78);box-shadow:0 14px 32px rgba(1,43,66,.32)}.lake-back-to-top:hover span{transform:translateY(-2px)}.lake-back-to-top:active{transform:translate3d(0,var(--btt-nudge),0) scale(.95)}.lake-back-to-top:focus-visible{outline:3px solid #fff200;outline-offset:3px}@media(max-width:600px){.lake-back-to-top{right:max(16px,calc(env(safe-area-inset-right) + 12px));bottom:max(76px,calc(env(safe-area-inset-bottom) + 62px));width:44px;height:44px}}@media(prefers-reduced-motion:reduce){.lake-back-to-top{transition:opacity .18s ease}.lake-back-to-top span{transition:none}.lake-back-to-top.is-react-down,.lake-back-to-top.is-react-up{--btt-nudge:0px}}';
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

  document.addEventListener('DOMContentLoaded', () => {
    initNav();
    initCompanyBranding();
    initReveal();
    initCounters();
    initTabs();
    initChat();
    initAnchors();
    initForms();
    initCurrency();
    initSmartLazyImages();
    initVideoFacades();
    initBackToTop();
    document.addEventListener('lake-i18n-applied', refreshCountersForLang);
    if (window.LakeI18n) window.LakeI18n.init();
    else refreshCountersForLang();
    window.LakeSite = { initReveal, initCounters, refreshCountersForLang, initSmartLazyImages, initBackToTop };
  });
})();
