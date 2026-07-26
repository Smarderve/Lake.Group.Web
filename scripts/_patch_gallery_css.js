const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'gallery.html');
let html = fs.readFileSync(file, 'utf8');

const css = `/* ==========================================================================
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
.gallery-view{display:inline-flex;border:1px solid #E3E5E0}
.gallery-view button{
  appearance:none;border:0;background:#fff;color:#5a6570;
  font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;
  padding:8px 12px;cursor:pointer;
}
.gallery-view button+button{border-left:1px solid #E3E5E0}
.gallery-view button.is-active{background:#013F5C;color:#FFF200}

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

/* Uniform card grid — brief CSS (shell provides side padding) */
.gallery-grid{
  display:grid;
  grid-template-columns:repeat(2, 1fr);
  gap:8px;
  max-width:1280px;
  margin:0 auto;
  padding:0;
  width:100%;
}
@media (min-width: 768px) {
  .gallery-grid {
    grid-template-columns:repeat(3, 1fr);
    gap:12px;
  }
}
@media (min-width: 1200px) {
  .gallery-grid {
    grid-template-columns:repeat(4, 1fr);
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
  height:240px;
  overflow:hidden;
  position:relative;
}
@media (min-width: 768px) { .gallery-tile__image { height:220px; } }
@media (min-width: 1200px) { .gallery-tile__image { height:260px; } }
.gallery-tile__image img{
  width:100%;
  height:100%;
  object-fit:cover;
  display:block;
  transition:transform 280ms ease;
}
.gallery-tile:hover .gallery-tile__image img{transform:scale(1.02)}
.gallery-tile__tag{
  position:absolute;
  top:8px;
  right:8px;
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

.gallery-grid.is-list{
  grid-template-columns:repeat(2, 1fr);
  gap:8px;
}
@media (min-width: 1200px) {
  .gallery-grid.is-list{gap:12px}
}
.gallery-grid.is-list .gallery-tile{
  display:grid;
  grid-template-columns:120px 1fr;
}
.gallery-grid.is-list .gallery-tile__image{height:96px}
@media (min-width: 768px) {
  .gallery-grid.is-list .gallery-tile__image{height:110px}
}
.gallery-grid.is-list .gallery-tile__caption{
  border-top:0;
  border-left:1px solid #E3E5E0;
  align-items:center;
}

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

const start = html.indexOf('<style>\n/* ==========================================================================');
const end = html.indexOf('</style>', start);
if (start < 0 || end < 0) {
  console.error('style block not found', start, end);
  process.exit(1);
}
html = html.slice(0, start) + '<style>\n' + css + '\n</style>' + html.slice(end + '</style>'.length);
fs.writeFileSync(file, html);
console.log('Patched gallery CSS OK');
