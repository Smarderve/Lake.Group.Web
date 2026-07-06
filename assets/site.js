/* shared site behaviour */
(function () {
  'use strict';

  function isInViewport(el) {
    const r = el.getBoundingClientRect();
    return r.top < window.innerHeight && r.bottom > 0;
  }

  function animateCounter(el) {
    if (el.dataset.animated === '1') return;
    el.dataset.animated = '1';
    const target = parseInt(el.dataset.count, 10);
    if (isNaN(target)) return;
    const suffix = el.dataset.suffix || '';
    const prefix = el.dataset.prefix || '';
    const duration = 1600;
    const start = performance.now();
    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      el.textContent = prefix + Math.floor(ease * target).toLocaleString() + suffix;
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function setCounterFallback(el) {
    const target = parseInt(el.dataset.count, 10);
    if (isNaN(target)) return;
    const suffix = el.dataset.suffix || '';
    const prefix = el.dataset.prefix || '';
    el.textContent = prefix + target.toLocaleString() + suffix;
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

    // Compare exact filenames rather than substrings: a naive
    // href.includes(path) check would wrongly mark e.g. "fuel.html" active
    // while viewing any page whose href happens to contain "fuel" as a
    // substring. Strip query/hash before comparing.
    const path = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-links a, .nav-mobile a').forEach(a => {
      const href = a.getAttribute('href');
      if (!href) return;
      const hrefFile = href.split('/').pop().split('?')[0].split('#')[0];
      if (hrefFile && hrefFile === path) a.classList.add('active');
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
      fuel: 'Lake Oil supplies petroleum products across Tanzania, Kenya, Zambia, DRC, Rwanda, Burundi & Ethiopia. Contact admin@lakeoilgroup.com for pricing.',
      lpg: 'Lake Gas offers 6kg, 10kg, 15kg and 38kg cylinders for domestic and commercial use. Available in 6 countries across East & Central Africa.',
      truck: 'Lake Trans operates a fleet of 700+ trucks across East & Central Africa for bulk liquid haulage and general cargo.',
      contact: 'Our headquarters: Plot 49, Mikocheni Light Industrial Area, Dar es Salaam. Tel: +255 222780510 | Email: admin@lakeoilgroup.com',
      station: 'Visit our Station Locator page to find the nearest Lake Oil fuel station. We have 85+ stations across Tanzania and the region.',
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

  document.addEventListener('DOMContentLoaded', () => {
    initNav();
    initReveal();
    initCounters();
    initTabs();
    initChat();
    initAnchors();
    initForms();
    initCurrency();
    if (window.LakeI18n) window.LakeI18n.init();
    window.addEventListener('scroll', initReveal, { passive: true });
    window.LakeSite = { initReveal, initCounters };
  });
})();
