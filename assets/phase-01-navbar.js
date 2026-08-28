(() => {
  'use strict';
  function init() {
    const nav = document.querySelector('[data-phase01-navbar]');
    const drawer = document.querySelector('[data-phase01-navbar-mobile]');
    const toggle = nav && nav.querySelector('#nav-toggle');
    if (!nav || !drawer || !toggle) return;
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
      'lake-buildings.html', 'lake-plastics.html', 'lake-steel.html', 'lake-cylinders.html',
      'gulf-aggregates.html', 'lake-premix-cement.html', 'aficd.html', 'acfs.html',
      'aill.html', 'lake-trans.html', 'cross-country.html', 'ocean-galleria.html',
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
    const sectorAnimations = {
      energies: { reveal: 'assets/icons/sectors/lottie/energies-in-reveal.json', hover: 'assets/icons/sectors/lottie/energies-hover-pinch.json' },
      manufacturing: { reveal: 'assets/icons/sectors/lottie/manufacturing-in-reveal.json', hover: 'assets/icons/sectors/lottie/manufacturing-hover-pinch.json' },
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
    const playSectorIcon = (button, state) => {
      const icon = button.querySelector('.mm-sector-icon');
      if (!icon) return;
      const animation = sectorAnimations[button.dataset.mmCat];
      const source = animation && (state === 'hover' && animation.hover ? animation.hover : animation.reveal);
      if (!source) return;
      const showStaticFrame = () => icon.playerInstance?.seekToEnd();
      const start = () => {
        if (!icon.playerInstance) return;
        icon.playerInstance.loop = false;
        if (reducedMotion()) { showStaticFrame(); return; }
        icon.playerInstance.playFromStart();
        recordIconEvent(button, state === 'hover' ? 'hover-pinch' : 'in-reveal');
      };
      if (icon.dataset.iconSource !== source) {
        icon.dataset.iconSource = source;
        icon.setAttribute('src', source);
        icon.readyPromise?.then(start).catch(() => {});
      } else if (icon.ready) {
        start();
      } else {
        icon.readyPromise?.then(start).catch(() => {});
      }
    };
    const initSectorIcons = () => {
      nav.querySelectorAll('.mm-cat[data-mm-cat]').forEach((button) => {
        if (button.querySelector('.mm-sector-icon')) return;
        const animation = sectorAnimations[button.dataset.mmCat];
        if (!animation) return;
        const icon = document.createElement('lord-icon');
        icon.className = 'mm-sector-icon';
        icon.setAttribute('src', animation.reveal);
        icon.setAttribute('colors', 'primary:#ffffff,secondary:#ffffff');
        icon.setAttribute('stroke', 'regular');
        icon.setAttribute('aria-hidden', 'true');
        icon.dataset.iconSource = animation.reveal;
        button.prepend(icon);
        icon.readyPromise?.then(() => {
          if (reducedMotion()) icon.playerInstance?.seekToEnd();
        }).catch(() => {});
      });
    };
    const initMobileSectorIcons = () => {
      drawer.querySelectorAll('.mob-accordion > .mob-acc-btn[aria-controls^="mob-acc-"]').forEach((button) => {
        const id = button.getAttribute('aria-controls').replace('mob-acc-', '');
        const animation = sectorAnimations[id];
        if (!animation || button.querySelector('.mm-sector-icon')) return;
        button.dataset.mmCat = id;
        const icon = document.createElement('lord-icon');
        icon.className = 'mm-sector-icon mob-sector-icon';
        icon.setAttribute('src', animation.reveal);
        icon.setAttribute('colors', 'primary:#ffffff,secondary:#ffffff');
        icon.setAttribute('stroke', 'regular');
        icon.setAttribute('aria-hidden', 'true');
        icon.dataset.iconSource = animation.reveal;
        button.prepend(icon);
        icon.readyPromise?.then(() => {
          if (reducedMotion()) icon.playerInstance?.seekToEnd();
        }).catch(() => {});
        button.addEventListener('focus', () => playSectorIcon(button, 'in-reveal'));
      });
    };
    const revealSectorIcons = () => {
      initSectorIcons();
      nav.querySelectorAll('.mm-cat[data-mm-cat]').forEach((button) => playSectorIcon(button, 'in-reveal'));
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
    const closeAll = (except) => nav.querySelectorAll('.has-dropdown.is-open').forEach((item) => { if (item !== except) { item.classList.remove('is-open'); item.querySelector(':scope > a')?.setAttribute('aria-expanded', 'false'); } });
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
      drawer.querySelectorAll('.mob-accordion .mob-acc-panel').forEach((panel) => {
        panel.classList.remove('is-open');
        panel.hidden = false;
        panel.style.setProperty('--mobile-panel-height', '0px');
      });
      drawer.querySelectorAll('.mob-acc-btn').forEach((button) => button.setAttribute('aria-expanded', 'false'));
    };
    const toggleTopMobileSection = (key, button, panel) => {
      const shouldOpen = openMobileSection !== key;
      if (shouldOpen && openMobileSection === 'subsidiaries') setMobilePanel(mobilePrimary, drawer.querySelector('#mob-subsidiaries'), false);
      if (shouldOpen && openMobileSection === 'corporate') setMobilePanel(corporateButton, corporatePanel, false);
      setMobilePanel(button, panel, shouldOpen);
      openMobileSection = shouldOpen ? key : null;
    };
    const closeMobile = () => {
      drawer.classList.remove('open');
      drawer.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
      document.documentElement.classList.remove('lg-nav-open');
      document.body.classList.remove('lg-nav-open');
    };
    drawer.querySelector('.mob-close')?.addEventListener('click', closeMobile);
    toggle.addEventListener('click', () => {
      const open = drawer.classList.toggle('open');
      drawer.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      document.documentElement.classList.toggle('lg-nav-open', open);
      document.body.classList.toggle('lg-nav-open', open);
      if (open) resetMobileAccordions();
      else closeMobile();
    });
    nav.querySelectorAll('.has-dropdown').forEach((item) => { const trigger = item.querySelector(':scope > a'); if (!trigger) return; trigger.addEventListener('click', (event) => { event.preventDefault(); const open = !item.classList.contains('is-open'); closeAll(item); item.classList.toggle('is-open', open); trigger.setAttribute('aria-expanded', String(open)); if (open && item.querySelector('.nav-megamenu')) revealSectorIcons(); }); });
    document.addEventListener('click', (event) => { if (!nav.contains(event.target)) closeAll(); });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') { closeAll(); if (drawer.classList.contains('open')) closeMobile(); } });
    const activateCategory = (button, interaction = 'open') => { const id = button.dataset.mmCat; const menu = button.closest('.nav-megamenu'); menu.querySelectorAll('.mm-cat').forEach((b) => { const active = b === button; b.classList.toggle('is-active', active); b.setAttribute('aria-selected', String(active)); }); menu.querySelectorAll('.mm-pane').forEach((pane) => { const active = pane.dataset.mmPane === id; pane.classList.toggle('is-active', active); pane.hidden = !active; }); playSectorIcon(button, interaction === 'open' ? 'in-reveal' : 'hover-pinch'); };
    nav.querySelectorAll('.mm-cat').forEach((button) => { button.addEventListener('click', () => activateCategory(button, 'interaction')); button.addEventListener('mouseenter', () => { if (window.matchMedia('(hover:hover) and (pointer:fine)').matches) activateCategory(button, 'interaction'); }); button.addEventListener('focus', () => activateCategory(button, 'interaction')); });
    nav.querySelectorAll('.has-dropdown.has-megamenu').forEach((item) => item.addEventListener('mouseenter', () => { revealSectorIcons(); const first = item.querySelector('.mm-cat.is-active') || item.querySelector('.mm-cat'); if (first) activateCategory(first, 'open'); }));
    const subsidiariesPanel = drawer.querySelector('#mob-subsidiaries');
    if (mobilePrimary && subsidiariesPanel) mobilePrimary.addEventListener('click', () => {
      initMobileSectorIcons();
      toggleTopMobileSection('subsidiaries', mobilePrimary, subsidiariesPanel);
    });
    if (corporateButton && corporatePanel) corporateButton.addEventListener('click', () => toggleTopMobileSection('corporate', corporateButton, corporatePanel));
    drawer.querySelectorAll('.mob-accordion .mob-acc-btn').forEach((button) => button.addEventListener('click', () => {
      const panel = document.getElementById(button.getAttribute('aria-controls'));
      if (!panel) return;
      const open = !panel.classList.contains('is-open');
      if (open) drawer.querySelectorAll('.mob-accordion > .mob-acc-btn').forEach((other) => {
        if (other !== button) {
          const otherPanel = document.getElementById(other.getAttribute('aria-controls'));
          setMobilePanel(other, otherPanel, false);
        }
      });
      setMobilePanel(button, panel, open);
    }));
    resetMobileAccordions();
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
  const start = () => ensureLordicon().then(init);
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', start) : start();
})();
