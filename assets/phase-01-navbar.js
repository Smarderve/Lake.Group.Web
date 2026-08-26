(() => {
  'use strict';
  function init() {
    const nav = document.querySelector('[data-phase01-navbar]');
    const drawer = document.querySelector('[data-phase01-navbar-mobile]');
    const toggle = nav && nav.querySelector('#nav-toggle');
    if (!nav || !drawer || !toggle) return;
    const page = (window.location.pathname.split('/').pop() || 'index.html').split('?')[0].split('#')[0];
    const companyPages = new Set([
      'lake-oil.html', 'lake-aviation.html', 'lake-gas.html', 'lake-lubes.html',
      'lake-buildings.html', 'lake-plastics.html', 'lake-steel.html', 'lake-cylinders.html',
      'gulf-aggregates.html', 'lake-premix-cement.html', 'aficd.html', 'acfs.html',
      'aill.html', 'lake-trans.html', 'cross-country.html', 'ocean-galleria.html',
      'lake-agro.html', 'assembly-tech.html', 'agrinova-tech.html', 'nextdrive-motors.html'
    ]);
    const corporatePages = new Set(['history.html', 'africa-network.html', 'csr.html', 'sustainability.html', 'investors.html', 'projects.html', 'gallery.html']);
    const desktopLinks = nav.querySelectorAll('.nav-links > li > a');
    const mobileLinks = drawer.querySelectorAll('a');
    [...desktopLinks, ...mobileLinks].forEach((link) => {
      link.classList.remove('active');
      link.removeAttribute('aria-current');
    });
    let desktopActive = null;
    if (companyPages.has(page)) desktopActive = nav.querySelector('[data-nav-section="subsidiaries"]');
    else if (corporatePages.has(page)) desktopActive = nav.querySelector('[data-nav-section="corporate"]');
    else desktopActive = [...desktopLinks].find((link) => {
      const target = (link.getAttribute('href') || '').split('/').pop().split('?')[0].split('#')[0];
      return target === page && !link.hasAttribute('data-nav-section');
    });
    if (desktopActive) {
      desktopActive.classList.add('active');
      desktopActive.setAttribute('aria-current', 'page');
    }
    [...mobileLinks].forEach((link) => {
      const target = (link.getAttribute('href') || '').split('/').pop().split('?')[0].split('#')[0];
      if (target === page) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      }
    });
    const closeAll = (except) => nav.querySelectorAll('.has-dropdown.is-open').forEach((item) => { if (item !== except) { item.classList.remove('is-open'); item.querySelector(':scope > a')?.setAttribute('aria-expanded', 'false'); } });
    toggle.addEventListener('click', () => { const open = drawer.classList.toggle('open'); drawer.hidden = !open; toggle.setAttribute('aria-expanded', String(open)); });
    nav.querySelectorAll('.has-dropdown').forEach((item) => { const trigger = item.querySelector(':scope > a'); if (!trigger) return; trigger.addEventListener('click', (event) => { event.preventDefault(); const open = !item.classList.contains('is-open'); closeAll(item); item.classList.toggle('is-open', open); trigger.setAttribute('aria-expanded', String(open)); }); });
    document.addEventListener('click', (event) => { if (!nav.contains(event.target)) closeAll(); });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeAll(); });
    const activateCategory = (button) => { const id = button.dataset.mmCat; const menu = button.closest('.nav-megamenu'); menu.querySelectorAll('.mm-cat').forEach((b) => { const active = b === button; b.classList.toggle('is-active', active); b.setAttribute('aria-selected', String(active)); }); menu.querySelectorAll('.mm-pane').forEach((pane) => { const active = pane.dataset.mmPane === id; pane.classList.toggle('is-active', active); pane.hidden = !active; }); };
    nav.querySelectorAll('.mm-cat').forEach((button) => { button.addEventListener('click', () => activateCategory(button)); button.addEventListener('mouseenter', () => { if (window.matchMedia('(hover:hover) and (pointer:fine)').matches) activateCategory(button); }); button.addEventListener('focus', () => activateCategory(button)); });
    drawer.querySelectorAll('.mob-acc-btn').forEach((button) => button.addEventListener('click', () => { const panel = document.getElementById(button.getAttribute('aria-controls')); const open = !panel.classList.contains('is-open'); panel.classList.toggle('is-open', open); panel.hidden = !open; button.setAttribute('aria-expanded', String(open)); }));
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
