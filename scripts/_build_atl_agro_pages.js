#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const tpl = fs.readFileSync(path.join(ROOT, 'lake-lubes.html'), 'utf8');

function wrapPage({
  file,
  title,
  description,
  canonical,
  division,
  companyName,
  dataLogo,
  dataAlt,
  themeClass,
  extraHeadStyle,
  bodyHtml,
  schemaName,
  schemaDesc,
  crumb2,
  crumb3
}) {
  let html = tpl;
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);
  html = html.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${description}">`);
  html = html.replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${title}">`);
  html = html.replace(
    /<meta property="og:description" content="[^"]*">/,
    `<meta property="og:description" content="${description}">`
  );
  html = html.replace(
    /<link rel="canonical" href="[^"]*">/,
    `<link rel="canonical" href="${canonical}">`
  );
  html = html.replace(
    /data-company-logo="[^"]*" data-company-alt="[^"]*"/,
    `data-company-logo="${dataLogo}" data-company-alt="${dataAlt}"${themeClass ? ` class="${themeClass}"` : ''}`
  );
  // Fix body tag if class went wrong — body already has attrs
  html = html.replace(
    /<body([^>]*)>/,
    `<body data-company-logo="${dataLogo}" data-company-alt="${dataAlt}"${themeClass ? ` class="${themeClass}"` : ''}>`
  );

  if (extraHeadStyle) {
    html = html.replace('</style>\n<script type="application/ld+json">', `${extraHeadStyle}\n</style>\n<script type="application/ld+json">`);
  }

  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        name: schemaName,
        description: schemaDesc,
        url: canonical,
        parentOrganization: {
          '@type': 'Organization',
          name: 'Lake Group',
          url: 'https://www.lakeoilgroup.com/'
        },
        areaServed: 'East and Central Africa'
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.lakeoilgroup.com/' },
          { '@type': 'ListItem', position: 2, name: crumb2 },
          { '@type': 'ListItem', position: 3, name: crumb3, item: canonical }
        ]
      }
    ]
  };
  html = html.replace(
    /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
    `<script type="application/ld+json">\n${JSON.stringify(ld, null, 2)}\n</script>`
  );

  const start = html.indexOf('<div class="page-wrapper">');
  const footer = html.search(/<footer class="site-footer">/);
  if (start < 0 || footer < 0) throw new Error('page-wrapper bounds missing');
  // Close page-wrapper just before footer (CRLF-safe)
  let end = footer;
  const before = html.slice(Math.max(0, footer - 40), footer);
  const closeRel = before.lastIndexOf('</div>');
  if (closeRel >= 0) end = Math.max(0, footer - 40) + closeRel;
  html = html.slice(0, start) + bodyHtml + '\n' + html.slice(footer);

  html = html.replace(/tokens\.css\?v=\d+/g, 'tokens.css?v=46');
  html = html.replace(/flagship\.css\?v=\d+/g, 'flagship.css?v=46');
  html = html.replace(/site\.js\?v=\d+/g, 'site.js?v=46');

  fs.writeFileSync(path.join(ROOT, file), html);
  console.log('built', file, html.length);
}

const atlBody = `<div class="page-wrapper">
<section class="page-hero">
  <div class="hero-media" style="background-image:url('assets/images/n-slider/4.jpg')" aria-hidden="true"></div>
  <div class="hero-overlay" aria-hidden="true"></div>
  <div class="container">
    <nav class="breadcrumb"><a href="index.html" data-i18n="nav.home">Home</a><span>/</span><span>Manufacturing</span><span>/</span><span>ATL</span></nav>
    <div class="eyebrow">ATL Limited · Est. 2019</div>
    <h1>ATL</h1>
    <p>Aluminium Trailers Ltd — Tanzania's aluminium fuel tanker and custom trailer manufacturer. Your trailer partner.</p>
  </div>
</section>

<section class="fs-section">
  <div class="container">
    <div class="fs-split-even">
      <div>
        <div class="co-logo-row"><img src="assets/images/logos/companies/atl.png" alt="ATL Aluminium Trailers" width="320" height="200"></div>
        <div class="fs-marker"><span class="fs-marker-no">01</span><span class="fs-eyebrow">Company Introduction</span></div>
        <h2 class="fs-display">Engineered To Last</h2>
        <hr class="fs-rule" style="margin:var(--sp-5) 0">
        <p class="fs-lede">ATL Limited (Aluminum Trailers Ltd), established in 2019, is the only manufacturer of high-quality aluminum trailers in Tanzania. We specialize in innovative, durable fuel transportation solutions for East and Central Africa.</p>
        <p style="margin-top:14px">Our tankers and custom trailers are built to industry standards, tailored to route and payload needs, with a strategy to expand into a wider range of premium customized trailers across the region.</p>
        <ul class="fs-check">
          <li><span>&#10003;</span>Only aluminium trailer manufacturer in Tanzania</li>
          <li><span>&#10003;</span>Fuel tankers engineered for African operating conditions</li>
          <li><span>&#10003;</span>Custom builds with technical support and warranty</li>
          <li><span>&#10003;</span>Facility at Kipawa, Nyerere Road (opp. JNIA Terminal 3)</li>
        </ul>
        <div style="margin-top:32px;display:flex;gap:14px;flex-wrap:wrap">
          <a href="contact.html#atl" class="btn btn-outline-dark">Contact Sales</a>
        </div>
      </div>
      <div>
        <div class="info-panel fs-on-dark fs-corners">
          <h3>At a Glance</h3>
          <div>
            <div class="info-row"><span>Established</span><span class="badge badge-yellow">2019</span></div>
            <div class="info-row"><span>Specialty</span><span class="badge badge-yellow">Aluminium tankers</span></div>
            <div class="info-row"><span>Location</span><span class="badge badge-yellow">Dar es Salaam</span></div>
            <div class="info-row"><span>Hours</span><span class="badge badge-yellow">Mon–Fri 8:00–16:30</span></div>
            <div class="info-row"><span>Saturday</span><span class="badge badge-yellow">8:00–12:30</span></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="fs-section fs-on-dark">
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
      <div class="val-mini-tile"><h4>Integrity</h4><p>Honesty, transparency and accountability</p></div>
      <div class="val-mini-tile"><h4>People</h4><p>Safety and professional development first</p></div>
      <div class="val-mini-tile"><h4>Sustainability</h4><p>Lower impact materials and processes</p></div>
      <div class="val-mini-tile"><h4>Customers</h4><p>Long-term partners, not one-off sales</p></div>
    </div>
  </div>
</section>

<section class="fs-section section-light">
  <div class="container">
    <div class="fs-marker"><span class="fs-marker-no">03</span><span class="fs-eyebrow">Brand Promise</span></div>
    <h2 class="fs-display" style="margin-bottom:var(--sp-6)">Savings · Safety · Solutions</h2>
    <div class="grid-3">
      <div class="fs-card" style="padding:var(--sp-6)">
        <h4 style="font-family:var(--font-display);font-weight:400;font-size:1.2rem;letter-spacing:.03em;text-transform:uppercase;margin-bottom:10px">Savings</h4>
        <p style="font-size:.9rem;line-height:1.65">Lighter aluminium trailers, more payload, better hauling fuel efficiency, and lower long-term maintenance versus heavier alternatives.</p>
      </div>
      <div class="fs-card" style="padding:var(--sp-6)">
        <h4 style="font-family:var(--font-display);font-weight:400;font-size:1.2rem;letter-spacing:.03em;text-transform:uppercase;margin-bottom:10px">Safety</h4>
        <p style="font-size:.9rem;line-height:1.65">Air suspension for tankers, reliable braking, strategic flooding points, secure coupling systems and high-visibility reflectors.</p>
      </div>
      <div class="fs-card" style="padding:var(--sp-6)">
        <h4 style="font-family:var(--font-display);font-weight:400;font-size:1.2rem;letter-spacing:.03em;text-transform:uppercase;margin-bottom:10px">Solutions</h4>
        <p style="font-size:.9rem;line-height:1.65">Custom designs, technical support, warranty and maintenance, and cost-effective builds matched to your fleet.</p>
      </div>
    </div>
  </div>
</section>

<section class="fs-section">
  <div class="container">
    <div class="fs-marker"><span class="fs-marker-no">04</span><span class="fs-eyebrow">Why Aluminium</span></div>
    <h2 class="fs-display" style="margin-bottom:var(--sp-6)">Material Advantages</h2>
    <div class="grid-3">
      <div class="fs-card" style="padding:var(--sp-6)"><h4 style="font-family:var(--font-display);font-weight:400;font-size:1.05rem;letter-spacing:.03em;text-transform:uppercase">Non-Reactive</h4><p style="font-size:.86rem;margin-top:6px">Helps prevent fuel contamination — important for sensitive fuels including aviation fuel.</p></div>
      <div class="fs-card" style="padding:var(--sp-6)"><h4 style="font-family:var(--font-display);font-weight:400;font-size:1.05rem;letter-spacing:.03em;text-transform:uppercase">Corrosion Resistant</h4><p style="font-size:.86rem;margin-top:6px">Naturally resists rust in harsh weather and moisture, reducing maintenance and extending tanker life.</p></div>
      <div class="fs-card" style="padding:var(--sp-6)"><h4 style="font-family:var(--font-display);font-weight:400;font-size:1.05rem;letter-spacing:.03em;text-transform:uppercase">Fuel Efficiency</h4><p style="font-size:.86rem;margin-top:6px">Lower tare weight means more legal payload and less energy to haul the tanker.</p></div>
      <div class="fs-card" style="padding:var(--sp-6)"><h4 style="font-family:var(--font-display);font-weight:400;font-size:1.05rem;letter-spacing:.03em;text-transform:uppercase">Strength &amp; Safety</h4><p style="font-size:.86rem;margin-top:6px">High strength-to-weight ratio for transport stresses, with impact absorption characteristics that support operational safety.</p></div>
      <div class="fs-card" style="padding:var(--sp-6)"><h4 style="font-family:var(--font-display);font-weight:400;font-size:1.05rem;letter-spacing:.03em;text-transform:uppercase">Environment</h4><p style="font-size:.86rem;margin-top:6px">Highly recyclable aluminium with lower recycling energy versus primary production — aligned with stricter fuel-transport standards.</p></div>
      <div class="fs-card" style="padding:var(--sp-6)"><h4 style="font-family:var(--font-display);font-weight:400;font-size:1.05rem;letter-spacing:.03em;text-transform:uppercase">Custom Range</h4><p style="font-size:.86rem;margin-top:6px">Expanding beyond fuel tankers into premium customized trailers for regional logistics needs.</p></div>
    </div>
  </div>
</section>

<section class="fs-section section-light">
  <div class="container">
    <div class="fs-marker"><span class="fs-marker-no">05</span><span class="fs-eyebrow">Products</span></div>
    <h2 class="fs-display" style="margin-bottom:var(--sp-6)">Tankers &amp; Custom Trailers</h2>
    <div class="prod-catalog">
      <div class="prod-catalog-card">
        <div class="prod-glyph" aria-hidden="true">⛽</div>
        <h4>Aluminium Fuel Tankers</h4>
        <p>High-quality aluminum fuel tankers designed for safety, durability and efficiency on African routes.</p>
      </div>
      <div class="prod-catalog-card">
        <div class="prod-glyph" aria-hidden="true">🚛</div>
        <h4>Custom Trailers</h4>
        <p>Tailored trailer configurations to match payload, coupling and operating requirements.</p>
      </div>
      <div class="prod-catalog-card">
        <div class="prod-glyph" aria-hidden="true">🛠️</div>
        <h4>Support &amp; Warranty</h4>
        <p>Technical support, warranty coverage and maintenance partnership after delivery.</p>
      </div>
    </div>
    <div class="img-mosaic" style="margin-top:var(--sp-8)">
      <div class="fs-media"><img src="https://atl-tz.com/wp-content/uploads/2025/02/1-2.jpg" alt="ATL aluminium tanker" loading="lazy" decoding="async" referrerpolicy="no-referrer"></div>
      <div class="fs-media"><img src="https://atl-tz.com/wp-content/uploads/2025/02/39.jpg" alt="ATL trailer manufacturing" loading="lazy" decoding="async" referrerpolicy="no-referrer"></div>
      <div class="fs-media"><img src="https://atl-tz.com/wp-content/uploads/2025/02/46-qu1wm36pke816ngzqbe4u9h1r5e63spqo7k60ix8xc.png" alt="ATL tanker detail" loading="lazy" decoding="async" referrerpolicy="no-referrer"></div>
    </div>
  </div>
</section>

<section class="fs-section fs-on-dark">
  <div class="container">
    <div class="fs-marker"><span class="fs-marker-no">06</span><span class="fs-eyebrow">Testimonials</span></div>
    <h2 class="fs-display" style="margin-bottom:var(--sp-6)">What Clients Say</h2>
    <div class="fs-split-even">
      <blockquote style="margin:0;padding:0;border:none">
        <p style="font-size:1.05rem;line-height:1.7;color:var(--ink-mute)">"Thank you, Aluminum Trailers Limited. Looking forward for more transformation of our trailers with you. As you won't find a better customer servicing of high quality manufacturing anywhere else in East Africa."</p>
        <p style="margin-top:14px;color:var(--gold);font-weight:700;letter-spacing:.06em;text-transform:uppercase;font-size:.78rem">MOIL Company CEO</p>
      </blockquote>
      <blockquote style="margin:0;padding:0;border:none">
        <p style="font-size:1.05rem;line-height:1.7;color:var(--ink-mute)">"From fabrication to manufacturing quality — the effective best manufacturing tanker company I have dealt with. Higher volumes loaded, many trips in a short time. The overall merits of the trailer are amazing."</p>
        <p style="margin-top:14px;color:var(--gold);font-weight:700;letter-spacing:.06em;text-transform:uppercase;font-size:.78rem">Orange Gas Co. Ltd CEO</p>
      </blockquote>
    </div>
  </div>
</section>

<section class="fs-section">
  <div class="container">
    <div class="fs-marker"><span class="fs-marker-no">07</span><span class="fs-eyebrow">Contact</span></div>
    <h2 class="fs-display" style="margin-bottom:var(--sp-6)">Visit ATL</h2>
    <div class="ct-info fs-on-dark fs-corners">
      <h3>ATL Limited</h3>
      <div class="ct-rows">
        <div class="ct-row"><div class="ct-ico" aria-hidden="true">📍</div><div><div class="ct-label">Address</div><span class="ct-strong">Kipawa, Nyerere Road</span><span class="ct-dim">Opposite Julius Nyerere Airport Terminal 3, Dar es Salaam</span></div></div>
        <div class="ct-row"><div class="ct-ico" aria-hidden="true">🕒</div><div><div class="ct-label">Work Hours</div><span class="ct-strong">Mon–Fri 8:00am – 16:30pm</span><span class="ct-dim">Sat 8:00am – 12:30pm</span></div></div>
        <div class="ct-row"><div class="ct-ico" aria-hidden="true">✉️</div><div><div class="ct-label">Group Enquiries</div><span class="ct-strong"><a href="contact.html#atl" style="color:var(--gold)">Contact Lake Group / ATL</a></span></div></div>
      </div>
    </div>
  </div>
</section>

</div>
`;

const agroStyle = `
body.co-theme-agro {
  --gold: var(--color-agro-green-bright);
  --gold-deep: var(--color-agro-green);
  --color-yellow-accent: var(--color-agro-green-bright);
  --yellow: var(--color-agro-green-bright);
}
body.co-theme-agro .page-hero .eyebrow,
body.co-theme-agro .fs-marker-no,
body.co-theme-agro .badge-yellow {
  color: var(--color-agro-green-bright);
}
body.co-theme-agro .badge-yellow {
  border-color: rgba(72, 159, 16, 0.45);
  background: rgba(0, 132, 53, 0.12);
  color: var(--color-agro-green-bright);
}
body.co-theme-agro .val-mini-tile::before,
body.co-theme-agro .stat-tile2::before {
  background: var(--color-agro-green-bright);
}
body.co-theme-agro .fs-section.fs-on-dark {
  background: linear-gradient(160deg, var(--color-agro-green-deep) 0%, #013220 55%, var(--color-brand-blue-darkest) 100%);
}
body.co-theme-agro .info-panel,
body.co-theme-agro .ct-info {
  background: var(--color-agro-green-deep);
}
body.co-theme-agro .btn-outline-dark {
  border-color: var(--color-agro-green);
  color: var(--color-agro-green-deep);
}
body.co-theme-agro .btn-outline-dark:hover {
  background: var(--color-agro-green);
  color: #fff;
  border-color: var(--color-agro-green);
}
`;

const agroBody = `<div class="page-wrapper">
<section class="page-hero">
  <div class="hero-media" style="background-image:url('assets/images/n-slider/4.jpg')" aria-hidden="true"></div>
  <div class="hero-overlay" aria-hidden="true"></div>
  <div class="container">
    <nav class="breadcrumb"><a href="index.html" data-i18n="nav.home">Home</a><span>/</span><span>Agro Processing</span><span>/</span><span>Lake Agro</span></nav>
    <div class="eyebrow">Lake Agro · Dar es Salaam</div>
    <h1>Lake Agro</h1>
    <p>Creating customers and food for life — plantations, integrated Ag Parks and value-added processing across Africa.</p>
  </div>
</section>

<section class="fs-section">
  <div class="container">
    <div class="fs-split-even">
      <div>
        <div class="co-logo-row"><img src="assets/images/logos/companies/lake-agro.png" alt="Lake Agro" width="320" height="72"></div>
        <div class="fs-marker"><span class="fs-marker-no">01</span><span class="fs-eyebrow">Company Introduction</span></div>
        <h2 class="fs-display">Food Systems for Africa</h2>
        <hr class="fs-rule" style="margin:var(--sp-5) 0">
        <p class="fs-lede">Lake Agro partners with governments, development finance institutions and initiatives such as the Africa Savannahs Initiative to help Africa feed itself and create jobs for youth and women.</p>
        <p style="margin-top:14px">Sub-Saharan Africa faces acute undernourishment and a population that may reach 2.4 billion by 2050. Africa's food market opportunities are estimated to exceed <strong>$1 trillion a year by 2030</strong> — substituting imports with high-value food made in Africa.</p>
        <ul class="fs-check">
          <li><span>&#10003;</span>Greenfield and existing farm acquisitions in networked markets</li>
          <li><span>&#10003;</span>Integrated Ag Parks for consolidation and value addition</li>
          <li><span>&#10003;</span>Serenje plantation operations and Tanzania regional offices</li>
          <li><span>&#10003;</span>Backed by Lake Group central functions (IT, legal, finance, HR)</li>
        </ul>
        <div style="margin-top:32px;display:flex;gap:14px;flex-wrap:wrap">
          <a href="contact.html#lake-agro" class="btn btn-outline-dark">Contact Lake Agro</a>
        </div>
      </div>
      <div>
        <div class="info-panel fs-on-dark fs-corners">
          <h3>Contact</h3>
          <div>
            <div class="info-row"><span>HQ city</span><span class="badge badge-yellow">Dar es Salaam</span></div>
            <div class="info-row"><span>Email</span><span class="badge badge-yellow">info@lakeagro.com</span></div>
            <div class="info-row"><span>Phone</span><span class="badge badge-yellow">+255 222 780 510</span></div>
            <div class="info-row"><span>Tagline</span><span class="badge badge-yellow">Food for life</span></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="fs-section fs-on-dark">
  <div class="container">
    <div class="fs-marker"><span class="fs-marker-no">02</span><span class="fs-eyebrow">What We Are</span></div>
    <h2 class="fs-display" style="margin-bottom:var(--sp-6)">Secure · Establish · Consolidate</h2>
    <p class="fs-lede" style="max-width:70ch;margin-bottom:var(--sp-8)">We secure, establish and consolidate farm platforms via greenfield projects or acquisitions where economies of scale are achievable.</p>
    <div class="grid-3">
      <div class="fs-card" style="padding:var(--sp-6);background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.12)"><h4 style="color:var(--white);font-family:var(--font-display);font-weight:400;font-size:1.05rem;letter-spacing:.03em;text-transform:uppercase">Land</h4><p style="font-size:.86rem;margin-top:6px;color:var(--ink-mute)">Underutilized, cost-effective land with mineralized soils and water basins that exceed farmed mass for long-term perennity.</p></div>
      <div class="fs-card" style="padding:var(--sp-6);background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.12)"><h4 style="color:var(--white);font-family:var(--font-display);font-weight:400;font-size:1.05rem;letter-spacing:.03em;text-transform:uppercase">Access</h4><p style="font-size:.86rem;margin-top:6px;color:var(--ink-mute)">Rail- and corridor-connected markets with proximity to continental export hubs — Indian Ocean and Atlantic routes.</p></div>
      <div class="fs-card" style="padding:var(--sp-6);background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.12)"><h4 style="color:var(--white);font-family:var(--font-display);font-weight:400;font-size:1.05rem;letter-spacing:.03em;text-transform:uppercase">Know-how &amp; Capital</h4><p style="font-size:.86rem;margin-top:6px;color:var(--ink-mute)">Local technical capability plus international, development-bank and African institutional funding pathways.</p></div>
    </div>
  </div>
</section>

<section class="fs-section section-light">
  <div class="container">
    <div class="fs-marker"><span class="fs-marker-no">03</span><span class="fs-eyebrow">Strategy</span></div>
    <h2 class="fs-display" style="margin-bottom:var(--sp-6)">3P — Prep · Plan · Process</h2>
    <div class="grid-3">
      <div class="fs-card" style="padding:var(--sp-6)"><h4 style="font-family:var(--font-display);font-weight:400;font-size:1.05rem;letter-spacing:.03em;text-transform:uppercase">Prep</h4><p style="font-size:.86rem;margin-top:6px">Deploy Phase 1 growth; rapid turnaround of underperforming Phase 2 acquisitions; lift yields on greenfield plantations.</p></div>
      <div class="fs-card" style="padding:var(--sp-6)"><h4 style="font-family:var(--font-display);font-weight:400;font-size:1.05rem;letter-spacing:.03em;text-transform:uppercase">Plan</h4><p style="font-size:.86rem;margin-top:6px">Add Integrated Ag Parks in Phase 1; select and acquire Phase 2 market-entry farms.</p></div>
      <div class="fs-card" style="padding:var(--sp-6)"><h4 style="font-family:var(--font-display);font-weight:400;font-size:1.05rem;letter-spacing:.03em;text-transform:uppercase">Process</h4><p style="font-size:.86rem;margin-top:6px">Stand up processing as Phase 1 farms stabilize; reorganize value-addition for Ag Parks in Phase 2.</p></div>
    </div>
    <p style="margin-top:var(--sp-8);max-width:75ch;line-height:1.7">Target average yields above <strong>11 t/ha</strong> across commoditized crops including wheat, soybean, maize, rice, sunflower, sugar and protein (beef), with rotational diversification into teak, beans and horticulture where land permits.</p>
  </div>
</section>

<section class="fs-section">
  <div class="container">
    <div class="fs-marker"><span class="fs-marker-no">04</span><span class="fs-eyebrow">Crops &amp; Outputs</span></div>
    <h2 class="fs-display" style="margin-bottom:var(--sp-6)">Production Focus</h2>
    <div class="prod-catalog">
      <div class="prod-catalog-card"><div class="prod-glyph" aria-hidden="true">🌾</div><h4>Grains</h4><p>Wheat, maize, rice and soybean platforms for regional food security.</p></div>
      <div class="prod-catalog-card"><div class="prod-glyph" aria-hidden="true">🌻</div><h4>Oilseeds &amp; Sugar</h4><p>Sunflower and sugar as core cash and processing feedstocks.</p></div>
      <div class="prod-catalog-card"><div class="prod-glyph" aria-hidden="true">🥩</div><h4>Protein &amp; Diversification</h4><p>Beef protein plus teak, beans and fruit horticulture in buffer spaces.</p></div>
    </div>
  </div>
</section>

<section class="fs-section fs-on-dark">
  <div class="container">
    <div class="fs-marker"><span class="fs-marker-no">05</span><span class="fs-eyebrow">People</span></div>
    <h2 class="fs-display" style="margin-bottom:var(--sp-6)">Human Capital</h2>
    <p style="max-width:75ch;line-height:1.7;margin-bottom:var(--sp-6)">People are Lake Agro's biggest asset. Operations cover agronomy, harvesting, disease control, seed/fertilizer inputs, equipment, works contracting, irrigation and Ag project planning — with ~60 roles overseeing Serenje plantation and Tanzania regional offices, scaling as Ag Park teams form.</p>
    <div class="val-mini-grid">
      <div class="val-mini-tile"><h4>Agronomy</h4><p>Crop science and disease control</p></div>
      <div class="val-mini-tile"><h4>Irrigation</h4><p>Water and project oversight</p></div>
      <div class="val-mini-tile"><h4>Equipment</h4><p>Fleet and procurement</p></div>
      <div class="val-mini-tile"><h4>Leadership</h4><p>Finance, strategy, planning</p></div>
    </div>
  </div>
</section>

<section class="fs-section">
  <div class="container">
    <div class="fs-marker"><span class="fs-marker-no">06</span><span class="fs-eyebrow">Contact</span></div>
    <h2 class="fs-display" style="margin-bottom:var(--sp-6)">Reach Lake Agro</h2>
    <div class="ct-info fs-on-dark fs-corners">
      <h3>Lake Agro</h3>
      <div class="ct-rows">
        <div class="ct-row"><div class="ct-ico" aria-hidden="true">📍</div><div><div class="ct-label">Location</div><span class="ct-strong">Dar es Salaam, Tanzania</span><span class="ct-dim">Regional offices + plantation operations</span></div></div>
        <div class="ct-row"><div class="ct-ico" aria-hidden="true">✉️</div><div><div class="ct-label">Email</div><span class="ct-strong"><a href="mailto:info@lakeagro.com" style="color:var(--gold)">info@lakeagro.com</a></span></div></div>
        <div class="ct-row"><div class="ct-ico" aria-hidden="true">📞</div><div><div class="ct-label">Phone</div><span class="ct-strong"><a href="tel:+255222780510" style="color:var(--gold)">+255 222 780 510</a></span></div></div>
        <div class="ct-row"><div class="ct-ico" aria-hidden="true">🔗</div><div><div class="ct-label">On this site</div><span class="ct-strong"><a href="contact.html#lake-agro" style="color:var(--gold)">Group contact directory</a></span></div></div>
      </div>
    </div>
  </div>
</section>

</div>
`;

wrapPage({
  file: 'atl.html',
  title: 'ATL | Aluminium Trailers | Lake Group',
  description:
    'ATL Limited (Aluminum Trailers Ltd) — established 2019, Tanzania\'s aluminium fuel tanker and custom trailer manufacturer. Your trailer partner.',
  canonical: 'https://www.lakeoilgroup.com/atl.html',
  dataLogo: 'assets/images/logos/companies/atl.png',
  dataAlt: 'ATL',
  themeClass: '',
  bodyHtml: atlBody,
  schemaName: 'ATL Limited (Aluminum Trailers Ltd)',
  schemaDesc:
    'ATL Limited manufactures high-quality aluminium fuel tankers and custom trailers in Tanzania for East and Central Africa.',
  crumb2: 'Manufacturing',
  crumb3: 'ATL'
});

wrapPage({
  file: 'lake-agro.html',
  title: 'Lake Agro | Agro Processing | Lake Group',
  description:
    'Lake Agro — creating customers and food for life through plantations, integrated Ag Parks and agribusiness processing across Africa.',
  canonical: 'https://www.lakeoilgroup.com/lake-agro.html',
  dataLogo: 'assets/images/logos/companies/lake-agro.png',
  dataAlt: 'Lake Agro',
  themeClass: 'co-theme-agro',
  extraHeadStyle: agroStyle,
  bodyHtml: agroBody,
  schemaName: 'Lake Agro',
  schemaDesc:
    'Lake Agro develops plantations and integrated Ag Parks to strengthen African food systems and create agricultural jobs.',
  crumb2: 'Agro Processing',
  crumb3: 'Lake Agro'
});
