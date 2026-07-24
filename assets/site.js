/* shared site behaviour */
(function () {
  'use strict';

  /* Iconify web component for footer / chrome icons */
  (function ensureIconify() {
    if (typeof customElements !== 'undefined' && customElements.get('iconify-icon')) return;
    if (document.querySelector('script[data-lake-iconify]')) return;
    var s = document.createElement('script');
    s.src = 'https://code.iconify.design/iconify-icon/2.3.0/iconify-icon.min.js';
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

  function animateCounter(el) {
    if (el.dataset.animated === '1') return;
    el.dataset.animated = '1';
    const target = parseInt(el.dataset.count, 10);
    if (isNaN(target)) return;
    const duration = 1600;
    const start = performance.now();
    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      paintCounter(el, Math.floor(ease * target));
      if (progress < 1) requestAnimationFrame(step);
      else paintCounter(el, target);
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
      const target = parseInt(el.dataset.count, 10);
      if (isNaN(target)) return;
      // After animation, show final localized value; if not yet animated, keep fallback.
      if (el.dataset.animated === '1') paintCounter(el, target);
      else setCounterFallback(el);
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
    counters.forEach(el => {
      if (isInViewport(el)) animateCounter(el);
      else setCounterFallback(el);
    });

    if (typeof IntersectionObserver === 'undefined') {
      counters.forEach(animateCounter);
      return;
    }

    const co = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          animateCounter(e.target);
          co.unobserve(e.target);
        }
      });
    }, { threshold: 0.05, rootMargin: '0px 0px -20px 0px' });

    counters.forEach(el => {
      if (el.dataset.animated !== '1') co.observe(el);
    });

    setTimeout(() => {
      counters.forEach(el => {
        if (el.dataset.animated !== '1') {
          setCounterFallback(el);
          el.dataset.animated = '1';
        }
      });
    }, 2500);
  }

  // Desktop nav dropdowns + Subsidiaries mega-menu.
  // CSS `:hover` / `:focus-within` still open panels; this layer keeps
  // `.is-open` + aria-expanded in sync (needed where pages use
  // `.is-open`-only !important rules), adds hover-intent open/close,
  // click-to-toggle (touch), Escape, ArrowDown into the panel, and
  // click-outside close. Mega-menu category tabs swap the logo grid with
  // a restartable translateY enter animation.
  function initMegaMenu() {
    const items = document.querySelectorAll('.nav-links > li.has-dropdown');
    if (!items.length) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const OPEN_DELAY_MS = 120;
    const CLOSE_DELAY_MS = 180;

    function canHoverOpen() {
      try {
        return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
      } catch (_) {
        return true;
      }
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
        const hoverCapable = canHoverOpen();
        // Desktop fine-pointer: simple dropdown triggers keep their href
        // (hover already reveals the panel). Mega trigger and touch/coarse
        // pointers toggle `.is-open` instead.
        if (!isMega && hoverCapable) return;

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

      // Desktop hover-intent open/close (fine pointer only).
      item.addEventListener('mouseenter', () => {
        if (!canHoverOpen()) return;
        if (item._navCloseTimer) {
          clearTimeout(item._navCloseTimer);
          item._navCloseTimer = null;
        }
        // Exclusive controller: close siblings immediately on enter so rapid
        // moves (Network → Corporate) never leave two `.is-open` panels stacked
        // while CSS `:hover` already shows the newly hovered menu.
        closeAll(item, { instant: true });
        if (item.classList.contains('is-open') || item._navOpenTimer) return;
        item._navOpenTimer = setTimeout(() => {
          item._navOpenTimer = null;
          openItem(item);
        }, OPEN_DELAY_MS);
      });
      item.addEventListener('mouseleave', () => {
        if (!canHoverOpen()) return;
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
      truck: 'Lake Trans operates a fleet of 1,200+ trucks across East & Central Africa for bulk liquid haulage and general cargo.',
      contact: 'Our headquarters: Plot 49, Mikocheni Light Industrial Area, Dar es Salaam. Tel: +255 222780510 | Email: admin@lakeoilgroup.com',
      station: 'Visit our Station Locator page to find the nearest Lake Oil fuel station. We have 152 stations across Tanzania and the region.',
      careers: "We're always looking for talented people. Visit our Careers page to explore opportunities across our 20+ subsidiaries.",
      steel: 'Lake Steel is the first company in Tanzania to introduce High Strength Corrosion Resistant (HS-CR) rebars with 100,000 MT annual capacity.',
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
  // Nav/footer chrome is overwritten by normalize_nav.js from a shared
  // template that always uses the Lake Group mark - swap after paint so
  // company pages show their own logo in nav and footer.
  function markLetterboxedNavLogo(img) {
    if (!img || !img.naturalWidth || !img.naturalHeight) return;
    // Tight group mark is ~2.6:1. Legacy square letterboxed company PNGs (~1:1 with ~18% mark fill)
    // were trimmed to wide assets; letterbox scale remains as a fallback for any leftover squares.
    const ratio = img.naturalWidth / img.naturalHeight;
    img.classList.toggle('nav-logo-img--letterboxed', ratio < 1.35);
  }

  function initCompanyBranding() {
    const src = document.body && document.body.getAttribute('data-company-logo');
    if (!src) return;
    const alt = document.body.getAttribute('data-company-alt') || '';

    const navLink = document.querySelector('.site-nav .nav-logo');
    const navImg = navLink && navLink.querySelector('img');
    if (navImg) {
      navLink.classList.add('nav-logo--company');
      navImg.src = src;
      if (alt) navImg.alt = alt;
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

    const footerImg = document.querySelector('.site-footer .footer-logo img');
    if (footerImg) {
      footerImg.src = src;
      if (alt) footerImg.alt = alt;
    }
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
    document.addEventListener('lake-i18n-applied', refreshCountersForLang);
    if (window.LakeI18n) window.LakeI18n.init();
    else refreshCountersForLang();
    window.addEventListener('scroll', initReveal, { passive: true });
    window.LakeSite = { initReveal, initCounters, refreshCountersForLang };
  });
})();
