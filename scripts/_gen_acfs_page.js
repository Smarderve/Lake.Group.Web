/* Generate acfs.html — ACFS (African Cargo Freight Station) company page.
 * Reuses the exact nav / mobile nav / footer chrome from aficd.html so the
 * page is pixel-identical to sibling company pages. Content from the official
 * Lake Group app_config (TA.ACFS) dataset.
 */
'use strict';
const fs = require('fs');

const src = fs.readFileSync('aficd.html', 'utf8').replace(/\r\n/g, '\n');

/* ---- extract shared chrome ---- */
const navStart = src.indexOf('<nav class="site-nav"');
const navEnd = src.indexOf('</nav>', navStart) + '</nav>'.length;
const nav = src.slice(navStart, navEnd);

const mobStart = src.indexOf('<div class="nav-mobile"');
const mobEnd = src.indexOf('</div>', mobStart) + '</div>'.length;
const mobNav = src.slice(mobStart, mobEnd);

const footStart = src.indexOf('<footer class="site-footer"');
const footEnd = src.indexOf('</footer>', footStart) + '</footer>'.length;
const footer = src.slice(footStart, footEnd);

/* ---- build page ---- */
const page = `<!DOCTYPE html>
<html class="lg-loading" lang="en">
<head>
  <style id="lg-skel-critical">html.lg-loading{overflow:hidden}html.lg-loading::before{content:"";position:fixed;inset:0;z-index:99989;background:#013f5c;pointer-events:none}html.lg-skel-done::before{display:none}.nav-logo img,.site-nav .nav-logo img{height:var(--nav-logo-height,48px)!important;width:auto!important;max-width:min(220px,55vw)!important;max-height:var(--nav-logo-height,48px)!important;object-fit:contain}</style>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="ACFS (African Cargo Freight Station) - Lake Group's container freight station and empty container depot at Tazara, Pugu Road, Dar es Salaam, with 5,000 TEU capacity and rail link.">
  <meta name="twitter:description" content="ACFS (African Cargo Freight Station) - Lake Group's container freight station and empty container depot at Tazara, Pugu Road, Dar es Salaam, with 5,000 TEU capacity and rail link.">
  <meta name="twitter:title" content="ACFS | Logistics | Lake Group">
  <meta name="twitter:image" content="https://www.lakeoilgroup.com/assets/images/logos/LAKE_GROUP_LOGO.png">
  <meta property="og:site_name" content="Lake Group">
  <meta property="og:url" content="https://www.lakeoilgroup.com/acfs.html">
  <meta property="og:title" content="ACFS | Logistics | Lake Group">
  <meta property="og:description" content="ACFS (African Cargo Freight Station) - Lake Group's container freight station and empty container depot at Tazara, Pugu Road, Dar es Salaam, with 5,000 TEU capacity and rail link.">
  <meta property="og:image" content="https://www.lakeoilgroup.com/assets/images/logos/LAKE_GROUP_LOGO.png">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="canonical" href="https://www.lakeoilgroup.com/acfs.html">
  <link rel="icon" href="favicon.ico?v=43" sizes="32x32">
  <link rel="icon" href="assets/icons/pwa/icon-192.png?v=43" type="image/png" sizes="192x192">
  <link rel="apple-touch-icon" href="assets/icons/pwa/apple-touch-icon.png?v=43">
  <title>ACFS | Logistics | Lake Group</title>
  <meta name="theme-color" content="#0181BB">
  <link rel="manifest" href="manifest.webmanifest">
  <style>
/* ==========================================================================
   MERIDIAN PAGE LAYER - company profile page
   Chrome + shared components come from assets/flagship.css. This block only
   composes generic company-profile widgets reused across all /company pages.
   ========================================================================== */
.fs-check{list-style:none;display:flex;flex-direction:column;margin-top:var(--sp-6)}
.fs-check li{display:flex;gap:14px;align-items:baseline;padding:12px 0;border-bottom:1px solid var(--line-2);font-size:.95rem;color:var(--mute);line-height:1.65}
.fs-check li:first-child{border-top:1px solid var(--line-2)}
.fs-check li span:first-child{color:var(--gold-deep);font-weight:700;flex:none}

.co-logo-row{display:flex;align-items:center;gap:var(--sp-5);margin-bottom:var(--sp-6);flex-wrap:wrap}
.co-logo-row img{height:48px;width:auto;max-width:160px;object-fit:contain;background:transparent;border:none;padding:0;border-radius:0}

.info-panel{background:var(--ink);padding:var(--sp-8);position:relative}
.info-panel h3{font-family:var(--font-display);font-weight:700;font-size:var(--fs-title);letter-spacing:.02em;text-transform:uppercase;color:var(--white);margin-bottom:var(--sp-5)}
.info-row{display:flex;justify-content:space-between;align-items:center;gap:var(--sp-4);padding:13px 0;border-bottom:1px solid var(--ink-line-2)}
.info-row:first-of-type{border-top:1px solid var(--ink-line)}
.info-row>span:first-child{display:inline-flex;align-items:center;gap:8px;color:rgba(233,237,248,0.92);font-size:.92rem}
.info-panel .badge-yellow,.info-panel .badge-amber,.info-row .badge{color:#fff!important;border-color:rgba(255,242,0,0.65)!important;background:rgba(255,242,0,0.16)!important}

.depot-row{padding:14px 0;border-bottom:1px solid var(--ink-line-2)}
.depot-row:first-of-type{border-top:1px solid var(--ink-line)}
.depot-head{display:flex;justify-content:space-between;align-items:center;gap:8px;color:rgba(233,237,248,0.92);font-size:.92rem;font-weight:600}
.depot-head span:first-child{display:inline-flex;align-items:center;gap:8px}
.depot-row p{color:var(--ink-mute);font-size:.84rem;margin:6px 0 0;line-height:1.55}

.stat-panel2{background:var(--ink);padding:var(--sp-8);position:relative}
.stat-panel2 h3{font-family:var(--font-display);font-weight:700;font-size:var(--fs-title);letter-spacing:.02em;text-transform:uppercase;color:var(--white);margin-bottom:var(--sp-6)}
.stat-grid2{display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-6)}
.stat-tile2{position:relative;padding:var(--sp-4) 0 var(--sp-3)}
.stat-tile2::after{content:'';position:absolute;left:0;right:0;bottom:0;height:1px;background:var(--ink-line)}
.stat-tile2::before{content:'';position:absolute;left:0;bottom:-3.5px;width:8px;height:8px;background:var(--gold);z-index:1}
.stat-tile2 .stat-no2{font-family:var(--font-display);font-weight:700;font-size:clamp(2.2rem,4vw,3.2rem);line-height:.95;color:var(--white);display:block}
.stat-tile2 .stat-no2.gold{color:var(--gold)}
.stat-tile2 p{font-size:var(--fs-micro);font-weight:600;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-mute);margin-top:var(--sp-2)}

.val-mini-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:var(--sp-4);margin-top:var(--sp-8)}
@media(max-width:960px){.val-mini-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:600px){.val-mini-grid{grid-template-columns:1fr}}
.val-mini-tile{position:relative;text-align:center;padding:var(--sp-6) var(--sp-4);border:1px solid var(--ink-line-2);background:rgba(255,255,255,0.02)}
.val-mini-tile::before{content:'';position:absolute;top:-1px;left:-1px;width:8px;height:8px;background:var(--gold)}
.val-mini-tile h4{font-family:var(--font-display);font-weight:700;font-size:1.05rem;letter-spacing:.04em;text-transform:uppercase;color:var(--white);margin-bottom:6px}
.val-mini-tile p{font-size:.82rem;color:var(--ink-mute);margin:0;line-height:1.5}

.prod-catalog{display:grid;grid-template-columns:repeat(3,1fr);gap:var(--sp-5)}
@media(max-width:860px){.prod-catalog{grid-template-columns:repeat(2,1fr)}}
@media(max-width:560px){.prod-catalog{grid-template-columns:1fr}}
.prod-catalog-card{background:var(--surface);border:1px solid var(--line-2);padding:var(--sp-5)}
.prod-catalog-card .fs-media{aspect-ratio:4/3;margin-bottom:var(--sp-3);overflow:hidden;background:var(--paper-2)}
.prod-catalog-card .fs-media img{width:100%;height:100%;object-fit:contain;object-position:center;display:block}
.prod-catalog-card .prod-glyph{
  width:64px;height:64px;margin:0 0 var(--sp-4);
  display:flex;align-items:center;justify-content:center;
  background:rgba(1,129,187,0.08);border:1px solid rgba(1,129,187,0.18);
  color:var(--blue-deep, var(--blue));
}
.prod-catalog-card .prod-glyph iconify-icon{display:block;color:inherit}
.prod-catalog-card h4{font-family:var(--font-display);font-weight:700;font-size:1.1rem;letter-spacing:.03em;text-transform:uppercase;color:var(--text)}
.prod-catalog-card p{font-size:.85rem;margin-top:4px;line-height:1.6}

/* Gallery — Lake Oil pattern, compact photo size */
.co-gal{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;width:100%;max-width:820px;margin:0 auto}
.co-gal__item{position:relative;overflow:hidden;margin:0;background:var(--ink-3);aspect-ratio:3/2;border-radius:2px}
.co-gal__item--feat{grid-column:1 / -1;aspect-ratio:2/1}
.co-gal__item img{width:100%;height:100%;object-fit:cover;object-position:center;display:block;transition:transform .45s ease}
.co-gal__item:hover img{transform:scale(1.03)}
.co-gal__cap{position:absolute;left:0;right:0;bottom:0;padding:12px 14px 10px;background:linear-gradient(transparent,rgba(8,16,28,.75));color:#fff;font-size:.68rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;pointer-events:none}
.co-gal-label{margin:var(--sp-6) 0 var(--sp-3);font-size:.72rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--mute)}
@media(max-width:720px){
  .co-gal{gap:8px;max-width:100%}
  .co-gal__item--feat{aspect-ratio:16/10}
}

.ct-info{background:var(--ink);padding:var(--sp-8)}
.ct-info h3{color:var(--white);font-family:var(--font-display);font-weight:700;font-size:1.4rem;text-transform:uppercase;letter-spacing:0.03em;margin-bottom:var(--sp-6)}
.ct-rows{display:flex;flex-direction:column;gap:var(--sp-5)}
.ct-row{display:flex;gap:var(--sp-4);align-items:flex-start}
.ct-ico{width:40px;height:40px;border:1px solid var(--ink-line);display:flex;align-items:center;justify-content:center;font-size:1.05rem;flex-shrink:0}
.ct-label{color:var(--gold);font-size:var(--fs-micro);font-weight:700;text-transform:uppercase;letter-spacing:0.22em;margin-bottom:4px}
.ct-strong{color:var(--white);font-size:0.92rem;display:block}
.ct-dim{color:var(--ink-mute);font-size:0.85rem;display:block}
  </style>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "name": "ACFS (African Cargo Freight Station)",
      "description": "ACFS (African Cargo Freight Station) - Lake Group's container freight station and empty container depot at Tazara, Pugu Road, Dar es Salaam.",
      "url": "https://www.lakeoilgroup.com/acfs.html",
      "parentOrganization": {
        "@type": "Organization",
        "name": "Lake Group",
        "url": "https://www.lakeoilgroup.com/"
      },
      "areaServed": "East and Central Africa"
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.lakeoilgroup.com/" },
        { "@type": "ListItem", "position": 2, "name": "Logistics" },
        { "@type": "ListItem", "position": 3, "name": "ACFS", "item": "https://www.lakeoilgroup.com/acfs.html" }
      ]
    }
  ]
}
</script>
<link rel="stylesheet" href="assets/tokens.css?v=62">
  <link rel="preload" href="assets/fonts/files/jost-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin />
  <link rel="preload" href="assets/fonts/files/jost-latin-700-normal.woff2" as="font" type="font/woff2" crossorigin />
  <link rel="preload" href="assets/fonts/files/jost-latin-ext-400-normal.woff2" as="font" type="font/woff2" crossorigin />
  <link rel="preload" href="assets/fonts/files/jost-latin-ext-700-normal.woff2" as="font" type="font/woff2" crossorigin />
<link rel="stylesheet" href="assets/flagship.css?v=90">
<link rel="stylesheet" href="assets/split-text.css?v=48">
  <link rel="stylesheet" href="assets/assistant.css?v=71">
  <link rel="stylesheet" href="assets/skeleton.css?v=4">
</head><body data-company-logo="assets/images/logos/companies/acfs.png" data-company-alt="ACFS">
  <script src="assets/skeleton.js?v=4"></script>
${nav}



<div class="nav-mobile" id="nav-mobile" style="display:none">
  <a href="index.html" data-i18n="nav.home">Home</a><a href="about.html" data-i18n="nav.about">About</a>
  <div class="mob-section" data-i18n="mob.companies">Subsidiaries</div>
  <div class="mob-accordion">
    <button type="button" class="mob-acc-btn" aria-expanded="false" aria-controls="mob-acc-energies" data-i18n="nav.dd.energies">Lake Energies</button>
    <div class="mob-acc-panel" id="mob-acc-energies" hidden>
      <a href="lake-oil.html" data-i18n="nav.co.lakeOil">Lake Oil</a>
      <a href="lake-aviation.html" data-i18n="nav.co.lakeAviation">Lake Aviation</a>
      <a href="lake-gas.html" data-i18n="nav.co.lakeGas">Lake Gas</a>
      <a href="lake-lubes.html" data-i18n="nav.co.lakeLubes">Lake Lubes</a>
    </div>
    <button type="button" class="mob-acc-btn" aria-expanded="false" aria-controls="mob-acc-manufacturing" data-i18n="nav.dd.manufacturing">Manufacturing</button>
    <div class="mob-acc-panel" id="mob-acc-manufacturing" hidden>
      <a href="lake-buildings.html" data-i18n="nav.co.lakeBuildings">Lake Buildings</a>
      <a href="lake-plastics.html" data-i18n="nav.co.lakePlastics">Lake Plastics</a>
      <a href="lake-steel.html" data-i18n="nav.co.lakeSteel">Lake Steel</a>
      <a href="lake-cylinders.html" data-i18n="nav.co.lakeCylinders">Lake Cylinders</a>
      <a href="gulf-aggregates.html" data-i18n="nav.co.gulfAggregates">Gulf Aggregates</a>
      <a href="atl.html" data-i18n="nav.co.atl">ATL</a>
      <a href="lake-premix-cement.html" data-i18n="nav.co.lakePremixCement">Lake Premix &amp; Cement</a>
    </div>
    <button type="button" class="mob-acc-btn" aria-expanded="false" aria-controls="mob-acc-logistics" data-i18n="nav.dd.logisticsCos">Logistics</button>
    <div class="mob-acc-panel" id="mob-acc-logistics" hidden>
      <a href="acfs.html" data-i18n="nav.co.acfs">ACFS</a>
      <a href="aficd.html" data-i18n="nav.co.aficd">AFICD</a>
      <a href="aill.html" data-i18n="nav.co.aill">AILL</a>
      <a href="lake-trans.html" data-i18n="nav.co.lakeTrans">Lake Trans</a>
    </div>
    <button type="button" class="mob-acc-btn" aria-expanded="false" aria-controls="mob-acc-realestate" data-i18n="nav.dd.realEstate">Real Estate</button>
    <div class="mob-acc-panel" id="mob-acc-realestate" hidden>
      <a href="cross-country.html" data-i18n="nav.co.crossCountry">Cross Country</a>
      <a href="ocean-galleria.html" data-i18n="nav.co.oceanGalleria">Ocean Galleria</a>
    </div>
    <button type="button" class="mob-acc-btn" aria-expanded="false" aria-controls="mob-acc-agro" data-i18n="nav.dd.agro">Agro Processing</button>
    <div class="mob-acc-panel" id="mob-acc-agro" hidden>
      <a href="lake-agro.html" data-i18n="nav.co.lakeAgro">Lake Agro</a>
    </div>
  </div>
  <a href="leadership.html" data-i18n="nav.leadership">Leadership</a>
  <div class="mob-section" data-i18n="mob.company">Corporate</div>
  <a href="history.html" data-i18n="nav.historyShort">History</a><a href="africa-network.html" data-i18n="nav.network">Operations Map</a><a href="csr.html" data-i18n="nav.csrShort">CSR</a>
  <a href="investors.html" data-i18n="nav.investorsShort">Investors</a><a href="projects.html" data-i18n="nav.projectsShort">Projects</a><a href="gallery.html" data-i18n="nav.gallery">Gallery</a>
  <div class="mob-section" data-i18n="mob.more">More</div>
  <a href="news.html" data-i18n="nav.news">News</a><a href="careers.html" data-i18n="nav.careers">Careers</a><a href="contact.html" data-i18n="nav.contact">Contact Us</a>
</div>





<div class="page-wrapper">
<section class="page-hero">
  <div class="hero-media" style="background-image:url('assets/images/acfs/TA/photo_1.jpg')" aria-hidden="true"></div>
  <div class="hero-overlay" aria-hidden="true"></div>
  <div class="container">
    <nav class="breadcrumb"><a href="index.html" data-i18n="nav.home">Home</a><span>/</span><span>Logistics</span><span>/</span><span>ACFS</span></nav>
    <div class="eyebrow">African Cargo Freight Station</div>
    <h1>ACFS</h1>
    <p>Lake Group's container freight station and empty container depot at Tazara, Pugu Road, Dar es Salaam — CFS and empty-container services with rail-linked capacity.</p>
  </div>
</section>

<!-- 1. COMPANY INTRODUCTION -->
<section class="fs-section">
  <div class="container">
    <div class="fs-split-even">
      <div>
        <div class="fs-marker"><span class="fs-marker-no">01</span><span class="fs-eyebrow">Company Introduction</span></div>
        <h2 class="fs-display">The CFS &amp; Empty Container Hub of Dar es Salaam</h2>
        <hr class="fs-rule" style="margin:var(--sp-5) 0">
        <p class="fs-lede">ACFS (African Cargo Freight Station) is Lake Group's container freight station and empty container depot, providing CFS and Empty Container Depot services at Tazara, Pugu Road — one of the fastest growing companies of the Lake Group in Tanzania.</p>
        <p style="margin-top:14px">Located on the main Pugu Road highway in Dar es Salaam, ACFS combines location, rail link and its own transport facility to offer storage, stacking and transportation of empty containers to the port, other ICDs, CFS and client premises — serving shipping lines including COSCO, RAIS Shipping Line and Coral Shipping Line.</p>
        <ul class="fs-check">
          <li><span><iconify-icon icon="mdi:check" width="16" height="16" aria-hidden="true"></iconify-icon></span>Container Freight Station (CFS) services</li>
          <li><span><iconify-icon icon="mdi:check" width="16" height="16" aria-hidden="true"></iconify-icon></span>Empty container depot storage and stacking</li>
          <li><span><iconify-icon icon="mdi:check" width="16" height="16" aria-hidden="true"></iconify-icon></span>Transportation of empty containers to port and client premises</li>
          <li><span><iconify-icon icon="mdi:check" width="16" height="16" aria-hidden="true"></iconify-icon></span>Rail-linked operations on the Tazara corridor</li>
          <li><span><iconify-icon icon="mdi:check" width="16" height="16" aria-hidden="true"></iconify-icon></span>Round-the-clock security and container inspection</li>
        </ul>
      </div>
      <div>
        <div class="info-panel fs-on-dark fs-corners">
          <h3>Terminal At A Glance</h3>
          <div>
            <div class="depot-row">
              <div class="depot-head"><span><img src="assets/images/flags/tz.svg" alt="Tanzania flag" class="flag-icon" width="20" height="15" loading="lazy" decoding="async"> Tanzania</span><span class="badge badge-yellow">ACFS</span></div>
              <p>Tazara, Pugu Road, Dar es Salaam — main road highway, rail linked</p>
            </div>
            <div class="depot-row">
              <div class="depot-head"><span>Yard</span><span class="badge badge-yellow">52,000 m²</span></div>
              <p>Total terminal area of 13 acres with warehouse of 2,100 m²</p>
            </div>
            <div class="depot-row">
              <div class="depot-head"><span>Capacity</span><span class="badge badge-yellow">5,000 TEU</span></div>
              <p>800 laden ground slots (4,000 TEU) and 250 empty ground slots (1,000 TEU)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- 2. ABOUT THE COMPANY -->
<section class="fs-section fs-on-dark">
  <div class="container">
    <div class="fs-marker"><span class="fs-marker-no">02</span><span class="fs-eyebrow">About the Company</span></div>
    <h2 class="fs-display" style="margin-bottom:var(--sp-6)">Mission, Vision &amp; History</h2>
    <div class="fs-split-even">
      <div>
        <h3 style="color:var(--white);font-family:var(--font-display);font-weight:700;font-size:1.3rem;letter-spacing:.03em;text-transform:uppercase;margin-bottom:10px">Mission</h3>
        <p>To provide CFS and empty container depot services with client satisfaction as the ultimate purpose of business — backed by location, rail link and an in-house transport fleet.</p>
      </div>
      <div>
        <h3 style="color:var(--white);font-family:var(--font-display);font-weight:700;font-size:1.3rem;letter-spacing:.03em;text-transform:uppercase;margin-bottom:10px">Vision</h3>
        <p>To be the region's most trusted container freight station, offering comprehensive storage, stacking and transportation services at competitive, quality service.</p>
      </div>
    </div>
    <div style="margin-top:var(--sp-10)">
      <h3 style="color:var(--white);font-family:var(--font-display);font-weight:700;font-size:1.3rem;letter-spacing:.03em;text-transform:uppercase;margin-bottom:10px">History</h3>
      <p style="max-width:80ch;line-height:1.75">ACFS was launched under the AFICD brand — building on three years of rich experience in ICD logistics (AFICD ICD No. 022) — as the Container Freight Station arm (CFS No. 013), commencing CFS operations and growing into one of the Lake Group's fastest expanding companies in Tanzania, serving all major shipping lines at Dar es Salaam port.</p>
    </div>
    <div class="val-mini-grid" aria-label="Core values">
      <div class="val-mini-tile"><h4>Quality</h4><p>No compromise on quality</p></div>
      <div class="val-mini-tile"><h4>Service</h4><p>Committed to excellence</p></div>
      <div class="val-mini-tile"><h4>Safety</h4><p>Safety is first, always</p></div>
      <div class="val-mini-tile"><h4>Professionalism</h4><p>A culture we cherish</p></div>
    </div>
  </div>
</section>

<!-- 3. SERVICES OFFERED -->
<section class="fs-section section-light">
  <div class="container">
    <div class="fs-marker"><span class="fs-marker-no">03</span><span class="fs-eyebrow">Services Offered</span></div>
    <h2 class="fs-display" style="margin-bottom:var(--sp-6)">Container Freight &amp; Depot Services</h2>
    <div class="grid-3">
      <div class="fs-card" style="padding:var(--sp-6)"><h4 style="font-family:var(--font-display);font-weight:700;font-size:1.1rem;letter-spacing:.03em;text-transform:uppercase">Empty Container Depot</h4><p style="font-size:.88rem;margin-top:8px">Storage, stacking and handling of empty containers for all major shipping lines operating at Dar es Salaam port.</p></div>
      <div class="fs-card" style="padding:var(--sp-6)"><h4 style="font-family:var(--font-display);font-weight:700;font-size:1.1rem;letter-spacing:.03em;text-transform:uppercase">Container Storage &amp; Stacking</h4><p style="font-size:.88rem;margin-top:8px">Secure yard storage for flat rack, open top, high cube and reefer containers, stacked by type up to 5-high.</p></div>
      <div class="fs-card" style="padding:var(--sp-6)"><h4 style="font-family:var(--font-display);font-weight:700;font-size:1.1rem;letter-spacing:.03em;text-transform:uppercase">Container Transportation</h4><p style="font-size:.88rem;margin-top:8px">Movement of empty containers to the port, other ICDs, CFS and client premises with an in-house fleet and rail link.</p></div>
      <div class="fs-card" style="padding:var(--sp-6)"><h4 style="font-family:var(--font-display);font-weight:700;font-size:1.1rem;letter-spacing:.03em;text-transform:uppercase">Container Inspection &amp; Repair</h4><p style="font-size:.88rem;margin-top:8px">Containers accepted only after thorough inspection; minor and major repairs by trained technical personnel.</p></div>
      <div class="fs-card" style="padding:var(--sp-6)"><h4 style="font-family:var(--font-display);font-weight:700;font-size:1.1rem;letter-spacing:.03em;text-transform:uppercase">24/7 Security</h4><p style="font-size:.88rem;margin-top:8px">Round-the-clock security guards and CCTV-style vigilance over all container entry, exit and stacking.</p></div>
      <div class="fs-card" style="padding:var(--sp-6)"><h4 style="font-family:var(--font-display);font-weight:700;font-size:1.1rem;letter-spacing:.03em;text-transform:uppercase">SAP-Powered Operations</h4><p style="font-size:.88rem;margin-top:8px">Customized SAP software for ICD operations and financial processes, with IT staff available 24/7.</p></div>
    </div>
</div>
</section>

<!-- 4. TERMINAL FACILITY -->
<section class="fs-section">
  <div class="container">
    <div class="fs-marker"><span class="fs-marker-no">04</span><span class="fs-eyebrow">Terminal Information</span></div>
    <h2 class="fs-display" style="margin-bottom:var(--sp-6)">Facility &amp; Equipment</h2>
    <div class="fs-split-even">
      <div>
        <div class="info-panel fs-on-dark fs-corners">
          <h3>Terminal Facts</h3>
          <div class="info-row"><span><iconify-icon icon="mdi:vector-square" width="16" height="16" aria-hidden="true"></iconify-icon> Total Area</span><span class="badge badge-yellow">13 Acres</span></div>
          <div class="info-row"><span><iconify-icon icon="mdi:vector-square" width="16" height="16" aria-hidden="true"></iconify-icon> Depot Size</span><span class="badge badge-yellow">52,000 m²</span></div>
          <div class="info-row"><span><iconify-icon icon="mdi:cube-outline" width="16" height="16" aria-hidden="true"></iconify-icon> Capacity</span><span class="badge badge-yellow">5,000 TEU</span></div>
          <div class="info-row"><span><iconify-icon icon="mdi:train" width="16" height="16" aria-hidden="true"></iconify-icon> Rail Tracks</span><span class="badge badge-yellow">2</span></div>
          <div class="info-row"><span><iconify-icon icon="mdi:warehouse" width="16" height="16" aria-hidden="true"></iconify-icon> Warehouse</span><span class="badge badge-yellow">2,100 m²</span></div>
          <div class="info-row"><span><iconify-icon icon="mdi:scale" width="16" height="16" aria-hidden="true"></iconify-icon> Weighbridge</span><span class="badge badge-yellow">80 Tons</span></div>
          <div class="info-row"><span><iconify-icon icon="mdi:snowflake" width="16" height="16" aria-hidden="true"></iconify-icon> Reefer Points</span><span class="badge badge-yellow">32</span></div>
        </div>
      </div>
      <div>
        <div class="stat-panel2 fs-on-dark fs-corners">
          <h3>Equipment &amp; Fleet</h3>
          <div class="stat-grid2">
            <div class="stat-tile2"><span class="stat-no2">2</span><p>Reach Stackers</p></div>
            <div class="stat-tile2"><span class="stat-no2">2</span><p>Forklifts (3t &amp; 7t)</p></div>
            <div class="stat-tile2"><span class="stat-no2">50</span><p>Trucks &amp; Trailers</p></div>
            <div class="stat-tile2"><span class="stat-no2">40</span><p>Rail Wagons (Phase 2)</p></div>
            <div class="stat-tile2"><span class="stat-no2">1</span><p>Locomotive (Phase 2)</p></div>
            <div class="stat-tile2"><span class="stat-no2">1</span><p>Empty Container Handler</p></div>
          </div>
        </div>
      </div>
    </div>
</div>
</section>

<!-- 5. GALLERY -->
<section class="fs-section section-light">
  <div class="container">
    <div class="fs-marker"><span class="fs-marker-no">05</span><span class="fs-eyebrow">Images</span></div>
    <h2 class="fs-display" style="margin-bottom:var(--sp-6)">Gallery</h2>
    <div class="co-gal" aria-label="ACFS operations gallery">
      <figure class="co-gal__item co-gal__item--feat">
        <img src="assets/images/acfs/TA/photo_1.jpg" alt="ACFS container freight station" loading="lazy" decoding="async">
        <figcaption class="co-gal__cap">container freight station</figcaption>
      </figure>
      <figure class="co-gal__item">
        <img src="assets/images/acfs/TA/photo_2.jpg" alt="ACFS empty container depot" loading="lazy" decoding="async">
        <figcaption class="co-gal__cap">empty container depot</figcaption>
      </figure>
      <figure class="co-gal__item">
        <img src="assets/images/acfs/TA/photo_3.jpg" alt="ACFS container stacking yard" loading="lazy" decoding="async">
        <figcaption class="co-gal__cap">container stacking yard</figcaption>
      </figure>
      <figure class="co-gal__item">
        <img src="assets/images/acfs/TA/photo_5.jpg" alt="ACFS depot operations" loading="lazy" decoding="async">
        <figcaption class="co-gal__cap">depot operations</figcaption>
      </figure>
      <figure class="co-gal__item">
        <img src="assets/images/acfs/TA/photo_6.jpg" alt="ACFS container handling" loading="lazy" decoding="async">
        <figcaption class="co-gal__cap">container handling</figcaption>
      </figure>
      <figure class="co-gal__item">
        <img src="assets/images/acfs/TA/photo_7.jpg" alt="ACFS rail-linked terminal" loading="lazy" decoding="async">
        <figcaption class="co-gal__cap">rail-linked terminal</figcaption>
      </figure>
      <figure class="co-gal__item">
        <img src="assets/images/acfs/TA/photo_8.jpg" alt="ACFS yard at Tazara, Pugu Road" loading="lazy" decoding="async">
        <figcaption class="co-gal__cap">yard at Tazara</figcaption>
      </figure>
    </div>
</div>
</section>

</div>
${footer}
</body>
</html>
`;

fs.writeFileSync('acfs.html', page.replace(/\n/g, '\r\n'));
console.log('acfs.html written:', fs.statSync('acfs.html').size, 'bytes');
