(() => {
  'use strict';
  function init() {
    const nav = document.querySelector('[data-phase01-navbar]');
    const drawer = document.querySelector('[data-phase01-navbar-mobile]');
    const toggle = nav && nav.querySelector('#nav-toggle');
    if (!nav || !drawer || !toggle) return;
    if (nav.dataset.phase01NavbarInitialized === 'true') return;
    nav.dataset.phase01NavbarInitialized = 'true';
    const normalizeRoute = (value) => {
      try {
        const pathname = new URL(value, window.location.href).pathname.replace(/\/+$/, '');
        const route = pathname.split('/').pop() || 'index';
        return route.replace(/\\.html$/i, '') || 'index';
      } catch (_) { return ''; }
    };
    const page = normalizeRoute(window.location.href);
    const companyPages = new Set([
      'lake-oil.html', 'lake-aviation.html', 'lake-gas.html', 'lake-lubes.html',
      'lake-buildings.html', 'lake-pipes.html', 'lake-steel.html', 'lake-cylinders.html',
      'gulf-aggregates.html', 'lake-premix-cement.html', 'aficd.html', 'acfs.html',
      'aill.html', 'lake-trans.html', 'cross-country.html',
      'lake-agro.html', 'assembly-tech.html', 'agrinova-tech.html', 'nextdrive-motors.html'
    ]);
    const corporatePages = new Set(['history.html', 'africa-network.html', 'csr.html', 'sustainability.html', 'investors.html', 'projects.html', 'gallery.html']);
    const desktopLinks = nav.querySelectorAll('.nav-links > li > a');
    const languageTrigger = nav.querySelector('.lang-trigger');
    const businessVerticalsLink = nav.querySelector('[data-nav-section="subsidiaries"]');
    if (businessVerticalsLink) {
      businessVerticalsLink.setAttribute('aria-label', 'Business Verticals');
      businessVerticalsLink.setAttribute('data-nav-label', 'Business Verticals');
      if (businessVerticalsLink.firstChild && businessVerticalsLink.firstChild.nodeType === Node.TEXT_NODE) {
        businessVerticalsLink.firstChild.nodeValue = 'Business Verticals ';
      }
    }
    const mobileBusinessVerticals = drawer && drawer.querySelector('.mob-primary[aria-controls="mob-subsidiaries"]');
    if (mobileBusinessVerticals) mobileBusinessVerticals.textContent = 'Business Verticals';
    // One canonical, local icon source per sector. Keeping a stable source
    // prevents legacy artwork or a loading gap when a row changes state.
    const sectorAnimations = {
      energies: { reveal: 'assets/animations/nav/energies.json' },
      manufacturing: { reveal: 'assets/animations/nav/manufacturing.json' },
      logistics: { reveal: 'assets/icons/sectors/lottie/logistics-in-reveal.json', hover: 'assets/icons/sectors/lottie/logistics-hover-pinch.json' },
      realestate: { reveal: 'assets/icons/sectors/lottie/real-estate-in-reveal.json', hover: 'assets/icons/sectors/lottie/real-estate-hover-pinch.json' },
      agro: { reveal: 'assets/icons/sectors/lottie/agro-processing-in-reveal.json', hover: 'assets/icons/sectors/lottie/agro-processing-hover-pinch.json' },
      automotive: { reveal: 'assets/icons/sectors/lottie/automotive-in-reveal.json' }
    };
    const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const recordIconEvent = (button, state) => {
      window.__LAKE_SECTOR_ICON_EVENTS__ = window.__LAKE_SECTOR_ICON_EVENTS__ || [];
      window.__LAKE_SECTOR_ICON_EVENTS__.push({ id: button.dataset.mmCat, state, at: Date.now() });
    };
    /** Play a lord-icon Lottie from the beginning. */
    const playLottieFromStart = (icon) => {
      if (!icon?.playerInstance) return;
      try { icon.playerInstance.seek(0); } catch (_) {}
      try { icon.playerInstance.play(); } catch (_) {}
    };
    const playSectorIcon = (button, state) => {
      const icon = button.querySelector('.mm-sector-icon');
      if (!icon) return;
      playLottieFromStart(icon);
      recordIconEvent(button, state === 'hover' ? 'hover' : 'in-reveal');
    };
    const settleSectorIcon = (button, icon) => {
      const settle = () => {
        // Seek to a visible resting frame once the Lottie is loaded.
        playLottieFromStart(icon);
        button.classList.add('has-sector-icon');
      };
      const whenReady = () => {
        if (!icon.readyPromise?.then) {
          requestAnimationFrame(whenReady);
          return;
        }
        icon.readyPromise.then(settle).catch(() => {});
      };
      if (window.customElements?.get('lord-icon')) whenReady();
      else window.customElements?.whenDefined?.('lord-icon').then(whenReady).catch(() => {});
    };
    const initSectorIcons = () => {
      nav.querySelectorAll('.mm-cat[data-mm-cat]').forEach((button) => {
        if (button.querySelector('.mm-sector-icon')) return;
        const animation = sectorAnimations[button.dataset.mmCat];
        if (!animation) return;
        const textNode = [...button.childNodes].find((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
        if (textNode) {
          const label = document.createElement('span');
          label.className = 'mm-sector-label';
          label.textContent = textNode.textContent.trim();
          textNode.replaceWith(label);
        }
        const icon = document.createElement('lord-icon');
        icon.className = `mm-sector-icon${['energies', 'manufacturing'].includes(button.dataset.mmCat) ? ` mm-sector-icon--approved mm-sector-icon--${button.dataset.mmCat}` : ''}`;
        icon.setAttribute('src', animation.reveal);
        icon.setAttribute('aria-hidden', 'true');
        icon.dataset.iconSource = animation.reveal;
        button.prepend(icon);
        settleSectorIcon(button, icon);
      });
    };
    const initMobileSectorIcons = () => {
      drawer.querySelectorAll('.mob-sector-heading[data-mm-cat]').forEach((heading) => {
        const id = heading.dataset.mmCat;
        const animation = sectorAnimations[id];
        if (!animation || heading.querySelector('.mm-sector-icon')) return;
        const textNode = [...heading.childNodes].find((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
        if (textNode) {
          const label = document.createElement('span');
          label.className = 'mob-sector-label';
          label.textContent = textNode.textContent.trim();
          textNode.replaceWith(label);
        }
        const icon = document.createElement('lord-icon');
        icon.className = `mm-sector-icon mob-sector-icon${['energies', 'manufacturing'].includes(id) ? ` mm-sector-icon--approved mm-sector-icon--${id}` : ''}`;
        icon.setAttribute('src', animation.reveal);
        icon.setAttribute('aria-hidden', 'true');
        icon.dataset.iconSource = animation.reveal;
        heading.prepend(icon);
        const begin = () => playLottieFromStart(icon);
        const whenReady = () => {
          if (!icon.readyPromise?.then) {
            requestAnimationFrame(whenReady);
            return;
          }
          icon.readyPromise.then(begin).catch(() => {});
        };
        if (window.customElements?.get('lord-icon')) whenReady();
        else window.customElements?.whenDefined?.('lord-icon').then(whenReady).catch(() => {});
      });
    };
    const revealSectorIcons = () => {
      initSectorIcons();
      if (!reducedMotion()) {
        // Play each sector's Lottie reveal animation on dropdown open.
        nav.querySelectorAll('.mm-cat[data-mm-cat]').forEach((button) => {
          const icon = button.querySelector('.mm-sector-icon');
          if (icon) playLottieFromStart(icon);
        });
      }
      const active = nav.querySelector('.mm-cat.is-active') || nav.querySelector('.mm-cat[data-mm-cat]');
      if (active) playSectorIcon(active, 'in-reveal');
    };
    if (languageTrigger) {
      languageTrigger.removeAttribute('disabled');
      languageTrigger.setAttribute('aria-haspopup', 'menu');
      languageTrigger.setAttribute('aria-expanded', 'false');
    }
    const mobilePrimary = drawer.querySelector('.mob-primary');
    const corporateSection = [...drawer.querySelectorAll('.mob-section')].find((section) => {
      return section.textContent.trim().toLowerCase() === 'corporate' || section.dataset.i18n === 'mob.company';
    });
    let corporateButton = drawer.querySelector('.mob-corporate-trigger') || null;
    let corporatePanel = corporateButton ? drawer.querySelector(`#${corporateButton.getAttribute('aria-controls')}`) : null;
    const mobileLanguageButton = drawer.querySelector('.mob-language-trigger');
    const mobileLanguagePanel = mobileLanguageButton ? drawer.querySelector(`#${mobileLanguageButton.getAttribute('aria-controls')}`) : null;
    if (!corporateButton && corporateSection) {
      corporateButton = document.createElement('button');
      corporateButton.type = 'button';
      corporateButton.className = 'mob-acc-btn mob-corporate-trigger';
      corporateButton.setAttribute('aria-expanded', 'false');
      corporateButton.setAttribute('aria-controls', 'mob-corporate-panel');
      corporateButton.textContent = corporateSection.textContent.trim();
      corporatePanel = document.createElement('div');
      corporatePanel.className = 'mob-acc-panel mob-corporate-panel';
      corporatePanel.id = 'mob-corporate-panel';
      corporatePanel.hidden = true;
      corporatePanel.setAttribute('aria-label', 'Corporate navigation');
      corporateSection.replaceWith(corporateButton);
      corporateButton.after(corporatePanel);
      let next = corporatePanel.nextElementSibling;
      while (next && !next.classList.contains('mob-section')) {
        const current = next;
        next = next.nextElementSibling;
        corporatePanel.appendChild(current);
      }
    }
    const mobileLinks = drawer.querySelectorAll('a');
    [...desktopLinks, ...mobileLinks, mobilePrimary].filter(Boolean).forEach((link) => {
      link.classList.remove('active');
      link.removeAttribute('aria-current');
    });
    let desktopActive = null;
    if (companyPages.has(page)) desktopActive = nav.querySelector('[data-nav-section="subsidiaries"]');
    else if (corporatePages.has(page)) desktopActive = nav.querySelector('[data-nav-section="corporate"]');
    else desktopActive = [...desktopLinks].find((link) => {
      const target = normalizeRoute(link.getAttribute('href') || '');
      return target === page && !link.hasAttribute('data-nav-section');
    });
    if (desktopActive) {
      desktopActive.classList.add('active');
      desktopActive.setAttribute('aria-current', 'page');
    }
    [...mobileLinks].forEach((link) => {
      if (normalizeRoute(link.getAttribute('href') || '') === page) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      }
    });
    // One shared controller owns every desktop navbar surface.  Language is
    // created asynchronously by i18n.js, so it must be included here rather
    // than managed as an unrelated boolean state.
    const closeAll = (except) => {
      nav.querySelectorAll('.has-dropdown.is-open').forEach((item) => {
        if (item === except) return;
        item.classList.remove('is-open');
        item.querySelector(':scope > a')?.setAttribute('aria-expanded', 'false');
      });
      const language = nav.querySelector('.lang-switcher');
      if (language && language !== except) {
        language.classList.remove('is-open');
        language.querySelector('.lang-trigger')?.setAttribute('aria-expanded', 'false');
        const menu = language.querySelector('.lang-menu');
        if (menu) menu.hidden = true;
      }
    };
    let openMobileSection = null;
    const setMobilePanel = (button, panel, open) => {
      if (!button || !panel) return;
      panel.hidden = !open;
      panel.classList.toggle('is-open', open);
      button.setAttribute('aria-expanded', String(open));
      panel.style.setProperty('--mobile-panel-height', open ? `${panel.scrollHeight}px` : '0px');
    };
    const resetMobileAccordions = () => {
      openMobileSection = null;
      setMobilePanel(mobilePrimary, drawer.querySelector('#mob-subsidiaries'), false);
      setMobilePanel(corporateButton, corporatePanel, false);
      setMobilePanel(mobileLanguageButton, mobileLanguagePanel, false);
      drawer.querySelectorAll('.mob-acc-btn').forEach((button) => button.setAttribute('aria-expanded', 'false'));
    };
    const toggleTopMobileSection = (key, button, panel) => {
      const shouldOpen = openMobileSection !== key;
      if (shouldOpen) {
        setMobilePanel(mobilePrimary, drawer.querySelector('#mob-subsidiaries'), false);
        setMobilePanel(corporateButton, corporatePanel, false);
        setMobilePanel(mobileLanguageButton, mobileLanguagePanel, false);
      }
      setMobilePanel(button, panel, shouldOpen);
      openMobileSection = shouldOpen ? key : null;
    };
    const closeMobile = () => {
      drawer.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      document.documentElement.classList.remove('lg-nav-open');
      document.body.classList.remove('lg-nav-open');
    };
    drawer.querySelector('.mob-close')?.addEventListener('click', closeMobile);
    toggle.addEventListener('click', () => {
      const open = drawer.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
      document.documentElement.classList.toggle('lg-nav-open', open);
      document.body.classList.toggle('lg-nav-open', open);
      if (open) resetMobileAccordions();
      else closeMobile();
    });
    nav.querySelectorAll('.has-dropdown').forEach((item) => {
      const trigger = item.querySelector(':scope > a');
      if (!trigger) return;
      trigger.addEventListener('click', (event) => {
        event.preventDefault();
        const open = !item.classList.contains('is-open');
        closeAll(open ? item : null);
        item.classList.toggle('is-open', open);
        trigger.setAttribute('aria-expanded', String(open));
        if (open && item.querySelector('.nav-megamenu')) revealSectorIcons();
      });
      item.addEventListener('mouseenter', () => {
        if (!window.matchMedia('(hover:hover) and (pointer:fine)').matches) return;
        closeAll(item);
        item.classList.add('is-open');
        trigger.setAttribute('aria-expanded', 'true');
        if (item.querySelector('.nav-megamenu')) revealSectorIcons();
      });
      item.addEventListener('mouseleave', () => {
        if (!window.matchMedia('(hover:hover) and (pointer:fine)').matches) return;
        item.classList.remove('is-open');
        trigger.setAttribute('aria-expanded', 'false');
      });
    });
    // i18n.js binds the language menu after its dictionary bootstrap.  This
    // listener runs first and closes any active page dropdown before i18n
    // opens Language, keeping the surfaces mutually exclusive.
    languageTrigger?.addEventListener('click', () => closeAll(languageTrigger.closest('.lang-switcher')), true);
    document.addEventListener('click', (event) => { if (!nav.contains(event.target)) closeAll(); });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') { closeAll(); if (drawer.classList.contains('open')) closeMobile(); } });
    const activateCategory = (button, interaction = 'open') => { const id = button.dataset.mmCat; const menu = button.closest('.nav-megamenu'); menu.querySelectorAll('.mm-cat').forEach((b) => { const active = b === button; b.classList.toggle('is-active', active); b.setAttribute('aria-selected', String(active)); }); menu.querySelectorAll('.mm-pane').forEach((pane) => { const active = pane.dataset.mmPane === id; pane.classList.toggle('is-active', active); pane.hidden = !active; }); playSectorIcon(button, interaction === 'open' ? 'in-reveal' : 'hover'); };
    nav.querySelectorAll('.mm-cat').forEach((button) => { button.addEventListener('click', () => activateCategory(button, 'interaction')); button.addEventListener('mouseenter', () => { if (window.matchMedia('(hover:hover) and (pointer:fine)').matches) activateCategory(button, 'interaction'); }); button.addEventListener('focus', () => activateCategory(button, 'interaction')); });
    nav.querySelectorAll('.has-dropdown.has-megamenu').forEach((item) => item.addEventListener('mouseenter', () => { revealSectorIcons(); const first = item.querySelector('.mm-cat.is-active') || item.querySelector('.mm-cat'); if (first) activateCategory(first, 'open'); }));
    const subsidiariesPanel = drawer.querySelector('#mob-subsidiaries');
    if (mobilePrimary && subsidiariesPanel) mobilePrimary.addEventListener('click', () => {
      initMobileSectorIcons();
      toggleTopMobileSection('subsidiaries', mobilePrimary, subsidiariesPanel);
    });
    if (corporateButton && corporatePanel) corporateButton.addEventListener('click', () => toggleTopMobileSection('corporate', corporateButton, corporatePanel));
    if (mobileLanguageButton && mobileLanguagePanel) mobileLanguageButton.addEventListener('click', () => toggleTopMobileSection('language', mobileLanguageButton, mobileLanguagePanel));
    const syncMobileLanguage = (event) => {
      const language = event.detail?.lang || window.LakeI18n?.current || 'en';
      drawer.querySelectorAll('.mob-language-option[data-lang]').forEach((option) => {
        const active = option.dataset.lang === language;
        option.classList.toggle('active', active);
        option.setAttribute('aria-checked', String(active));
      });
    };
    document.addEventListener('lake-i18n-applied', syncMobileLanguage);
    drawer.querySelectorAll('.mob-language-option[data-lang]').forEach((option) => option.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('lake-mobile-language-select', { detail: { lang: option.dataset.lang } }));
      syncMobileLanguage({ detail: { lang: window.LakeI18n?.current || 'en' } });
    }));
    resetMobileAccordions();
    /* Clean up nav state when crossing the responsive breakpoint so that
       a desktop window resized to phone width (or vice versa) gets the
       correct interaction model without requiring a page reload. */
    const bpQuery = window.matchMedia('(max-width: 1100px)');
    const onBreakpointChange = () => {
      if (!bpQuery.matches) {
        /* Back to desktop — close mobile drawer and reset its accordions. */
        closeMobile();
        resetMobileAccordions();
      } else {
        /* Entering mobile — close any open desktop dropdowns. */
        closeAll();
      }
    };
    if (bpQuery.addEventListener) bpQuery.addEventListener('change', onBreakpointChange);
    else if (bpQuery.addListener) bpQuery.addListener(onBreakpointChange);
  }
  const ensureLordicon = () => {
    if (window.customElements?.get('lord-icon')) return Promise.resolve();
    return new Promise((resolve) => {
      const existing = document.querySelector('script[data-lake-lordicon]');
      if (existing) {
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', resolve, { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = 'assets/vendor/lordicon-element.js';
      script.async = true;
      script.dataset.lakeLordicon = 'true';
      script.addEventListener('load', resolve, { once: true });
      script.addEventListener('error', resolve, { once: true });
      document.head.appendChild(script);
    });
  };
  // Navigation must be interactive immediately; animated icons enhance it
  // asynchronously and must never hold the mobile drawer behind a loader.
  const start = () => {
    init();
    ensureLordicon();
  };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', start) : start();
})();
