/**
 * Rebuild gallery.html as a uniform Shell Creative Hub–style card grid.
 * Reads current gallery.html tile data; writes rebuilt page content.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FILE = path.join(ROOT, 'gallery.html');
let html = fs.readFileSync(FILE, 'utf8');

const CAT_LABEL = {
  operations: 'Operations',
  fuel: 'Fuel & Oil',
  lpg: 'LPG Gas',
  concrete: 'GCCP Concrete',
  dubai: 'MERM Dubai',
};

const gridMatch = html.match(/id="gallery-grid">([\s\S]*?)\n\s*<div class="g-foot/);
if (!gridMatch) {
  console.error('Could not find gallery-grid block');
  process.exit(1);
}

const block = gridMatch[1];
const parts = block.split(/<div class="g-item /).slice(1);
const items = [];

for (const p of parts) {
  const open = p.match(/^reveal"([^>]*)>/);
  if (!open) continue;
  const attrs = open[1];
  const cat = (attrs.match(/data-cat="([^"]+)"/) || [])[1];
  const src = (attrs.match(/data-src="([^"]+)"/) || [])[1];
  let caption = (attrs.match(/data-caption="([^"]*)"/) || [])[1] || '';
  const i18n = (p.match(/data-i18n="([^"]+)"/) || [])[1] || '';
  const picture = (p.match(/<picture>[\s\S]*?<\/picture>/) || [])[0] || null;
  const imgOnly = picture ? null : (p.match(/<img[^>]*>/) || [])[0] || null;
  if (!caption) {
    const alt = ((imgOnly || picture || '').match(/alt="([^"]*)"/) || [])[1] || '';
    caption = alt;
  }
  // Fix mojibake cubic metres if present
  caption = caption.replace(/12m./g, (m) => (m.includes('³') ? m : '12m³'));
  items.push({ cat, src, caption, i18n, picture, imgOnly });
}

console.log('Parsed tiles:', items.length);
if (items.length < 40) {
  console.error('Unexpected tile count');
  process.exit(1);
}

const TOTAL = items.length;

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderTile(item, index) {
  const n = String(index + 1).padStart(2, '0');
  const tag = CAT_LABEL[item.cat] || item.cat;
  const media = item.picture
    ? item.picture.replace(/<img /, '<img class="gallery-tile__img" ')
    : (item.imgOnly || `<img src="${esc(item.src)}" alt="${esc(item.caption)}" loading="lazy" decoding="async">`)
        .replace(/<img /, '<img class="gallery-tile__img" ');
  const i18nAttr = item.i18n ? ` data-i18n="${item.i18n}"` : '';
  return `<article class="gallery-tile" data-cat="${esc(item.cat)}" data-src="${esc(item.src)}" data-caption="${esc(item.caption)}" data-index="${index}" tabindex="0" role="button" aria-label="${esc(item.caption)}">
  <div class="gallery-tile__image">
    ${media}
    <span class="gallery-tile__tag">${esc(tag)}</span>
  </div>
  <div class="gallery-tile__caption"${i18nAttr}><span class="gallery-tile__idx">${n}</span><span class="gallery-tile__text">${esc(item.caption)}</span></div>
</article>`;
}

const tilesHtml = items.map(renderTile).join('\n');

const pageCss = `/* ==========================================================================
   Gallery — Uniform Shell Creative Hub card grid (page-local)
   ========================================================================== */
body.gallery-page .page-hero{
  min-height:0;
  min-height:unset;
  padding:72px 0 40px;
  justify-content:flex-end;
}
@media(min-width:768px){
  body.gallery-page .page-hero{padding:88px 0 48px}
}
body.gallery-page .page-hero .hero-overlay{
  background:linear-gradient(180deg,rgba(1,63,92,.55) 0%,rgba(1,63,92,.82) 100%);
}
body.gallery-page .page-hero h1{margin:12px 0 10px;max-width:18ch}
body.gallery-page .page-hero .gallery-hero-rule{
  width:48px;height:2px;background:#FFF200;margin:0 0 14px;border:0;
}
body.gallery-page .page-hero p{margin:0;max-width:42ch;font-size:.95rem}
body.gallery-page .page-hero .breadcrumb{margin-bottom:18px}

.gallery-archive{
  background:#fff;
  padding:28px 0 48px;
}
.gallery-archive .gallery-shell{
  max-width:1280px;
  margin:0 auto;
  padding:0 16px;
}
@media(min-width:768px){
  .gallery-archive .gallery-shell{padding:0 24px}
}

/* Meta strip */
.gallery-meta{
  display:flex;flex-wrap:wrap;gap:8px 28px;
  padding:14px 0;
  border-bottom:1px solid #E3E5E0;
  margin-bottom:16px;
  font-family:var(--font-body,inherit);
  font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;
  color:#0A1B2E;
}
.gallery-meta span{color:#5a6570;font-weight:600}
.gallery-meta strong{color:#013F5C;font-weight:700}

/* Toolbar */
.gallery-toolbar{
  display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;
  gap:12px;padding:10px 0 14px;
}
.gallery-toolbar__left{display:flex;flex-wrap:wrap;align-items:center;gap:10px}
.gallery-count{
  display:inline-flex;align-items:center;gap:8px;
  border:1px solid #E3E5E0;background:#fff;
  padding:8px 12px;
  font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;
  color:#013F5C;
}
.gallery-count b{color:#013F5C}
.gallery-sort{
  display:inline-flex;align-items:center;gap:8px;
  font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#5a6570;
}
.gallery-sort select{
  border:1px solid #E3E5E0;background:#fff;color:#013F5C;
  font:inherit;letter-spacing:.08em;text-transform:uppercase;
  padding:8px 10px;cursor:pointer;
}
.gallery-view{
  display:inline-flex;border:1px solid #E3E5E0;
}
.gallery-view button{
  appearance:none;border:0;background:#fff;color:#5a6570;
  font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;
  padding:8px 12px;cursor:pointer;
}
.gallery-view button+button{border-left:1px solid #E3E5E0}
.gallery-view button.is-active{background:#013F5C;color:#FFF200}

/* Filter tabs */
.gallery-filter-bar{
  display:flex;flex-wrap:wrap;gap:8px;
  padding:10px 0 18px;
  position:sticky;top:calc(var(--nav-h,64px) + 4px);
  z-index:20;
  background:rgba(255,255,255,.96);
  backdrop-filter:blur(6px);
  border-bottom:1px solid #E3E5E0;
  margin-bottom:16px;
}
.gf-btn{
  appearance:none;
  padding:8px 12px;
  border:1px solid #013F5C;
  background:transparent;
  border-radius:0;
  font-family:var(--font-body,inherit);
  font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;
  cursor:pointer;color:#013F5C;
  transition:background 150ms ease,color 150ms ease,border-color 150ms ease;
}
.gf-btn:hover{background:rgba(1,63,92,.06)}
.gf-btn.active{
  background:#FFF200;
  border-color:#FFF200;
  color:#013F5C;
}

/* Uniform card grid — EXACT brief CSS */
.gallery-grid{
  display:grid;
  grid-template-columns:repeat(2,1fr);
  gap:8px;
  max-width:1280px;
  margin:0 auto;
  padding:0; /* shell already pads */
  width:100%;
}
@media(min-width:768px){
  .gallery-grid{
    grid-template-columns:repeat(3,1fr);
    gap:12px;
  }
}
@media(min-width:1200px){
  .gallery-grid{
    grid-template-columns:repeat(4,1fr);
    gap:16px;
  }
}
.gallery-tile{
  position:relative;
  overflow:hidden;
  border:1px solid #E3E5E0;
  border-radius:3px;
  background:#fff;
  transition:box-shadow 150ms ease;
  cursor:pointer;
  margin:0;
}
.gallery-tile:hover{box-shadow:0 4px 16px rgba(10,27,46,0.12)}
.gallery-tile.is-hidden{display:none}
.gallery-tile__image{
  height:240px; /* mobile */
  overflow:hidden;
  position:relative;
}
@media(min-width:768px){.gallery-tile__image{height:220px}}
@media(min-width:1200px){.gallery-tile__image{height:260px}}
.gallery-tile__image img,
.gallery-tile__image .gallery-tile__img{
  width:100%;
  height:100%;
  object-fit:cover; /* REQUIRED */
  display:block;
  transition:transform 280ms ease;
}
.gallery-tile:hover .gallery-tile__image img,
.gallery-tile:hover .gallery-tile__img{transform:scale(1.02)}
.gallery-tile__tag{
  position:absolute;
  top:8px;right:8px;
  font-size:10px;
  letter-spacing:0.04em;
  text-transform:uppercase;
  background:rgba(10,27,46,0.85);
  color:#fff;
  padding:3px 6px;
  border-radius:2px;
  z-index:2;
}
.gallery-tile__caption{
  padding:10px 12px;
  font-size:11px;
  letter-spacing:0.03em;
  text-transform:uppercase;
  color:#0A1B2E;
  border-top:1px solid #E3E5E0;
  background:#fff;
  display:flex;align-items:flex-start;gap:8px;
  line-height:1.35;
  min-height:0;
}
.gallery-tile__idx{
  flex:none;
  color:#013F5C;
  opacity:.55;
  font-weight:700;
}
.gallery-tile__text{
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;
}

/* List view — denser, still ≥2 columns */
.gallery-grid.is-list{
  grid-template-columns:repeat(2,1fr);
  gap:8px;
}
@media(min-width:1200px){
  .gallery-grid.is-list{grid-template-columns:repeat(2,1fr);gap:12px}
}
.gallery-grid.is-list .gallery-tile{
  display:grid;
  grid-template-columns:120px 1fr;
}
.gallery-grid.is-list .gallery-tile__image{height:96px}
@media(min-width:768px){
  .gallery-grid.is-list .gallery-tile__image{height:110px}
}
.gallery-grid.is-list .gallery-tile__caption{
  border-top:0;
  border-left:1px solid #E3E5E0;
  align-items:center;
}

/* Lightbox */
#lightbox{
  display:none;position:fixed;inset:0;
  background:rgba(1,63,92,0.96);
  z-index:9998;
  align-items:center;justify-content:center;flex-direction:column;
  padding:24px;
  opacity:0;
}
#lightbox.open{display:flex}
#lightbox.is-ready{opacity:1}
#lb-img{
  max-width:min(920px,88vw);max-height:72vh;width:auto;height:auto;
  object-fit:contain;box-shadow:0 12px 40px rgba(0,0,0,.35);
}
#lb-caption{
  color:rgba(233,237,248,0.88);
  font-size:.78rem;letter-spacing:.12em;text-transform:uppercase;
  margin-top:18px;text-align:center;max-width:640px;
  display:flex;flex-direction:column;align-items:center;gap:8px;
}
#lb-counter{
  color:#FFF200;font-weight:700;letter-spacing:.16em;font-size:.72rem;
}
#lb-close,#lb-prev,#lb-next{
  position:absolute;background:transparent;border:1px solid rgba(255,255,255,.35);
  color:#fff;cursor:pointer;border-radius:0;
  display:flex;align-items:center;justify-content:center;
  transition:border-color 150ms ease,color 150ms ease;
}
#lb-close{top:20px;right:24px;font-size:1.4rem;width:44px;height:44px}
#lb-prev,#lb-next{top:50%;transform:translateY(-50%);font-size:1.3rem;width:48px;height:48px}
#lb-prev{left:20px}#lb-next{right:20px}
#lb-prev:hover,#lb-next:hover,#lb-close:hover{border-color:#FFF200;color:#FFF200}

.g-foot{
  text-align:center;margin-top:36px;padding:28px 20px;
  background:#013F5C;position:relative;
}
.g-foot p{color:rgba(233,237,248,.85)!important;font-size:.92rem}
.g-foot strong{color:#fff}
.g-foot a{color:#FFF200!important;font-weight:700}

@media(prefers-reduced-motion:reduce){
  .gallery-tile,.gallery-tile__image img,.gf-btn,#lightbox{transition:none!important}
  .gallery-tile:hover .gallery-tile__image img{transform:none}
}`;

const pageMarkup = `<div class="page-wrapper">
<section class="page-hero gallery-hero">
  <div class="hero-media" style="background-image:image-set(url('assets/images/group/ops/tanker-loading.jpg?v=80') type('image/jpeg'), url('assets/images/n-slider/1.jpg') type('image/jpeg'))" aria-hidden="true"></div>
  <div class="hero-overlay" aria-hidden="true"></div>
  <div class="container">
  <nav class="breadcrumb"><a href="index.html" data-i18n="nav.home">Home</a><span>/</span><span data-i18n="gallery.1">Gallery</span></nav>
  <div data-i18n="gallery.2" class="eyebrow">Photo Library</div>
  <h1 data-i18n="gallery.3" class="gallery-hero-title">Lake Group Gallery</h1>
  <hr class="gallery-hero-rule" aria-hidden="true">
  <p data-i18n="gallery.4">Real photos from our operations, GCCP concrete plant, MERM Dubai, LPG cylinders, fuel operations and more.</p>
</div></section>

<div id="lightbox" aria-hidden="true">
  <button type="button" id="lb-close" aria-label="Close">&times;</button>
  <button type="button" id="lb-prev" aria-label="Previous">&#8592;</button>
  <img id="lb-img" src="" alt="">
  <div id="lb-caption">
    <span id="lb-counter"></span>
    <span id="lb-caption-text"></span>
  </div>
  <button type="button" id="lb-next" aria-label="Next">&#8594;</button>
</div>

<section class="gallery-archive" id="gallery-archive">
  <div class="gallery-shell">
    <div class="gallery-meta" aria-label="Library summary">
      <div><span>Frames</span> <strong id="gallery-meta-frames">${TOTAL}</strong></div>
      <div><span>Categories</span> <strong>5</strong></div>
      <div><span>Region</span> <strong>East Africa · UAE</strong></div>
    </div>

    <div class="gallery-toolbar">
      <div class="gallery-toolbar__left">
        <div class="gallery-count" id="gallery-count"><b id="gallery-count-n">${TOTAL}</b>&nbsp;Assets</div>
        <label class="gallery-sort">Sort
          <select id="gallery-sort" aria-label="Sort gallery">
            <option value="newest">Newest</option>
            <option value="category">Category</option>
          </select>
        </label>
      </div>
      <div class="gallery-view" role="group" aria-label="View mode">
        <button type="button" class="is-active" data-view="grid" id="view-grid" aria-pressed="true">Grid</button>
        <button type="button" data-view="list" id="view-list" aria-pressed="false">List</button>
      </div>
    </div>

    <div class="gallery-filter-bar" role="tablist" aria-label="Filter by category">
      <button type="button" data-i18n="gallery.9" class="gf-btn active" data-filter="all">All</button>
      <button type="button" data-i18n="gallery.10" class="gf-btn" data-filter="operations">Operations</button>
      <button type="button" data-i18n="gallery.11" class="gf-btn" data-filter="fuel">Fuel &amp; Oil</button>
      <button type="button" data-i18n="gallery.12" class="gf-btn" data-filter="lpg">LPG Gas</button>
      <button type="button" data-i18n="gallery.13" class="gf-btn" data-filter="concrete">GCCP Concrete</button>
      <button type="button" data-i18n="gallery.14" class="gf-btn" data-filter="dubai">MERM Dubai</button>
    </div>

    <div class="gallery-grid" id="gallery-grid">
${tilesHtml}
    </div>

    <div class="g-foot fs-on-dark">
      <p data-i18n="gallery.54" data-i18n-html="">Real photos from Lake Group operations, GCCP, MERM Dubai, Lake Gas, Lake Oil &amp; more.</p>
      <p style="font-size:0.83rem;margin-top:6px" data-i18n="gallery.56" data-i18n-html="">Follow <a href="https://www.instagram.com/lakeoilltd/" target="_blank" rel="noopener">@lakeoilltd</a> on Instagram for the latest updates from the field.</p>
    </div>
  </div>
</section>
<script src="assets/vendor/animejs/anime.umd.min.js"></script>
<script>
(function(){
  const grid = document.getElementById('gallery-grid');
  const countN = document.getElementById('gallery-count-n');
  const metaFrames = document.getElementById('gallery-meta-frames');
  const sortEl = document.getElementById('gallery-sort');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const CAT_ORDER = { operations: 1, fuel: 2, lpg: 3, concrete: 4, dubai: 5 };
  let activeCat = 'all';
  let cur = 0;

  function tiles(){ return [...grid.querySelectorAll('.gallery-tile')]; }
  function visItems(){ return tiles().filter(e => !e.classList.contains('is-hidden')); }

  function updateCount(){
    const n = visItems().length;
    countN.textContent = String(n);
    metaFrames.textContent = String(n);
  }

  function filterGallery(cat, btn){
    activeCat = cat;
    document.querySelectorAll('.gf-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    const shown = [];
    const hidden = [];
    tiles().forEach(el => {
      const show = cat === 'all' || el.dataset.cat === cat;
      el.classList.toggle('is-hidden', !show);
      (show ? shown : hidden).push(el);
    });
    updateCount();
    if (!reduceMotion && window.anime && typeof anime.createTimeline === 'function') {
      const tl = anime.createTimeline({ defaults: { ease: 'outExpo', duration: 320 } });
      tl.add(shown, { opacity: [0, 1], y: [12, 0], delay: anime.stagger(18, { start: 40 }) }, 0);
    }
  }

  function applySort(){
    const mode = sortEl.value;
    const all = tiles();
    all.sort((a, b) => {
      if (mode === 'category') {
        const d = (CAT_ORDER[a.dataset.cat] || 9) - (CAT_ORDER[b.dataset.cat] || 9);
        if (d) return d;
      }
      // newest = original descending index (higher data-index first)
      return Number(b.dataset.index) - Number(a.dataset.index);
    });
    all.forEach(el => grid.appendChild(el));
    // re-number visible captions optionally keep original index from data-index
    tiles().forEach(el => {
      const idx = el.querySelector('.gallery-tile__idx');
      if (idx) idx.textContent = String(Number(el.dataset.index) + 1).padStart(2, '0');
    });
  }

  document.querySelectorAll('.gf-btn').forEach(btn => {
    btn.addEventListener('click', () => filterGallery(btn.dataset.filter, btn));
  });
  sortEl.addEventListener('change', applySort);

  document.getElementById('view-grid').addEventListener('click', function(){
    grid.classList.remove('is-list');
    this.classList.add('is-active'); this.setAttribute('aria-pressed','true');
    const list = document.getElementById('view-list');
    list.classList.remove('is-active'); list.setAttribute('aria-pressed','false');
  });
  document.getElementById('view-list').addEventListener('click', function(){
    grid.classList.add('is-list');
    this.classList.add('is-active'); this.setAttribute('aria-pressed','true');
    const g = document.getElementById('view-grid');
    g.classList.remove('is-active'); g.setAttribute('aria-pressed','false');
  });

  const lb = document.getElementById('lightbox');
  const lbImg = document.getElementById('lb-img');
  const lbText = document.getElementById('lb-caption-text');
  const lbCounter = document.getElementById('lb-counter');

  function showLB(i){
    const all = visItems();
    if (!all.length) return;
    cur = (i + all.length) % all.length;
    const el = all[cur];
    lbImg.src = el.dataset.src;
    lbImg.alt = el.dataset.caption || '';
    const cap = el.querySelector('.gallery-tile__text');
    lbText.textContent = (cap && cap.textContent.trim()) || el.dataset.caption || '';
    lbCounter.textContent = String(cur + 1).padStart(2, '0') + ' / ' + String(all.length).padStart(2, '0');
  }

  function openLightbox(el){
    const all = visItems();
    cur = all.indexOf(el);
    showLB(cur);
    lb.classList.add('open');
    lb.setAttribute('aria-hidden','false');
    document.body.style.overflow = 'hidden';
    if (!reduceMotion && window.anime && typeof anime.animate === 'function') {
      anime.animate(lb, { opacity: [0, 1], duration: 300, ease: 'outExpo' });
      anime.animate(lbImg, { opacity: [0, 1], scale: [0.97, 1], duration: 300, ease: 'outExpo' });
    } else {
      lb.classList.add('is-ready');
      lb.style.opacity = '1';
    }
  }

  function closeLightbox(){
    const done = () => {
      lb.classList.remove('open','is-ready');
      lb.style.opacity = '';
      lb.setAttribute('aria-hidden','true');
      document.body.style.overflow = '';
    };
    if (!reduceMotion && window.anime && typeof anime.animate === 'function' && lb.classList.contains('open')) {
      anime.animate(lb, { opacity: [1, 0], duration: 220, ease: 'outExpo', onComplete: done });
    } else done();
  }

  tiles().forEach(el => {
    el.addEventListener('click', () => openLightbox(el));
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(el); }
    });
  });
  document.getElementById('lb-close').onclick = closeLightbox;
  document.getElementById('lb-prev').onclick = () => showLB(cur - 1);
  document.getElementById('lb-next').onclick = () => showLB(cur + 1);
  document.addEventListener('keydown', e => {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'ArrowLeft') showLB(cur - 1);
    if (e.key === 'ArrowRight') showLB(cur + 1);
    if (e.key === 'Escape') closeLightbox();
  });

  // Default sort: Newest (higher index first)
  applySort();
  updateCount();

  // Motion: headline splitText once + scroll grid reveal
  if (!reduceMotion && window.anime) {
    const { animate, stagger, onScroll, splitText } = anime;
    const title = document.querySelector('.gallery-hero-title');
    if (title && typeof splitText === 'function') {
      const split = splitText(title, { chars: true });
      animate(split.chars, {
        y: ['0.7em', '0em'],
        opacity: [0, 1],
        delay: stagger(18),
        duration: 700,
        ease: 'outExpo'
      });
    }
    const revealTiles = tiles();
    revealTiles.forEach(t => { t.style.opacity = '0'; t.style.transform = 'translateY(16px)'; });
    if (typeof onScroll === 'function') {
      animate(revealTiles, {
        opacity: [0, 1],
        y: [16, 0],
        delay: stagger(40, { from: 'first' }),
        duration: 560,
        ease: 'outExpo',
        autoplay: onScroll({ target: grid, sync: 0.15 })
      });
    } else {
      animate(revealTiles, {
        opacity: [0, 1],
        y: [16, 0],
        delay: stagger(40),
        duration: 560,
        ease: 'outExpo'
      });
    }
  }
})();
</script>
</div>`;

// Replace page-local <style> block
html = html.replace(
  /<style>\n\/\* ==========================================================================\n   MERIDIAN PAGE LAYER  gallery\.html[\s\S]*?<\/style>/,
  `<style>\n${pageCss}\n</style>`
);

// Add body class via script immediately after body — but body tag is plain.
// Prefer: add class to <body>
html = html.replace('<body>', '<body class="gallery-page">');

// Replace from page-wrapper through gallery script closing, before footer
const start = html.indexOf('<div class="page-wrapper">');
const footerIdx = html.indexOf('<footer class="site-footer">');
if (start < 0 || footerIdx < 0) {
  console.error('Could not locate page-wrapper / footer boundaries');
  process.exit(1);
}
html = html.slice(0, start) + pageMarkup + '\n' + html.slice(footerIdx);

// Cache-bust skeleton/flagship if needed — leave as-is
fs.writeFileSync(FILE, html, 'utf8');
console.log('Wrote gallery.html with', TOTAL, 'uniform tiles');
console.log('No masonry spans. Columns: 2 / 3 / 4. Image heights: 240 / 220 / 260.');
