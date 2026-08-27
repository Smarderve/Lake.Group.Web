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
    const sectorIcons = {
      energies: 'assets/icons/sectors/energy.li',
      manufacturing: 'assets/icons/sectors/manufacturing.li',
      logistics: 'assets/icons/sectors/logistics.li',
      realestate: 'assets/icons/sectors/real-estate.li',
      agro: 'assets/icons/sectors/agro-processing.li',
      automotive: 'assets/icons/sectors/automotive.li'
    };
    const ensureSectorIconPlayer = () => {
      if (!window.customElements || customElements.get('lord-icon')) return Promise.resolve();
      if (!window.__lakeLordiconLoader) {
        window.__lakeLordiconLoader = new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'assets/vendor/lordicon-element.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }
      return window.__lakeLordiconLoader;
    };
    const initSectorIcons = () => {
      nav.querySelectorAll('.mm-cat[data-mm-cat]').forEach((button) => {
        if (button.querySelector('.mm-sector-icon')) return;
        const src = sectorIcons[button.dataset.mmCat];
        if (!src) return;
        const icon = document.createElement('lord-icon');
        icon.className = 'mm-sector-icon';
        icon.setAttribute('src', src);
        icon.setAttribute('trigger', 'manual');
        icon.setAttribute('loading', 'interaction');
        icon.setAttribute('state', 'in-reveal');
        icon.setAttribute('colors', 'primary:#b8c8d3,secondary:#b8c8d3');
        icon.setAttribute('stroke', 'regular');
        icon.setAttribute('aria-hidden', 'true');
        button.prepend(icon);
        playSectorIcon(button, 'in-reveal');
      });
    };
    const playSectorIcon = (button, state) => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const icon = button.querySelector('.mm-sector-icon');
      if (!icon) return;
      icon.state = state;
      const play = () => {
        window.__LAKE_SECTOR_ICON_EVENTS__ = window.__LAKE_SECTOR_ICON_EVENTS__ || [];
        window.__LAKE_SECTOR_ICON_EVENTS__.push({ id: button.dataset.mmCat, state, at: Date.now() });
        icon.playerInstance?.playFromBeginning?.();
      };
      icon.ready ? play() : icon.addEventListener('ready', play, { once: true });
    };
    ensureSectorIconPlayer().then(() => { initSectorIcons(); }).catch(() => {});
    if (languageTrigger) {
      languageTrigger.removeAttribute('disabled');
      languageTrigger.setAttribute('aria-haspopup', 'menu');
      languageTrigger.setAttribute('aria-expanded', 'false');
    }
    const mobilePrimary = drawer.querySelector('.mob-primary');
    const corporateSection = [...drawer.querySelectorAll('.mob-section')].find((section) => {
      return section.textContent.trim().toLowerCase() === 'corporate' || section.dataset.i18n === 'mob.company';
    });
    let corporateButton = null;
    let corporatePanel = null;
    if (corporateSection) {
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
      panel.hidden = false;
      panel.classList.toggle('is-open', open);
      button.setAttribute('aria-expanded', String(open));
      panel.style.setProperty('--mobile-panel-height', open ? `${panel.scrollHeight}px` : '0px');
      if (!open) panel.hidden = false;
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
    toggle.addEventListener('click', () => {
      const open = drawer.classList.toggle('open');
      drawer.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      if (open) resetMobileAccordions();
    });
    nav.querySelectorAll('.has-dropdown').forEach((item) => { const trigger = item.querySelector(':scope > a'); if (!trigger) return; trigger.addEventListener('click', (event) => { event.preventDefault(); const open = !item.classList.contains('is-open'); closeAll(item); item.classList.toggle('is-open', open); trigger.setAttribute('aria-expanded', String(open)); }); });
    document.addEventListener('click', (event) => { if (!nav.contains(event.target)) closeAll(); });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeAll(); });
    const activateCategory = (button, interaction = 'open') => { const id = button.dataset.mmCat; const menu = button.closest('.nav-megamenu'); menu.querySelectorAll('.mm-cat').forEach((b) => { const active = b === button; b.classList.toggle('is-active', active); b.setAttribute('aria-selected', String(active)); }); menu.querySelectorAll('.mm-pane').forEach((pane) => { const active = pane.dataset.mmPane === id; pane.classList.toggle('is-active', active); pane.hidden = !active; }); playSectorIcon(button, interaction === 'open' ? 'in-reveal' : 'hover-pinch'); };
    nav.querySelectorAll('.mm-cat').forEach((button) => { button.addEventListener('click', () => activateCategory(button, 'interaction')); button.addEventListener('mouseenter', () => { if (window.matchMedia('(hover:hover) and (pointer:fine)').matches) activateCategory(button, 'interaction'); }); button.addEventListener('focus', () => activateCategory(button, 'interaction')); });
    nav.querySelectorAll('.has-dropdown[data-nav-section="subsidiaries"]').forEach((item) => item.addEventListener('mouseenter', () => { const first = item.querySelector('.mm-cat.is-active') || item.querySelector('.mm-cat'); if (first) activateCategory(first, 'open'); }));
    const subsidiariesPanel = drawer.querySelector('#mob-subsidiaries');
    if (mobilePrimary && subsidiariesPanel) mobilePrimary.addEventListener('click', () => toggleTopMobileSection('subsidiaries', mobilePrimary, subsidiariesPanel));
    if (corporateButton && corporatePanel) corporateButton.addEventListener('click', () => toggleTopMobileSection('corporate', corporateButton, corporatePanel));
    drawer.querySelectorAll('.mob-accordion .mob-acc-btn').forEach((button) => button.addEventListener('click', () => {
      const panel = document.getElementById(button.getAttribute('aria-controls'));
      if (!panel) return;
      const open = !panel.classList.contains('is-open');
      setMobilePanel(button, panel, open);
    }));
    resetMobileAccordions();
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
