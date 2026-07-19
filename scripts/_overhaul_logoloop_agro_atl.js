#!/usr/bin/env node
/**
 * End-to-end: larger LogoLoop, transparent Agro/ATL logos, scrub company CTAs,
 * Agro green chrome, richer ATL/Agro page bodies, download images, cache-bust.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const CACHE = '48';
const COMPANY_PAGES = [
  'lake-oil.html', 'lake-gas.html', 'lake-lubes.html', 'lake-steel.html',
  'lake-trans.html', 'lake-aviation.html', 'lake-buildings.html', 'lake-plastics.html',
  'lake-premix-cement.html', 'lake-cylinders.html', 'lake-agro.html', 'atl.html',
  'gulf-aggregates.html', 'cross-country.html', 'ocean-galleria.html',
  'aficd.html', 'aill.html'
];

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}
function write(rel, s) {
  fs.writeFileSync(path.join(ROOT, rel), s);
  console.log('wrote', rel);
}
function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function get(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('http://') ? http : https;
    lib
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0 LakeGroupBot/1.0' } }, (r) => {
        if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) {
          get(new URL(r.headers.location, url).href).then(resolve, reject);
          return;
        }
        const chunks = [];
        r.on('data', (d) => chunks.push(d));
        r.on('end', () => resolve({ status: r.statusCode, body: Buffer.concat(chunks) }));
      })
      .on('error', reject);
  });
}

async function download(url, destRel) {
  const dest = path.join(ROOT, destRel);
  ensureDir(path.dirname(dest));
  try {
    const r = await get(url);
    if (r.status !== 200 || r.body.length < 500) {
      console.log('skip', url, r.status, r.body.length);
      return false;
    }
    fs.writeFileSync(dest, r.body);
    console.log('dl', destRel, r.body.length);
    return true;
  } catch (e) {
    console.log('dl fail', url, e.message);
    return false;
  }
}

function bumpCache(html) {
  return html
    .replace(/(assets\/(?:tokens|flagship|theme|i18n(?:-content)?|site|motion|flagship-motion|components\/LogoLoop|components\/logo-loop-mount)\.(?:css|js))\?v=\d+/g, `$1?v=${CACHE}`)
    .replace(/(assets\/(?:tokens|flagship|theme)\.css)(?!["?])/g, `$1?v=${CACHE}`)
    .replace(/(logo-loop-mount\.js)(?!["?])/g, `$1?v=${CACHE}`)
    .replace(/(LogoLoop\.css)(?!["?])/g, `$1?v=${CACHE}`);
}

function bumpLogoQuery(html) {
  return html
    .replace(/(assets\/images\/logos\/companies\/(?:atl|lake-agro)\.png)(?:\?v=\d+)?/g, `$1?v=${CACHE}`);
}

/** Remove company-page Contact Us / Leadership CTA blocks (keep global nav/footer). */
function scrubCompanyCtas(html, file) {
  let s = html;

  // Bottom "Contact Us" CTA section used across subsidiaries
  s = s.replace(
    /<!--\s*\d+\.\s*CONTACT\s*-->[\s\S]*?<section class="fs-section[^"]*"[\s\S]*?data-i18n="company\.cta\.lede"[\s\S]*?<\/section>\s*/i,
    ''
  );
  s = s.replace(
    /<section class="fs-section[^"]*">\s*<div class="container">\s*<div class="fs-marker"><span class="fs-marker-no">\d+<\/span><span class="fs-eyebrow"[^>]*>Contact<\/span><\/div>\s*<h2 class="fs-display"[^>]*>Contact [^<]+<\/h2>\s*<p class="fs-lede"[^>]*data-i18n="company\.cta\.lede"[\s\S]*?<\/section>\s*/i,
    ''
  );

  // Inline hero/intro CTAs to contact or leadership
  s = s.replace(
    /\s*<div style="margin-top:32px;display:flex;gap:14px;flex-wrap:wrap">\s*<a href="contact\.html#[^"]+" class="btn btn-outline-dark"[^>]*>[\s\S]*?<\/a>\s*<\/div>/g,
    ''
  );
  s = s.replace(
    /\s*<a href="contact\.html#[^"]+" class="btn btn-(?:primary|outline-dark)(?: btn-lg)?"[^>]*>[\s\S]*?(?:Contact Us|Contact Sales|Contact [^<]+|Get in Touch)<\/a>/gi,
    ''
  );
  s = s.replace(
    /\s*<a href="leadership\.html"[^>]*class="btn[^"]*"[^>]*>[\s\S]*?(?:Our Leadership|Meet (?:the )?(?:Leadership|full team)|Meet Leadership)[\s\S]*?<\/a>/gi,
    ''
  );

  // Agro/ATL info panel links that are pure CTAs to contact directory
  s = s.replace(
    /\s*<div class="ct-row"><div class="ct-ico"[^>]*>🔗<\/div><div><div class="ct-label">On this site<\/div><span class="ct-strong"><a href="contact\.html#[^"]+"[^>]*>Group contact directory<\/a><\/span><\/div><\/div>/g,
    ''
  );
  s = s.replace(
    /\s*<div class="ct-row"><div class="ct-ico"[^>]*>✉️<\/div><div><div class="ct-label">Group Enquiries<\/div><span class="ct-strong"><a href="contact\.html#atl"[^>]*>Contact Lake Group \/ ATL<\/a><\/span><\/div><\/div>/g,
    ''
  );

  // Management "Leadership" CTA footers inside company pages (not leadership bio pages)
  if (!file.startsWith('leadership')) {
    s = s.replace(
      /\s*<div[^>]*>\s*<a href="leadership\.html" class="btn[^"]*"[^>]*>[\s\S]*?<\/a>\s*<\/div>(?=\s*<\/div>\s*<\/section>)/g,
      ''
    );
  }

  return s;
}

function processLogos() {
  const ps1 = path.join(ROOT, 'scripts', '_process_agro_atl_logos.ps1');
  execFileSync(
    'powershell',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ps1],
    { stdio: 'inherit', cwd: ROOT }
  );
}

function enlargeLogoLoop() {
  let mount = read('assets/components/logo-loop-mount.js');
  mount = mount
    .replace(/logoHeight:\s*\d+/, 'logoHeight: 68')
    .replace(/gap:\s*\d+/, 'gap: 56')
    .replace(/logoHeightMobile:\s*\d+/, 'logoHeightMobile: 48')
    .replace(/gapMobile:\s*\d+/, 'gapMobile: 36');
  // cache-bust query on logo srcs
  mount = mount.replace(
    /(src: 'assets\/images\/logos\/companies\/(?:atl|lake-agro)\.png)(?:\?v=\d+)?'/g,
    `$1?v=${CACHE}'`
  );
  write('assets/components/logo-loop-mount.js', mount);

  let css = read('assets/components/LogoLoop.css');
  css = css
    .replace(/--logoloop-gap:\s*\d+px/, '--logoloop-gap: 56px')
    .replace(/--logoloop-logoHeight:\s*\d+px/, '--logoloop-logoHeight: 68px');
  css = css.replace(
    /@media \(max-width:\s*720px\) \{[\s\S]*?--logoloop-gap:\s*\d+px;\s*--logoloop-logoHeight:\s*\d+px;/,
    `@media (max-width: 720px) {
  .logoloop {
    --logoloop-gap: 36px;
    --logoloop-logoHeight: 48px;`
  );
  write('assets/components/LogoLoop.css', css);

  let index = read('index.html');
  index = index.replace(
    /\.marquee-wrap \{\s*background: var\(--color-brand-blue\);\s*padding: \d+px 0;/,
    `.marquee-wrap {
      background: var(--color-brand-blue);
      padding: 18px 0;`
  );
  index = bumpCache(index);
  index = bumpLogoQuery(index);
  // LogoLoop script cache
  index = index.replace(
    /(assets\/components\/logo-loop-mount\.js)(?:\?v=\d+)?/g,
    `$1?v=${CACHE}`
  );
  index = index.replace(
    /(assets\/components\/LogoLoop\.css)(?:\?v=\d+)?/g,
    `$1?v=${CACHE}`
  );
  write('index.html', index);
}

const AGRO_GREEN_CSS = `
/* Lake Agro green theme — full chrome including navbar (scoped to this page).
   Dropdown/lang panel greens + lang contrast live in flagship.css co-theme-agro. */
body.co-theme-agro {
  --gold: var(--color-agro-green-bright);
  --gold-deep: var(--color-agro-green);
  /* Orange accents on green nav (not lime — low contrast vs forest green) */
  --color-yellow-accent: var(--color-agro-orange);
  --yellow: var(--color-agro-orange);
  --color-navbar-bg: var(--color-agro-green);
  --color-navbar-bg-scrolled: rgba(0, 75, 30, 0.96);
  --color-navbar-border: transparent;
  --nav-link-active-color: #fff;
  --color-brand-blue: var(--color-agro-green);
  --color-brand-blue-light: var(--color-agro-green-bright);
  --color-brand-blue-deep: var(--color-agro-green-deep);
  --color-brand-blue-darkest: #012814;
  --btn-primary-bg: var(--color-agro-green-bright);
  --btn-primary-color: #012814;
  --hero-overlay-gradient: linear-gradient(105deg,
    rgba(0, 75, 30, 0.92) 0%,
    rgba(0, 132, 53, 0.75) 45%,
    rgba(0, 132, 53, 0.22) 100%);
}
body.co-theme-agro .site-nav,
body.co-theme-agro .site-nav.nav-scrolled {
  background: var(--color-navbar-bg);
  border-bottom-color: transparent;
}
body.co-theme-agro .site-nav.nav-scrolled {
  background: var(--color-navbar-bg-scrolled);
}
body.co-theme-agro .mobile-nav,
body.co-theme-agro .mobile-nav-panel {
  background: var(--color-agro-green-deep);
}
/* Wide tight-crop Agro mark: keep readable without dominating the bar */
body.co-theme-agro .site-nav .nav-logo img {
  height: calc(var(--nav-logo-height) * 0.88) !important;
  max-height: calc(var(--nav-logo-height) * 0.88);
  max-width: min(220px, 42vw);
}
body.co-theme-agro .site-nav.nav-scrolled .nav-logo img {
  height: calc(var(--nav-logo-height-scrolled) * 0.88) !important;
  max-height: calc(var(--nav-logo-height-scrolled) * 0.88);
}
body.co-theme-agro .page-hero .eyebrow,
body.co-theme-agro .fs-marker-no { color: var(--color-agro-green-bright); }
body.co-theme-agro .badge-yellow {
  border-color: rgba(72, 159, 16, 0.45);
  background: rgba(0, 132, 53, 0.12);
  color: var(--color-agro-green-bright);
}
body.co-theme-agro .val-mini-tile::before,
body.co-theme-agro .stat-tile2::before { background: var(--color-agro-green-bright); }
body.co-theme-agro .fs-section.fs-on-dark {
  background: linear-gradient(160deg, var(--color-agro-green-deep) 0%, #013220 55%, #012814 100%);
}
body.co-theme-agro .info-panel,
body.co-theme-agro .ct-info { background: var(--color-agro-green-deep); }
body.co-theme-agro .btn-outline-dark {
  border-color: var(--color-agro-green);
  color: var(--color-agro-green-deep);
}
body.co-theme-agro .btn-outline-dark:hover {
  background: var(--color-agro-green);
  color: #fff;
  border-color: var(--color-agro-green);
}
body.co-theme-agro .site-footer {
  background: var(--color-agro-green-deep);
}
body.co-theme-agro .footer-motto { color: #c8e63a !important; }
`;

const AGRO_BODY = `<div class="page-wrapper">
<section class="page-hero">
  <div class="hero-media" style="background-image:url('assets/images/lake-agro/slid1.jpg')" aria-hidden="true"></div>
  <div class="hero-overlay" aria-hidden="true"></div>
  <div class="container">
    <nav class="breadcrumb"><a href="index.html" data-i18n="nav.home">Home</a><span>/</span><span>Agro Processing</span><span>/</span><span>Lake Agro</span></nav>
    <div class="eyebrow">Lake Agro · Dar es Salaam</div>
    <h1>Lake Agro</h1>
    <p>Creating customers and food for life through plantations, integrated Ag Parks and agribusiness processing across Africa.</p>
  </div>
</section>

<section class="fs-section" id="why-we-are">
  <div class="container">
    <div class="fs-split-even">
      <div>
        <div class="co-logo-row"><img src="assets/images/logos/companies/lake-agro.png?v=${CACHE}" alt="Lake Agro" width="320" height="72"></div>
        <div class="fs-marker"><span class="fs-marker-no">01</span><span class="fs-eyebrow">Why We Are</span></div>
        <h2 class="fs-display">Food Systems for Africa</h2>
        <hr class="fs-rule" style="margin:var(--sp-5) 0">
        <p class="fs-lede">Private business communities partnering with governments, development financial institutions (DFIs) and initiatives like the Africa Savannahs Initiative to assist Africa to feed itself and create jobs for youth and women.</p>
        <p style="margin-top:14px">At least 233 million people were estimated to be hungry or undernourished in sub-Saharan Africa (UN FAO, 2014). Africa's food challenge is compounded by a population expected to double to 2.4 billion by 2050.</p>
        <p style="margin-top:14px">Africa's Agriculture Status Report 2017 (Alliance for a Green Revolution in Africa) notes the continent's food market is growing rapidly, with opportunities estimated at more than <strong>$1 trillion every year by 2030</strong>, helping substitute food imports with high-value food made in Africa.</p>
      </div>
      <div>
        <div class="info-panel fs-on-dark fs-corners">
          <h3>At a Glance</h3>
          <div>
            <div class="info-row"><span>HQ city</span><span class="badge badge-yellow">Dar es Salaam</span></div>
            <div class="info-row"><span>Email</span><span class="badge badge-yellow">info@lakeagro.com</span></div>
            <div class="info-row"><span>Phone</span><span class="badge badge-yellow">+255 222 780 510</span></div>
            <div class="info-row"><span>Tagline</span><span class="badge badge-yellow">Food for life</span></div>
          </div>
        </div>
        <div class="fs-media" style="margin-top:var(--sp-5);aspect-ratio:16/10"><img src="assets/images/lake-agro/tanzania.jpg" alt="Lake Agro operations in Tanzania" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:cover"></div>
      </div>
    </div>
  </div>
</section>

<section class="fs-section fs-on-dark" id="what-we-are">
  <div class="container">
    <div class="fs-marker"><span class="fs-marker-no">02</span><span class="fs-eyebrow">What We Are</span></div>
    <h2 class="fs-display" style="margin-bottom:var(--sp-6)">Secure · Establish · Consolidate</h2>
    <p class="fs-lede" style="max-width:70ch;margin-bottom:var(--sp-8)">We secure, establish and consolidate farm platforms via greenfield projects or existing farm acquisitions in selected markets within our network of countries where economies of scale can be achieved.</p>
    <div class="grid-3">
      <div class="fs-card" style="padding:var(--sp-6);background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.12)"><h4 style="color:var(--white);font-family:var(--font-display);font-weight:400;font-size:1.05rem;letter-spacing:.03em;text-transform:uppercase">Land Availability</h4><p style="font-size:.86rem;margin-top:6px;color:var(--ink-mute)">Underutilized, cost-effective land with mineralized, diversified soils along water basins and catchments whose mass exceeds farmed land to ensure water perennity over 20 years.</p></div>
      <div class="fs-card" style="padding:var(--sp-6);background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.12)"><h4 style="color:var(--white);font-family:var(--font-display);font-weight:400;font-size:1.05rem;letter-spacing:.03em;text-transform:uppercase">Accessibility</h4><p style="font-size:.86rem;margin-top:6px;color:var(--ink-mute)">Countries connected by rail and established transport corridors for accessible set-up or distribution of final produce within country or for export.</p></div>
      <div class="fs-card" style="padding:var(--sp-6);background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.12)"><h4 style="color:var(--white);font-family:var(--font-display);font-weight:400;font-size:1.05rem;letter-spacing:.03em;text-transform:uppercase">Proximity</h4><p style="font-size:.86rem;margin-top:6px;color:var(--ink-mute)">Multiple continental export hubs across the network region, including major South East and Asia-facing ports and Atlantic hub access in Namibia.</p></div>
      <div class="fs-card" style="padding:var(--sp-6);background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.12)"><h4 style="color:var(--white);font-family:var(--font-display);font-weight:400;font-size:1.05rem;letter-spacing:.03em;text-transform:uppercase">Technical Know-How</h4><p style="font-size:.86rem;margin-top:6px;color:var(--ink-mute)">Established technical capability in-country for ag technology transfer and adequate management of farms and Integrated Ag Parks.</p></div>
      <div class="fs-card" style="padding:var(--sp-6);background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.12)"><h4 style="color:var(--white);font-family:var(--font-display);font-weight:400;font-size:1.05rem;letter-spacing:.03em;text-transform:uppercase">Capital Availability</h4><p style="font-size:.86rem;margin-top:6px;color:var(--ink-mute)">International funding, local ag funding, specialist or development banks, and African institutional funding to bridge food-security needs.</p></div>
      <div class="fs-card" style="padding:var(--sp-6);background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.12)"><h4 style="color:var(--white);font-family:var(--font-display);font-weight:400;font-size:1.05rem;letter-spacing:.03em;text-transform:uppercase">Group Backing</h4><p style="font-size:.86rem;margin-top:6px;color:var(--ink-mute)">Central Lake Group functions (IT, legal, audit, finance, treasury, HR) support Lake Agro operations and growth plans.</p></div>
    </div>
  </div>
</section>

<section class="fs-section section-light" id="how-we-are">
  <div class="container">
    <div class="fs-marker"><span class="fs-marker-no">03</span><span class="fs-eyebrow">How We Are</span></div>
    <h2 class="fs-display" style="margin-bottom:var(--sp-6)">3P Strategy - Prep · Plan · Process</h2>
    <div class="grid-3">
      <div class="fs-card" style="padding:var(--sp-6)"><h4 style="font-family:var(--font-display);font-weight:400;font-size:1.05rem;letter-spacing:.03em;text-transform:uppercase">Prep</h4><p style="font-size:.86rem;margin-top:6px">Deploy Phase 1 growth; rapid turnaround of underperforming Phase 2 acquisitions; lift yields and land development on greenfield plantation farms.</p></div>
      <div class="fs-card" style="padding:var(--sp-6)"><h4 style="font-family:var(--font-display);font-weight:400;font-size:1.05rem;letter-spacing:.03em;text-transform:uppercase">Plan</h4><p style="font-size:.86rem;margin-top:6px">Add Integrated Ag Parks in Phase 1 for consolidation and value addition; select and acquire Phase 2 market-entry farms.</p></div>
      <div class="fs-card" style="padding:var(--sp-6)"><h4 style="font-family:var(--font-display);font-weight:400;font-size:1.05rem;letter-spacing:.03em;text-transform:uppercase">Process</h4><p style="font-size:.86rem;margin-top:6px">Stand up processing as Phase 1 farms stabilize; reorganize value-addition facilities to accommodate Integrated Ag Parks in Phase 2.</p></div>
    </div>
    <p style="margin-top:var(--sp-8);max-width:75ch;line-height:1.7">Target average yields above <strong>11 t/ha</strong> of arable land across commoditized crops including wheat, soybean, maize, rice, sunflower, sugar and protein (beef), with rotational diversification into teak, beans and horticulture (fruit) where land permits.</p>
  </div>
</section>

<section class="fs-section" id="crops">
  <div class="container">
    <div class="fs-marker"><span class="fs-marker-no">04</span><span class="fs-eyebrow">Crops &amp; Outputs</span></div>
    <h2 class="fs-display" style="margin-bottom:var(--sp-6)">Production Focus</h2>
    <div class="prod-catalog">
      <div class="prod-catalog-card"><div class="fs-media" style="aspect-ratio:4/3;margin-bottom:var(--sp-3)"><img src="assets/images/lake-agro/slid2.jpg" alt="Grain and oilseed production" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:cover"></div><h4>Grains &amp; Oilseeds</h4><p>Wheat, maize, rice, soybean and sunflower platforms for regional food security and processing feedstocks.</p></div>
      <div class="prod-catalog-card"><div class="fs-media" style="aspect-ratio:4/3;margin-bottom:var(--sp-3)"><img src="assets/images/lake-agro/slid1.jpg" alt="Plantation and sugar crops" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:cover"></div><h4>Sugar &amp; Cash Crops</h4><p>Sugar and related cash crops as core processing feedstocks within the Ag Park model.</p></div>
      <div class="prod-catalog-card"><div class="fs-media" style="aspect-ratio:4/3;margin-bottom:var(--sp-3)"><img src="assets/images/lake-agro/tanzania.jpg" alt="Protein and diversification crops" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:cover"></div><h4>Protein &amp; Diversification</h4><p>Beef protein plus teak, beans and fruit horticulture in buffer spaces where land permits.</p></div>
    </div>
  </div>
</section>

<section class="fs-section fs-on-dark" id="projects">
  <div class="container">
    <div class="fs-marker"><span class="fs-marker-no">05</span><span class="fs-eyebrow">Projects</span></div>
    <h2 class="fs-display" style="margin-bottom:var(--sp-6)">Plantations &amp; Ag Parks</h2>
    <div class="fs-split-even">
      <div>
        <h3 style="color:var(--white);font-family:var(--font-display);font-weight:400;font-size:1.25rem;letter-spacing:.03em;text-transform:uppercase;margin-bottom:12px">Serenje Plantation</h3>
        <p style="color:var(--ink-mute);line-height:1.7">Operations oversee the Serenje plantation platform with specialties in agronomy, crop harvesting, disease control, seed/fertilizer/input management, equipment procurement, works contracting and irrigation project oversight.</p>
      </div>
      <div>
        <h3 style="color:var(--white);font-family:var(--font-display);font-weight:400;font-size:1.25rem;letter-spacing:.03em;text-transform:uppercase;margin-bottom:12px">Integrated Ag Parks</h3>
        <p style="color:var(--ink-mute);line-height:1.7">Ag Parks consolidate produce and add value through processing. As the first Ag Park team is constituted, capacity is expected to roughly double, supported by Rising Stars projects that attract and retain talent.</p>
      </div>
    </div>
  </div>
</section>

<section class="fs-section section-light" id="human-capital">
  <div class="container">
    <div class="fs-marker"><span class="fs-marker-no">06</span><span class="fs-eyebrow">People</span></div>
    <h2 class="fs-display" style="margin-bottom:var(--sp-6)">Human Capital</h2>
    <p style="max-width:75ch;line-height:1.7;margin-bottom:var(--sp-6)">People are Lake Agro's biggest company asset. Farming does not exist without human capital and equity. About 60 roles oversee Serenje plantation and Tanzania regional offices, scaling as Ag Park teams form.</p>
    <div class="val-mini-grid">
      <div class="val-mini-tile"><h4>Agronomy</h4><p>Crop science, harvesting, disease control</p></div>
      <div class="val-mini-tile"><h4>Inputs</h4><p>Seed, fertilizer and input management</p></div>
      <div class="val-mini-tile"><h4>Equipment</h4><p>Fleet management and procurement</p></div>
      <div class="val-mini-tile"><h4>Irrigation</h4><p>Works, contracting and water projects</p></div>
      <div class="val-mini-tile"><h4>Finance</h4><p>Control, treasury and planning</p></div>
      <div class="val-mini-tile"><h4>Strategy</h4><p>Ag project planning and leadership</p></div>
      <div class="val-mini-tile"><h4>Group IT/Legal</h4><p>Shared Lake Group central roles</p></div>
      <div class="val-mini-tile"><h4>Talent</h4><p>Rising Stars and sustainability pools</p></div>
    </div>
  </div>
</section>

<section class="fs-section" id="commitments">
  <div class="container">
    <div class="fs-marker"><span class="fs-marker-no">07</span><span class="fs-eyebrow">Commitments</span></div>
    <h2 class="fs-display" style="margin-bottom:var(--sp-6)">Programs &amp; Pledge</h2>
    <div class="grid-3">
      <div class="fs-card" style="padding:var(--sp-6)"><h4 style="font-family:var(--font-display);font-weight:400;font-size:1.05rem;letter-spacing:.03em;text-transform:uppercase">Food Security</h4><p style="font-size:.86rem;margin-top:6px">Substitute imports with high-value food made in Africa through plantation scale and processing.</p></div>
      <div class="fs-card" style="padding:var(--sp-6)"><h4 style="font-family:var(--font-display);font-weight:400;font-size:1.05rem;letter-spacing:.03em;text-transform:uppercase">Jobs</h4><p style="font-size:.86rem;margin-top:6px">Create employment for youth and women across farm teams, Ag Parks and supporting value chains.</p></div>
      <div class="fs-card" style="padding:var(--sp-6)"><h4 style="font-family:var(--font-display);font-weight:400;font-size:1.05rem;letter-spacing:.03em;text-transform:uppercase">Sustainability</h4><p style="font-size:.86rem;margin-top:6px">Operate plantations and parks for long-term financial, social and production sustainability day in, day out.</p></div>
    </div>
  </div>
</section>

<section class="fs-section fs-on-dark" id="reach">
  <div class="container">
    <div class="fs-marker"><span class="fs-marker-no">08</span><span class="fs-eyebrow">Locations</span></div>
    <h2 class="fs-display" style="margin-bottom:var(--sp-6)">Reach Lake Agro</h2>
    <div class="ct-info fs-corners">
      <h3>Lake Agro</h3>
      <div class="ct-rows">
        <div class="ct-row"><div class="ct-ico" aria-hidden="true">📍</div><div><div class="ct-label">Location</div><span class="ct-strong">Dar es Salaam, Tanzania</span><span class="ct-dim">Regional offices + plantation operations (Serenje)</span></div></div>
        <div class="ct-row"><div class="ct-ico" aria-hidden="true">✉️</div><div><div class="ct-label">Email</div><span class="ct-strong"><a href="mailto:info@lakeagro.com" style="color:var(--gold)">info@lakeagro.com</a></span></div></div>
        <div class="ct-row"><div class="ct-ico" aria-hidden="true">📞</div><div><div class="ct-label">Phone</div><span class="ct-strong"><a href="tel:+255222780510" style="color:var(--gold)">+255 222 780 510</a></span></div></div>
        <div class="ct-row"><div class="ct-ico" aria-hidden="true">🌐</div><div><div class="ct-label">Website</div><span class="ct-strong">lakeagro.com</span><span class="ct-dim">Content mirrored on this Lake Group page</span></div></div>
      </div>
    </div>
  </div>
</section>

</div>`;

const ATL_BODY = `<div class="page-wrapper">
<section class="page-hero">
  <div class="hero-media" style="background-image:url('assets/images/atl/tanker-1.jpg')" aria-hidden="true"></div>
  <div class="hero-overlay" aria-hidden="true"></div>
  <div class="container">
    <nav class="breadcrumb"><a href="index.html" data-i18n="nav.home">Home</a><span>/</span><span>Manufacturing</span><span>/</span><span>ATL</span></nav>
    <div class="eyebrow">ATL Limited · Est. 2019</div>
    <h1>ATL</h1>
    <p>Aluminium Trailers Ltd - Tanzania's aluminium fuel tanker and custom trailer manufacturer. Your trailer partner.</p>
  </div>
</section>

<section class="fs-section" id="intro">
  <div class="container">
    <div class="fs-split-even">
      <div>
        <div class="co-logo-row"><img src="assets/images/logos/companies/atl.png?v=${CACHE}" alt="ATL Aluminium Trailers" width="280" height="140"></div>
        <div class="fs-marker"><span class="fs-marker-no">01</span><span class="fs-eyebrow">Company Introduction</span></div>
        <h2 class="fs-display">Engineered To Last</h2>
        <hr class="fs-rule" style="margin:var(--sp-5) 0">
        <p class="fs-lede">ATL Limited (Aluminum Trailers Ltd), established in 2019, is the only manufacturer of high-quality aluminum trailers in Tanzania. We specialize in innovative, durable fuel transportation solutions for East and Central Africa.</p>
        <p style="margin-top:14px">With a focus on excellence, ATL has earned a reputation as a reliable name in trailer manufacturing, delivering tankers that consistently meet and surpass customer expectations. Our strategy expands the range into premium customized trailers across the region.</p>
        <ul class="fs-check">
          <li><span>&#10003;</span>Only aluminium trailer manufacturer in Tanzania</li>
          <li><span>&#10003;</span>Fuel tankers engineered for African operating conditions</li>
          <li><span>&#10003;</span>Custom builds with technical support and warranty</li>
          <li><span>&#10003;</span>Facility at Kipawa, Nyerere Road (opp. JNIA Terminal 3)</li>
        </ul>
      </div>
      <div>
        <div class="info-panel fs-on-dark fs-corners">
          <h3>At a Glance</h3>
          <div>
            <div class="info-row"><span>Established</span><span class="badge badge-yellow">2019</span></div>
            <div class="info-row"><span>Specialty</span><span class="badge badge-yellow">Aluminium tankers</span></div>
            <div class="info-row"><span>Location</span><span class="badge badge-yellow">Dar es Salaam</span></div>
            <div class="info-row"><span>Hours</span><span class="badge badge-yellow">Mon-Fri 8:00-16:30</span></div>
            <div class="info-row"><span>Saturday</span><span class="badge badge-yellow">8:00-12:30</span></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="fs-section fs-on-dark" id="about">
  <div class="container">
    <div class="fs-marker"><span class="fs-marker-no">02</span><span class="fs-eyebrow">About the Company</span></div>
    <h2 class="fs-display" style="margin-bottom:var(--sp-6)">Mission, Vision &amp; Values</h2>
    <div class="fs-split-even">
      <div>
        <h3 style="color:var(--white);font-family:var(--font-display);font-weight:400;font-size:1.3rem;letter-spacing:.03em;text-transform:uppercase;margin-bottom:10px">Mission</h3>
        <p>To design and manufacture the highest quality trailers by fostering a culture of integrity, excellence, and continuous improvement.</p>
      </div>
      <div>
        <h3 style="color:var(--white);font-family:var(--font-display);font-weight:400;font-size:1.3rem;letter-spacing:.03em;text-transform:uppercase;margin-bottom:10px">Vision</h3>
        <p>To become the leading trailer manufacturer in East and Central Africa, providing sustainable solutions focused on safety, innovation and customization.</p>
      </div>
    </div>
    <div class="val-mini-grid">
      <div class="val-mini-tile"><h4>Integrity</h4><p>Honesty, transparency and accountability. We deliver on promises and maintain a strong moral compass.</p></div>
      <div class="val-mini-tile"><h4>People</h4><p>Employees are our greatest asset - safety, inclusion, professional development and a positive culture.</p></div>
      <div class="val-mini-tile"><h4>Sustainability</h4><p>Lower impact materials and processes; products that support greener transport requirements.</p></div>
      <div class="val-mini-tile"><h4>Customers</h4><p>Long-term partners built on trust, value, quality and reliability - not one-off sales.</p></div>
    </div>
  </div>
</section>

<section class="fs-section section-light" id="brand-promise">
  <div class="container">
    <div class="fs-marker"><span class="fs-marker-no">03</span><span class="fs-eyebrow">Brand Promise</span></div>
    <h2 class="fs-display" style="margin-bottom:var(--sp-6)">Savings · Safety · Solutions</h2>
    <div class="grid-3">
      <div class="fs-card" style="padding:var(--sp-6)">
        <h4 style="font-family:var(--font-display);font-weight:400;font-size:1.2rem;letter-spacing:.03em;text-transform:uppercase;margin-bottom:10px">Savings</h4>
        <ul class="fs-check" style="margin-top:0">
          <li><span>&#10003;</span>Light trailers</li>
          <li><span>&#10003;</span>More payload</li>
          <li><span>&#10003;</span>Increased fuel efficiency</li>
          <li><span>&#10003;</span>Long-term savings on maintenance and repairs</li>
        </ul>
      </div>
      <div class="fs-card" style="padding:var(--sp-6)">
        <h4 style="font-family:var(--font-display);font-weight:400;font-size:1.2rem;letter-spacing:.03em;text-transform:uppercase;margin-bottom:10px">Safety</h4>
        <ul class="fs-check" style="margin-top:0">
          <li><span>&#10003;</span>Air suspension for tankers</li>
          <li><span>&#10003;</span>Reliable braking systems</li>
          <li><span>&#10003;</span>Strategic flooding points</li>
          <li><span>&#10003;</span>Secure coupling systems</li>
          <li><span>&#10003;</span>High-visibility reflectors</li>
        </ul>
      </div>
      <div class="fs-card" style="padding:var(--sp-6)">
        <h4 style="font-family:var(--font-display);font-weight:400;font-size:1.2rem;letter-spacing:.03em;text-transform:uppercase;margin-bottom:10px">Solutions</h4>
        <ul class="fs-check" style="margin-top:0">
          <li><span>&#10003;</span>Customized tailor designs</li>
          <li><span>&#10003;</span>Technical support</li>
          <li><span>&#10003;</span>Warranty and maintenance</li>
          <li><span>&#10003;</span>Personalized service</li>
          <li><span>&#10003;</span>Cost-effectiveness</li>
        </ul>
      </div>
    </div>
  </div>
</section>

<section class="fs-section" id="why-aluminium">
  <div class="container">
    <div class="fs-marker"><span class="fs-marker-no">04</span><span class="fs-eyebrow">Why Aluminium</span></div>
    <h2 class="fs-display" style="margin-bottom:var(--sp-6)">Material Advantages</h2>
    <div class="grid-3">
      <div class="fs-card" style="padding:var(--sp-6)"><h4 style="font-family:var(--font-display);font-weight:400;font-size:1.05rem;letter-spacing:.03em;text-transform:uppercase">Non-Reactive</h4><p style="font-size:.86rem;margin-top:6px">Aluminum is non-reactive with most fuels, helping prevent contamination - especially important for sensitive fuels including aviation fuel.</p></div>
      <div class="fs-card" style="padding:var(--sp-6)"><h4 style="font-family:var(--font-display);font-weight:400;font-size:1.05rem;letter-spacing:.03em;text-transform:uppercase">Corrosion Resistant</h4><p style="font-size:.86rem;margin-top:6px">Naturally resists rust in harsh weather and moisture, reducing maintenance and prolonging tanker life.</p></div>
      <div class="fs-card" style="padding:var(--sp-6)"><h4 style="font-family:var(--font-display);font-weight:400;font-size:1.05rem;letter-spacing:.03em;text-transform:uppercase">Fuel Efficiency</h4><p style="font-size:.86rem;margin-top:6px">Lower tare weight means more legal payload and less energy to haul the tanker.</p></div>
      <div class="fs-card" style="padding:var(--sp-6)"><h4 style="font-family:var(--font-display);font-weight:400;font-size:1.05rem;letter-spacing:.03em;text-transform:uppercase">Strength &amp; Safety</h4><p style="font-size:.86rem;margin-top:6px">High strength-to-weight ratio for transport stresses, with impact absorption that supports operational safety.</p></div>
      <div class="fs-card" style="padding:var(--sp-6)"><h4 style="font-family:var(--font-display);font-weight:400;font-size:1.05rem;letter-spacing:.03em;text-transform:uppercase">Environment</h4><p style="font-size:.86rem;margin-top:6px">Highly recyclable aluminium with lower recycling energy versus primary production - aligned with strict fuel-transport standards.</p></div>
      <div class="fs-card" style="padding:var(--sp-6)"><h4 style="font-family:var(--font-display);font-weight:400;font-size:1.05rem;letter-spacing:.03em;text-transform:uppercase">Custom Range</h4><p style="font-size:.86rem;margin-top:6px">Expanding beyond fuel tankers into premium customized trailers for regional logistics needs.</p></div>
    </div>
  </div>
</section>

<section class="fs-section section-light" id="products">
  <div class="container">
    <div class="fs-marker"><span class="fs-marker-no">05</span><span class="fs-eyebrow">Products</span></div>
    <h2 class="fs-display" style="margin-bottom:var(--sp-6)">Tankers &amp; Custom Trailers for Africa</h2>
    <p class="fs-lede" style="max-width:70ch;margin-bottom:var(--sp-6)">Discover our range of high-quality aluminum fuel tankers designed for safety, durability, and efficiency. Each model is built to meet industry standards and tailored to your specific needs.</p>
    <div class="prod-catalog">
      <div class="prod-catalog-card">
        <div class="fs-media" style="aspect-ratio:4/3;margin-bottom:var(--sp-3)"><img src="assets/images/atl/tanker-1.jpg" alt="ATL aluminium fuel tanker" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:cover"></div>
        <h4>Aluminium Fuel Tankers</h4>
        <p>High-quality aluminum fuel tankers designed for safety, durability and efficiency on African routes.</p>
      </div>
      <div class="prod-catalog-card">
        <div class="fs-media" style="aspect-ratio:4/3;margin-bottom:var(--sp-3)"><img src="assets/images/atl/tanker-2.jpg" alt="ATL trailer manufacturing" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:cover"></div>
        <h4>Custom Trailers</h4>
        <p>Tailored trailer configurations to match payload, coupling and operating requirements.</p>
      </div>
      <div class="prod-catalog-card">
        <div class="fs-media" style="aspect-ratio:4/3;margin-bottom:var(--sp-3)"><img src="assets/images/atl/tanker-3.png" alt="ATL tanker detail" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:cover"></div>
        <h4>Support &amp; Warranty</h4>
        <p>Technical support, warranty coverage and maintenance partnership after delivery.</p>
      </div>
    </div>
    <div class="img-mosaic" style="margin-top:var(--sp-8)">
      <div class="fs-media"><img src="assets/images/atl/facility-1.jpg" alt="ATL facility and tanker" loading="lazy" decoding="async"></div>
      <div class="fs-media"><img src="assets/images/atl/facility-2.jpg" alt="ATL manufacturing" loading="lazy" decoding="async"></div>
      <div class="fs-media"><img src="assets/images/atl/tanker-1.jpg" alt="ATL aluminium tanker on road" loading="lazy" decoding="async"></div>
      <div class="fs-media"><img src="assets/images/atl/tanker-2.jpg" alt="ATL custom trailer build" loading="lazy" decoding="async"></div>
    </div>
  </div>
</section>

<section class="fs-section fs-on-dark" id="testimonials">
  <div class="container">
    <div class="fs-marker"><span class="fs-marker-no">06</span><span class="fs-eyebrow">Testimonials</span></div>
    <h2 class="fs-display" style="margin-bottom:var(--sp-6)">What Clients Say</h2>
    <p style="max-width:70ch;margin-bottom:var(--sp-6);color:var(--ink-mute)">At ATL, we pride ourselves on trailers that deliver unmatched performance, durability, and value. Hear from the people who rely on our aluminum trailers every day.</p>
    <div class="fs-split-even">
      <blockquote style="margin:0;padding:0;border:none">
        <p style="font-size:1.05rem;line-height:1.7;color:var(--ink-mute)">"Thank you, Aluminum Trailers Limited. Looking forward for more transformation of our trailers with you. As you won't find a better customer servicing of high quality manufacturing anywhere else in East Africa, it just allows us to rely on you comfortably."</p>
        <p style="margin-top:14px;color:var(--gold);font-weight:700;letter-spacing:.06em;text-transform:uppercase;font-size:.78rem">MOIL Company CEO</p>
      </blockquote>
      <blockquote style="margin:0;padding:0;border:none">
        <p style="font-size:1.05rem;line-height:1.7;color:var(--ink-mute)">"From fabrication to manufacturing quality - the effective best manufacturing tanker company I have dealt with. Higher volumes loaded, many trips in a short time. The overall merits of the trailer are amazing."</p>
        <p style="margin-top:14px;color:var(--gold);font-weight:700;letter-spacing:.06em;text-transform:uppercase;font-size:.78rem">Orange Gas Co. Ltd CEO</p>
      </blockquote>
    </div>
  </div>
</section>

<section class="fs-section section-light" id="partners">
  <div class="container">
    <div class="fs-marker"><span class="fs-marker-no">07</span><span class="fs-eyebrow">Partners</span></div>
    <h2 class="fs-display" style="margin-bottom:var(--sp-6)">Financial Partners</h2>
    <p class="fs-lede" style="max-width:65ch;margin-bottom:var(--sp-6)">ATL works with leading regional financial and commercial partners supporting fleet and manufacturing growth.</p>
    <div class="prod-catalog">
      <div class="prod-catalog-card" style="display:flex;align-items:center;justify-content:center;min-height:120px"><img src="assets/images/atl/partner-crdb.png" alt="CRDB" loading="lazy" style="max-height:64px;width:auto;object-fit:contain"></div>
      <div class="prod-catalog-card" style="display:flex;align-items:center;justify-content:center;min-height:120px"><img src="assets/images/atl/partner-stanbic.jpg" alt="Stanbic" loading="lazy" style="max-height:64px;width:auto;object-fit:contain"></div>
      <div class="prod-catalog-card" style="display:flex;align-items:center;justify-content:center;min-height:120px"><img src="assets/images/atl/partner-kcb.jpg" alt="KCB" loading="lazy" style="max-height:48px;width:auto;object-fit:contain"></div>
    </div>
  </div>
</section>

<section class="fs-section" id="visit">
  <div class="container">
    <div class="fs-marker"><span class="fs-marker-no">08</span><span class="fs-eyebrow">Location</span></div>
    <h2 class="fs-display" style="margin-bottom:var(--sp-6)">Visit ATL</h2>
    <div class="ct-info fs-on-dark fs-corners">
      <h3>ATL Limited</h3>
      <div class="ct-rows">
        <div class="ct-row"><div class="ct-ico" aria-hidden="true">📍</div><div><div class="ct-label">Address</div><span class="ct-strong">Kipawa, Nyerere Road</span><span class="ct-dim">Opposite Julius Nyerere Airport Terminal 3, Dar es Salaam</span></div></div>
        <div class="ct-row"><div class="ct-ico" aria-hidden="true">🕒</div><div><div class="ct-label">Work Hours</div><span class="ct-strong">Mon-Fri 8:00am - 16:30pm</span><span class="ct-dim">Sat 8:00am - 12:30pm</span></div></div>
        <div class="ct-row"><div class="ct-ico" aria-hidden="true">🌐</div><div><div class="ct-label">Website</div><span class="ct-strong">atl-tz.com</span><span class="ct-dim">Content mirrored on this Lake Group page</span></div></div>
      </div>
    </div>
  </div>
</section>

</div>`;

function replacePageBody(html, bodyHtml) {
  const startMatch = html.match(/<div class="page-wrapper">/);
  const footerIdx = html.indexOf('<footer class="site-footer">');
  if (!startMatch || footerIdx < 0) throw new Error('page-wrapper / footer bounds missing');
  // bodyHtml must include opening + closing page-wrapper; do not keep the old wrapper close
  return html.slice(0, startMatch.index) + bodyHtml + '\n\n' + html.slice(footerIdx);
}

function replaceAgroThemeCss(html) {
  // Replace existing co-theme-agro block inside <style>
  if (/body\.co-theme-agro\s*\{/.test(html)) {
    return html.replace(
      /\/\* Lake Agro green theme[\s\S]*?(?=<\/style>)/,
      AGRO_GREEN_CSS.trim() + '\n'
    );
  }
  return html.replace('</style>', AGRO_GREEN_CSS + '\n  </style>');
}

function updateAgroPage() {
  let html = read('lake-agro.html');
  html = replaceAgroThemeCss(html);
  html = html.replace(
    /<meta name="theme-color" content="[^"]*">/,
    '<meta name="theme-color" content="#008435">'
  );
  html = replacePageBody(html, AGRO_BODY);
  html = scrubCompanyCtas(html, 'lake-agro.html');
  html = bumpCache(html);
  html = bumpLogoQuery(html);
  // Remove em-dashes if any slipped in
  html = html.replace(/\u2014/g, '-').replace(/\u2013/g, '-');
  write('lake-agro.html', html);
}

function updateAtlPage() {
  let html = read('atl.html');
  // Ensure ATL keeps Lake Group blue chrome (no agro theme class)
  html = html.replace(/\s*class="co-theme-agro"/g, '');
  html = html.replace(
    /<meta name="theme-color" content="[^"]*">/,
    '<meta name="theme-color" content="#0181BB">'
  );
  html = replacePageBody(html, ATL_BODY);
  html = scrubCompanyCtas(html, 'atl.html');
  html = bumpCache(html);
  html = bumpLogoQuery(html);
  html = html.replace(/\u2014/g, '-').replace(/\u2013/g, '-');
  write('atl.html', html);
}

function scrubAllCompanyPages() {
  for (const f of COMPANY_PAGES) {
    if (f === 'lake-agro.html' || f === 'atl.html') continue; // handled above
    const p = path.join(ROOT, f);
    if (!fs.existsSync(p)) continue;
    let html = read(f);
    const before = html;
    html = scrubCompanyCtas(html, f);
    html = bumpLogoQuery(html);
    html = bumpCache(html);
    if (html !== before) write(f, html);
    else console.log('no scrub changes', f);
  }
}

function bumpMegamenuLogos() {
  // All HTML files that reference atl/lake-agro logos
  for (const f of fs.readdirSync(ROOT).filter((x) => x.endsWith('.html'))) {
    let html = read(f);
    const next = bumpLogoQuery(html);
    if (next !== html) write(f, next);
  }
  // templates
  for (const f of ['scripts/templates/nav.html', 'scripts/templates/mobile_nav.html', 'scripts/templates/footer.html']) {
    const p = path.join(ROOT, f);
    if (!fs.existsSync(p)) continue;
    let html = read(f);
    const next = bumpLogoQuery(html);
    if (next !== html) write(f, next);
  }
}

async function downloadAssets() {
  ensureDir(path.join(ROOT, 'assets/images/lake-agro'));
  ensureDir(path.join(ROOT, 'assets/images/atl'));
  await download('https://lakeagro.com/assets/images/banner-slider/banner/slid1.jpg', 'assets/images/lake-agro/slid1.jpg');
  await download('https://lakeagro.com/assets/images/banner-slider/banner/slid2.jpg', 'assets/images/lake-agro/slid2.jpg');
  await download('https://lakeagro.com/assets/images/banner-slider/banner/Tanzania.jpg', 'assets/images/lake-agro/tanzania.jpg');
  await download('https://lakeagro.com/assets/images/logoresizey.png', 'scripts/_scraped/agro_logoresizey.png');
  await download('https://lakeagro.com/assets/images/logo2.png', 'scripts/_scraped/agro_logo2.png');

  await download('https://atl-tz.com/wp-content/uploads/2025/04/logo_yellow.jpg', 'scripts/_scraped/atl_logo_src.jpg');
  await download('https://atl-tz.com/wp-content/uploads/2025/02/1-2.jpg', 'assets/images/atl/facility-1.jpg');
  await download('https://atl-tz.com/wp-content/uploads/2025/02/39.jpg', 'assets/images/atl/facility-2.jpg');
  await download('https://atl-tz.com/wp-content/uploads/2025/02/46-qu1wm36pke816ngzqbe4u9h1r5e63spqo7k60ix8xc.png', 'assets/images/atl/tanker-3.png');
  await download('https://atl-tz.com/wp-content/uploads/2025/03/CRDB.png', 'assets/images/atl/partner-crdb.png');
  await download('https://atl-tz.com/wp-content/uploads/2025/03/STANBIC.jpg', 'assets/images/atl/partner-stanbic.jpg');
  await download('https://atl-tz.com/wp-content/uploads/2025/03/KCB.jpg', 'assets/images/atl/partner-kcb.jpg');

  // Scrape extra agro pages for offline archive
  for (const page of ['about.html', 'projects.html', 'commitments.html', 'contact.html', 'gallery.html']) {
    await download('https://lakeagro.com/' + page, 'scripts/_scraped/lakeagro_' + page);
  }
}

(async () => {
  console.log('=== download assets ===');
  await downloadAssets();
  console.log('=== process logos ===');
  processLogos();
  console.log('=== enlarge LogoLoop ===');
  enlargeLogoLoop();
  console.log('=== update Agro + ATL pages ===');
  updateAgroPage();
  updateAtlPage();
  console.log('=== scrub company CTAs ===');
  scrubAllCompanyPages();
  console.log('=== cache-bust logo refs ===');
  bumpMegamenuLogos();

  // Verify scrub
  let leftover = 0;
  for (const f of COMPANY_PAGES) {
    const s = read(f);
    if (/data-i18n="company\.cta\.lede"/.test(s)) {
      console.log('STILL HAS company.cta', f);
      leftover++;
    }
    if (/btn[^>]*>\s*Contact (Us|Sales)/i.test(s) && /page-wrapper[\s\S]*Contact (Us|Sales)/i.test(s)) {
      // ignore footer
      const main = s.split('<footer')[0];
      if (/Contact (Us|Sales)|Contact Lake Agro|Contact Steel|Get in Touch/i.test(main) && /class="btn/.test(main.match(/Contact[\s\S]{0,40}/) || [''])) {
        const m = main.match(/<a href="contact\.html[^"]*"[^>]*class="btn[^"]*"[^>]*>[^<]*(?:Contact|Get in Touch)[^<]*<\/a>/gi);
        if (m && m.length) {
          console.log('STILL HAS contact btn in main', f, m);
          leftover++;
        }
      }
    }
  }
  console.log('leftover CTA issues', leftover);

  const atl = fs.readFileSync(path.join(ROOT, 'assets/images/logos/companies/atl.png'));
  const agro = fs.readFileSync(path.join(ROOT, 'assets/images/logos/companies/lake-agro.png'));
  console.log('atl.png', atl.readUInt32BE(16) + 'x' + atl.readUInt32BE(20), atl.length);
  console.log('lake-agro.png', agro.readUInt32BE(16) + 'x' + agro.readUInt32BE(20), agro.length);
  console.log('DONE cache', CACHE);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
