(() => {
  'use strict';
  function init() {
    const nav = document.querySelector('[data-phase01-navbar]');
    const drawer = document.querySelector('[data-phase01-navbar-mobile]');
    const toggle = nav && nav.querySelector('#nav-toggle');
    if (!nav || !drawer || !toggle) return;
    const page = (window.location.pathname.split('/').pop() || 'index.html').split('?')[0].split('#')[0];
    nav.querySelectorAll('.nav-links > li > a, [data-phase01-navbar-mobile] a').forEach((link) => {
      const target = (link.getAttribute('href') || '').split('/').pop().split('?')[0].split('#')[0];
      if (target && target === page) { link.classList.add('active'); link.setAttribute('aria-current', 'page'); }
    });
    const closeAll = (except) => nav.querySelectorAll('.has-dropdown.is-open').forEach((item) => { if (item !== except) { item.classList.remove('is-open'); item.querySelector(':scope > a')?.setAttribute('aria-expanded', 'false'); } });
    toggle.addEventListener('click', () => { const open = drawer.classList.toggle('open'); drawer.hidden = !open; toggle.setAttribute('aria-expanded', String(open)); });
    nav.querySelectorAll('.has-dropdown').forEach((item) => { const trigger = item.querySelector(':scope > a'); if (!trigger) return; trigger.addEventListener('click', (event) => { event.preventDefault(); const open = !item.classList.contains('is-open'); closeAll(item); item.classList.toggle('is-open', open); trigger.setAttribute('aria-expanded', String(open)); }); });
    document.addEventListener('click', (event) => { if (!nav.contains(event.target)) closeAll(); });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeAll(); });
    nav.querySelectorAll('.mm-cat').forEach((button) => button.addEventListener('click', () => { const id = button.dataset.mmCat; const menu = button.closest('.nav-megamenu'); menu.querySelectorAll('.mm-cat').forEach((b) => { const active = b === button; b.classList.toggle('is-active', active); b.setAttribute('aria-selected', String(active)); }); menu.querySelectorAll('.mm-pane').forEach((pane) => { const active = pane.dataset.mmPane === id; pane.classList.toggle('is-active', active); pane.hidden = !active; }); }));
    drawer.querySelectorAll('.mob-acc-btn').forEach((button) => button.addEventListener('click', () => { const panel = document.getElementById(button.getAttribute('aria-controls')); const open = !panel.classList.contains('is-open'); panel.classList.toggle('is-open', open); panel.hidden = !open; button.setAttribute('aria-expanded', String(open)); }));
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
