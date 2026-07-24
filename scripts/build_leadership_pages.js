#!/usr/bin/env node
/**
 * Builds Aramco-style leadership directory + dedicated profile pages.
 * Run: node scripts/build_leadership_pages.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'leadership.html');
const html = fs.readFileSync(SRC, 'utf8');

const navStart = html.indexOf('<nav class="site-nav">');
const pageStart = html.indexOf('<div class="page-wrapper">');
const footerStart = html.indexOf('<footer class="site-footer">');
const headPrefix = html.slice(0, html.indexOf('<style>'));
const afterStyle = html.slice(html.indexOf('</style>') + 8, navStart);
const nav = html.slice(navStart, pageStart);
const footer = html.slice(footerStart);

const LOGO = 'assets/images/logos/LAKE_GROUP_LOGO.png';

const LEADERS = [
  {
    id: 'ally-edha-awadh',
    name: 'Ally Edha Awadh',
    role: 'Executive Chairman & Owner',
    unit: 'Group Leadership',
    photo: 'assets/images/leadership/ally-edha-awadh.png',
    photoLogo: false,
    summary:
      'Forbes-featured entrepreneur who founded Lake Oil in 2006 and built Lake Group into one of East and Central Africa’s leading energy, logistics and industrial conglomerates.',
    paragraphs: [
      'Born in 1980 into a family of traders, Awadh studied Business Administration at Brock University in Canada - supporting himself with odd jobs while building early trading instincts. By his mid-20s he had already moved into truck refurbishing and commodity trading. In 2006 he launched Lake Oil; official Group materials place him at 27 at founding.',
      'His oversight today spans oil marketing, supply chain, downstream logistics and heavy industrial manufacturing across Tanzania, Kenya, Zambia, DRC, Burundi and Rwanda - with wider Group presence also in Ethiopia, Mozambique and Dubai (MERM). Under his chairmanship the Group has grown retail networks (152 stations in Tanzania alone), storage infrastructure, a 1,200+ truck fleet, LPG terminals, Lake Steel, ready-mix concrete and AFICD port-extension services.',
      'In 2017 Forbes covered Lake Oil Group’s regional push - including Competition Authority of Kenya approval to acquire Hashi Energy’s Kenyan station network - and described the enterprise as a billion-dollar (revenue) integrated energy platform. Awadh has also been recognised by African Leadership Magazine (Young Business Leader of the Year, 2022) and as Young African Energy Leader of the Year (African Business Leadership Awards, 2023).',
    ],
    quote:
      'With a team of experienced engineers and business professionals across our units, Lake Group is fully geared to meet the demands of the global marketplace.',
    mandate: [
      'Group strategy across energy, logistics and industry',
      'Regional expansion and capital partnerships',
      'Governance and long-term value creation',
    ],
    meta: [
      ['Founded', '2006'],
      ['Countries', '8+'],
      ['People', '30,000+'],
    ],
    links: [
      ['Meet the full team', 'leadership.html'],
      ['Our history', 'history.html'],
      ['Contact Group HQ', 'contact.html'],
    ],
    emailSubject: 'Attention: Office of the Chairman',
  },
  {
    id: 'biji-lapat',
    name: 'Biji Lapat',
    role: 'Managing Director · Lake Energies',
    unit: 'Lake Energies',
    photo: 'assets/images/leadership/biji-lapat.png',
    photoLogo: false,
    summary:
      'Managing Director of Lake Energies, Lake Group’s energy division spanning petroleum, LPG, lubricants and aviation services across the Group’s regional footprint.',
    paragraphs: [
      'As Managing Director of Lake Energies, Biji Lapat leads the Group’s energy division - the family of operating companies that includes Lake Oil, Lake Gas, Lake Lubes and Lake Aviation.',
      'Lake Energies sits at the core of Lake Group’s downstream energy platform: retail and bulk petroleum distribution, LPG bottling and storage, lubricant blending, and aviation fuel services supporting customers across East and Central Africa.',
      'Working from the Group’s Dar es Salaam headquarters, the Lake Energies mandate aligns commercial and operational priorities across these energy units with Lake Group’s wider logistics and industrial network.',
    ],
    mandate: [
      'Leadership of Lake Energies operating companies',
      'Downstream energy commercial and operational alignment',
      'Coordination with Group logistics and support functions',
    ],
    meta: [
      ['Lake Energies', 'Energy division'],
      ['4', 'Core energy brands'],
      ['8+', 'Countries'],
    ],
    links: [
      ['Lake Oil', 'lake-oil.html'],
      ['Lake Gas', 'lake-gas.html'],
      ['Lake Lubes', 'lake-lubes.html'],
      ['Lake Aviation', 'lake-aviation.html'],
    ],
    emailSubject: 'Attention: MD Lake Energies (Biji Lapat)',
  },
  {
    id: 'dileep-kumar',
    name: 'Dileep Kumar',
    role: 'CEO · Manufacturing Division',
    unit: 'Manufacturing',
    photo: 'assets/images/leadership/sibtian-ansari.png',
    photoLogo: false,
    summary:
      'Leads Lake Group’s structural industrial expansions - most notably Lake Steel - spanning production infrastructure, manufacturing output, concrete products and construction supply networks.',
    paragraphs: [
      'As Manufacturing CEO, Dileep Kumar’s mandate sits at the industrial heart of the Group’s diversification beyond petroleum. Lake Steel operates a computerized automatic rolling mill at Visiga, Kibaha (Plot 118, Block M), with throughput up to about 25 tonnes/hour and annual capacity around 100,000 MT - with publicly discussed expansion toward 150,000 MT.',
      'The mill introduced high-strength corrosion-resistant (HS-CR) rebar to Tanzania, engineered to retain strength at elevated temperatures and deliver markedly higher corrosion resistance than ordinary rebar.',
      'His portfolio also connects to the Group’s construction-materials chain: Gulf Aggregates crushing plants, Lake Premix / GCCP ready-mix operations in Dar es Salaam, and the wider building-products ecosystem that supplies contractors and infrastructure projects.',
    ],
    mandate: [
      'Lake Steel production infrastructure & mill output',
      'Concrete products & construction supply networks',
      'Industrial expansion programmes across manufacturing units',
    ],
    meta: [
      ['HS-CR', 'Steel technology'],
      ['~100k MT', 'Annual capacity'],
      ['Kibaha', 'Mill location'],
    ],
    links: [
      ['Lake Steel', 'lake-steel.html'],
      ['Lake Premix & Cement', 'lake-premix-cement.html'],
      ['Gulf Aggregates', 'gulf-aggregates.html'],
    ],
    emailSubject: 'Attention: CEO Manufacturing (Dileep Kumar)',
  },
  {
    id: 'sridhar-mani',
    name: 'Sridhar Mani',
    role: 'Director of Digital Transformation',
    unit: 'Technology',
    photo: 'assets/images/leadership/vivek-choudhary.png',
    photoLogo: false,
    summary:
      'Owns enterprise technology architecture and digital strategy - from centralised SAP environments to logistics intelligence and cross-border data security.',
    paragraphs: [
      'Across a Group that runs fuel depots, 1,200+ trucks, ICD/CFS yards and multi-country retail, digital systems are the nervous system. Mani’s mandate focuses on optimising Lake Group’s centralised SAP stack - the operational backbone for shipment orders, inventory and financial posting across units such as Lake Trans and AFICD.',
      'He embeds custom logistics and fleet-tracking intelligence so corridor movements stay visible from Dar to Ndola and beyond, and scales cross-border data security infrastructure protecting networks that connect Tanzania hubs with regional country operations.',
      'The goal is a single, resilient digital layer that lets manufacturing, energy and logistics executives act on the same real-time picture.',
    ],
    mandate: [
      'Centralised SAP optimisation & enterprise architecture',
      'Fleet tracking & logistics intelligence',
      'Cross-border cybersecurity & data infrastructure',
    ],
    meta: [
      ['SAP', 'Core ERP'],
      ['Fleet IQ', 'Logistics systems'],
      ['Multi-country', 'Security scope'],
    ],
    links: [
      ['Our fleet', 'fleet.html'],
      ['Africa network', 'africa-network.html'],
      ['AFICD', 'aficd.html'],
    ],
    emailSubject: 'Attention: Director Digital Transformation (Sridhar Mani)',
  },
  {
    id: 'mohammed-khalid',
    name: 'Mohammed Khalid',
    role: 'Managing Director · ATL',
    unit: 'Logistics',
    photo: 'assets/images/leadership/bhaskar-shetty.png',
    photoLogo: false,
    summary:
      'Directs Associated Trans Logistics Ltd (ATL), operating alongside Lake Trans as a logistical backbone for fuel fleets, heavy haulage and multi-national cargo corridors.',
    paragraphs: [
      'Khalid’s ATL wing sits next to Lake Trans Ltd. - the Group’s second company (2008) and primary petroleum haulage arm. Together they move product locally and in transit across Tanzania, Zambia, Rwanda, DRC, Burundi, Malawi, Kenya and Uganda.',
      'Group messaging cites 1,200+ trucks; tanker capacities typically range 12,000–40,000 litres, with GPS tracking as standard. Workshops in Kibaha, Kigamboni, Morogoro, Nairobi and Ndola support asset uptime on the corridors that make Lake Group’s multi-country model possible.',
      'ATL’s role is to keep the physical network seamless: routing fuel fleets, heavy haulage and cargo pipelines so depots, stations and industrial plants stay supplied.',
    ],
    mandate: [
      'Fuel distribution fleet routing & execution',
      'Heavy haulage & multi-national cargo pipelines',
      'Coordination with Lake Trans corridor operations',
    ],
    meta: [
      ['ATL', 'Logistics unit'],
      ['1,200+', 'Group trucks'],
      ['8+', 'Corridor countries'],
    ],
    links: [
      ['Lake Trans', 'lake-trans.html'],
      ['ATL', 'https://atl-tz.com'],
      ['Fleet profile', 'fleet.html'],
    ],
    emailSubject: 'Attention: MD ATL (Mohammed Khalid)',
  },
  {
    id: 'bibhuti-singh',
    name: 'Bibhuti Singh',
    role: 'CFO · AFICD',
    unit: 'Finance · Containers',
    photo: 'assets/images/leadership/pankaj-kumar.png',
    photoLogo: false,
    summary:
      'Oversees financial planning, risk analysis and corporate governance for African Inland Container Depot (AFICD) - Lake Group’s dry-port platform in Dar es Salaam.',
    paragraphs: [
      'AFICD is a core Group asset: an inland container depot at Tazara / Pugu Road with rail siding toward the port (~6 km), serving landlocked markets including Rwanda, Burundi, Uganda, DRC, Zambia and Malawi.',
      'The Dar yard covers about 14,000 m² with capacity around 4,000 TEU, SAP-based operations, container repairs, and sister sites in Zambia (Ndola) and Mozambique (Beira). ACFS extends the brand into a larger CFS terminal with warehouse, weighbridge and reefer capacity.',
      'As CFO, Singh’s brief is capital discipline and governance around that cargo engine - planning, risk and controls for import-export volumes, customs-linked workflows and container clearing.',
    ],
    mandate: [
      'Financial planning & performance for AFICD',
      'Risk analysis & corporate governance',
      'Support for ICD / CFS commercial operations',
    ],
    meta: [
      ['4,000', 'TEU capacity (Dar)'],
      ['Pugu Rd', 'Depot location'],
      ['3', 'Country sites'],
    ],
    links: [
      ['AFICD', 'aficd.html'],
      ['Container services', 'container-services.html'],
      ['Contact Group', 'contact.html'],
    ],
    emailSubject: 'Attention: CFO AFICD (Bibhuti Singh)',
  },
  {
    id: 'juma-nuru',
    name: 'Juma Nuru',
    role: 'Director of Operations · Lake Group',
    unit: 'Operations',
    photo: 'assets/images/leadership/juma-nuru.png',
    photoLogo: false,
    summary:
      'Leads Group-wide operations across Lake Group’s energy, logistics and industrial units - coordinating day-to-day execution and operational performance.',
    paragraphs: [
      'As Director of Operations, Juma Nuru is responsible for aligning day-to-day execution across Lake Group’s operating companies so energy, logistics and industrial units deliver reliably against Group standards.',
      'One of his key responsibilities is to ensure that all operations are executed efficiently and without disruption. This includes maintaining strong coordination between the operations team and management, so that everything runs seamlessly and in alignment with Lake Group’s goals.',
      'The role spans operational performance, coordination between business units, and continuous improvement of processes that keep depots, fleets, plants and commercial teams running as one organisation. Working through Group HQ in Dar es Salaam, the operations desk supports country and unit leadership with clear priorities, escalation paths and performance visibility.',
    ],
    quote:
      'As the Director of Operations, one of my key responsibilities is to ensure that all operations are executed efficiently and without disruption. This includes maintaining strong coordination between the operations team and management, so that everything runs seamlessly and in alignment with our goals.',
    mandate: [
      'Efficient, disruption-free Group operations',
      'Coordination between operations and management',
      'Performance monitoring and continuous improvement',
    ],
    meta: [
      ['Focus', 'Operations'],
      ['Scope', 'Group-wide'],
      ['HQ', 'Dar es Salaam'],
    ],
    links: [
      ['About Lake Group', 'about.html'],
      ['Our companies', 'services.html'],
      ['Contact', 'contact.html'],
    ],
    emailSubject: 'Attention: Director of Operations (Juma Nuru)',
  },
];

const DIR_STYLE = `
/* Leadership cards — match leadership.html directory language */
.ld-intro { max-width: 720px; margin: 0 auto var(--sp-12); text-align: center; }
.ld-intro .section-subtitle { margin-top: 14px; }
.ld-team-label { margin-bottom: var(--sp-10); text-align: center; }

a.ld-person-card {
  position: relative;
  display: flex; flex-direction: column; text-decoration: none; color: inherit;
  background: transparent;
  border: none;
  overflow: visible;
  transition: transform .28s var(--ease-out, ease);
}
a.ld-person-card:hover { transform: translateY(-3px); }
a.ld-person-card:focus-visible {
  outline: 2px solid var(--color-brand-blue, #0181BB);
  outline-offset: 4px;
  border-radius: 4px;
}

.ld-person-photo {
  position: relative;
  aspect-ratio: 4 / 3;
  border-radius: 10px;
  overflow: hidden;
  background: #EEF1F5;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ld-person-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 20%;
  display: block;
  transition: transform .4s var(--ease-out, ease);
}
a.ld-person-card:hover .ld-person-photo img { transform: scale(1.02); }

.ld-person-photo--logo {
  background: #EEF1F5;
}
.ld-person-photo--logo img {
  width: auto;
  height: auto;
  max-width: 58%;
  max-height: 55%;
  object-fit: contain;
  object-position: center center;
}
a.ld-person-card:hover .ld-person-photo--logo img { transform: none; }

.ld-person-body {
  padding: 16px 2px 0;
  display: flex; flex-direction: column; flex: 1; gap: 4px;
}
.ld-person-body h3 {
  font-family: var(--font-display, var(--font-heading));
  font-weight: 600;
  font-size: 1.08rem;
  letter-spacing: 0.01em;
  text-transform: none;
  margin: 0;
  color: #0A1628;
  line-height: 1.25;
}
.ld-person-role {
  color: #6B7280;
  font-size: 0.875rem;
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
  margin: 0;
  line-height: 1.4;
}
/* Directory hides bios; profile nav shows a short clamp */
.ld-person-sum { display: none; }
.lp-nav .ld-person-sum {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 0.875rem;
  color: var(--mute, var(--color-text-body));
  line-height: 1.5;
  margin: 6px 0 0;
  flex: 1;
}

.ld-person-more {
  margin-top: 14px;
  font-size: 0.9rem;
  font-weight: 500;
  letter-spacing: 0;
  text-transform: none;
  color: var(--color-brand-blue, #0181BB);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.ld-panel { background: var(--ink); padding: var(--sp-12) var(--sp-8); text-align: center; margin-top: var(--sp-16); }
.ld-panel h3 { color: #fff; font-family: var(--font-display, var(--font-heading)); font-weight: 400; font-size: clamp(1.7rem, 3vw, 2.4rem); text-transform: uppercase; letter-spacing: 0.02em; margin-bottom: var(--sp-3); }
.ld-panel p { color: var(--ink-text, rgba(255,255,255,.85)); max-width: 560px; margin: 0 auto; }

/* Profile page */
.lp-hero { padding: calc(var(--navbar-height, 72px) + 48px) 0 40px; background: linear-gradient(180deg, rgba(1,129,187,0.08), transparent); }
.lp-crumb { font-size: var(--breadcrumb-size, .72rem); letter-spacing: var(--breadcrumb-letter-spacing, .18em); text-transform: uppercase; color: var(--mute); margin-bottom: 18px; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.lp-crumb a { color: var(--color-brand-blue, #0181BB); text-decoration: none; }
.lp-crumb a:hover { text-decoration: underline; }
.lp-layout { display: grid; grid-template-columns: minmax(260px, 380px) 1fr; gap: clamp(32px, 5vw, 72px); align-items: start; padding-bottom: var(--sp-16); }
@media (max-width: 880px) { .lp-layout { grid-template-columns: 1fr; } }
.lp-photo-wrap { position: sticky; top: calc(var(--navbar-height, 72px) + 20px); }
@media (max-width: 880px) { .lp-photo-wrap { position: static; max-width: 420px; } }
.lp-photo { aspect-ratio: 4/5; overflow: hidden; background: var(--ink-3, #0e2433); border: 1px solid var(--line-2); }
.lp-photo img { width: 100%; height: 100%; object-fit: cover; object-position: top center; display: block; }
.lp-photo--logo { display: flex; align-items: center; justify-content: center; background: var(--surface); aspect-ratio: 1; }
.lp-photo--logo img { width: 58%; height: auto; object-fit: contain; }
.lp-unit { color: var(--gold-deep, var(--color-brand-blue)); font-size: var(--fs-micro, .72rem); font-weight: 700; letter-spacing: .18em; text-transform: uppercase; margin-bottom: 10px; }
.lp-name { font-family: var(--font-display, var(--font-heading)); font-weight: 400; font-size: clamp(2.4rem, 5vw, 3.8rem); line-height: 1; text-transform: uppercase; letter-spacing: .02em; margin: 0 0 10px; color: var(--ink, var(--color-text-heading)); }
.lp-role { font-size: 1.05rem; color: var(--mute); margin: 0 0 22px; }
.lp-lede { font-size: 1.12rem; line-height: 1.65; color: var(--ink, var(--color-text-heading)); margin: 0 0 22px; max-width: 62ch; }
.lp-body p { font-size: .98rem; line-height: 1.75; color: var(--mute, var(--color-text-body)); margin: 0 0 16px; max-width: 68ch; }
.lp-quote { font-family: var(--font-serif); font-style: italic; font-size: 1.15rem; line-height: 1.7; border-left: 3px solid var(--color-yellow-accent, #FFF200); padding: 4px 0 4px 20px; margin: 28px 0; color: var(--ink, var(--color-text-heading)); max-width: 60ch; }
.lp-mandate { list-style: none; padding: 0; margin: 28px 0; display: grid; gap: 12px; }
.lp-mandate li { display: grid; grid-template-columns: 36px 1fr; gap: 12px; align-items: start; padding: 14px 16px; background: var(--surface); border: 1px solid var(--line-2); }
.lp-mandate li span:first-child { font-weight: 700; color: var(--color-brand-blue, #0181BB); font-size: .8rem; letter-spacing: .08em; }
.lp-meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 28px 0; }
@media (max-width: 640px) { .lp-meta { grid-template-columns: 1fr; } }
.lp-meta div { padding: 16px; background: var(--surface); border: 1px solid var(--line-2); }
.lp-meta strong { display: block; font-size: 1.15rem; color: var(--ink, var(--color-text-heading)); margin-bottom: 4px; }
.lp-meta span { font-size: .82rem; color: var(--mute); }
.lp-contact { display: grid; gap: 10px; margin: 28px 0; padding: 20px; border: 1px solid var(--line-2); background: var(--surface); }
.lp-contact strong { display: block; font-size: .72rem; letter-spacing: .14em; text-transform: uppercase; color: var(--gold-deep, var(--color-brand-blue)); margin-bottom: 4px; }
.lp-contact a { color: var(--color-brand-blue, #0181BB); }
.lp-links { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 8px; }

/* Prev / next as full leadership cards */
.lp-nav {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 36px 28px;
  padding: 36px 0 12px;
  border-top: 1px solid var(--line-2);
  margin-top: 48px;
  align-items: stretch;
}
.lp-nav > a.ld-person-card { min-width: 0; }
.lp-nav-all {
  grid-column: 1 / -1;
  display: flex;
  justify-content: center;
  padding-top: 4px;
}
.lp-nav-all .btn { text-decoration: none; }
@media (max-width: 640px) {
  .lp-nav {
    grid-template-columns: 1fr;
    max-width: 320px;
    margin-left: auto;
    margin-right: auto;
    gap: 32px;
  }
}
`;

const LEADER_I18N = {
  'ally-edha-awadh': { name: 'leadership.9', role: 'leadership.8', sum: 'leadership.104' },
  'biji-lapat': { name: 'leadership.154', role: 'leadership.155', sum: 'leadership.156' },
  'dileep-kumar': { name: 'leadership.17', role: 'leadership.18', sum: 'leadership.105' },
  'sridhar-mani': { name: 'leadership.20', role: 'leadership.21', sum: 'leadership.106' },
  'mohammed-khalid': { name: 'leadership.23', role: 'leadership.24', sum: 'leadership.107' },
  'bibhuti-singh': { name: 'leadership.26', role: 'leadership.27', sum: 'leadership.108' },
  'juma-nuru': { name: 'leadership.51', role: 'leadership.52', sum: 'leadership.53' },
};

function personCardHtml(leader) {
  const photoClass = leader.photoLogo
    ? 'ld-person-photo ld-person-photo--logo'
    : 'ld-person-photo';
  const keys = LEADER_I18N[leader.id] || {};
  const nameKey = leader.i18nName || keys.name || '';
  const roleKey = leader.i18nRole || keys.role || '';
  const sumKey = leader.i18nSum || keys.sum || '';
  const nameAttr = nameKey ? ` data-i18n="${nameKey}"` : '';
  const roleAttr = roleKey ? ` data-i18n="${roleKey}"` : '';
  const sumAttr = sumKey ? ` data-i18n="${sumKey}"` : '';
  const altAttr = nameKey ? ` data-i18n-alt="${nameKey}"` : '';
  return `<a class="ld-person-card" href="leadership-${leader.id}.html">
          <div class="${photoClass}"><img src="${esc(leader.photo)}" alt="${esc(leader.name)}"${altAttr} loading="lazy" decoding="async"></div>
          <div class="ld-person-body">
            <h3><span${nameAttr}>${esc(leader.name)}</span></h3>
            <p class="ld-person-role"><span${roleAttr}>${esc(leader.role)}</span></p>
            <p class="ld-person-sum"><span${sumAttr}>${esc(leader.summary)}</span></p>
            <span class="ld-person-more"><span data-i18n="leadership.57">Read more</span></span>
          </div>
        </a>`;
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pageHead({ title, description, canonical }) {
  return (
    headPrefix
      .replace(
        /<meta name="description" content="[^"]*">/,
        `<meta name="description" content="${esc(description)}">`
      )
      .replace(
        /<meta property="og:title" content="[^"]*">/,
        `<meta property="og:title" content="${esc(title)}">`
      )
      .replace(
        /<meta property="og:description" content="[^"]*">/,
        `<meta property="og:description" content="${esc(description)}">`
      )
      .replace(
        /<link rel="canonical" href="[^"]*">/,
        `<link rel="canonical" href="https://www.lakeoilgroup.com/${canonical}">`
      )
      .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`) +
    `<style>\n${DIR_STYLE}\n</style>` +
    afterStyle
      .replace(/application\/ld\+json[\s\S]*?<\/script>/, 'application/ld+json">\n{}\n</script>')
  );
}

function card(leader) {
  const href = `leadership-${leader.id}.html`;
  const photoClass = leader.photoLogo
    ? 'ld-person-photo ld-person-photo--logo'
    : 'ld-person-photo';
  return `<a class="ld-person-card reveal" href="${href}">
        <div class="${photoClass}"><img src="${esc(leader.photo)}" alt="${esc(leader.name)}" loading="lazy" decoding="async"></div>
        <div class="ld-person-body">
          <h3>${esc(leader.name)}</h3>
          <p class="ld-person-role">${esc(leader.role)}</p>
          <p class="ld-person-sum">${esc(leader.summary)}</p>
          <span class="ld-person-more">Read more</span>
        </div>
      </a>`;
}

function buildDirectory() {
  const cards = LEADERS.map(card).join('\n      ');
  const body = `<div class="page-wrapper">
<section class="page-hero">
  <div class="hero-media" style="background-image:url('assets/images/leadership/annual-event.jpg')" aria-hidden="true"></div>
  <div class="hero-overlay" aria-hidden="true"></div>
  <div class="container" style="position:relative;z-index:2">
    <nav class="breadcrumb"><a href="index.html" data-i18n="nav.home">Home</a><span>/</span><span data-i18n="leadership.1">Leadership</span></nav>
    <div data-i18n="leadership.2" class="eyebrow">Our People</div>
    <h1 data-i18n="leadership.3">Our Leadership</h1>
    <p data-i18n="leadership.4">Meet the executives guiding Lake Group across energy, manufacturing, logistics and agribusiness in East and Central Africa.</p>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="ld-intro reveal">
      <div data-i18n="leadership.5" class="section-label" style="justify-content:center">Group Leadership</div>
      <h2 data-i18n="leadership.6" class="section-title">Guided by Experience. Driven by Vision.</h2>
      <p data-i18n="leadership.7" class="section-subtitle">Our leaders bring deep domain knowledge across energy, industry, technology and operations. Select a profile to learn more.</p>
    </div>

    <div class="ld-team-label">
      <div data-i18n="leadership.14" class="section-label" style="justify-content:center">Leadership Team</div>
      <h2 data-i18n="leadership.15" class="section-title" style="text-align:center">Corporate Management</h2>
    </div>

    <div class="ld-card-grid">
      ${cards}
    </div>

    <div class="ld-panel reveal">
      <h3 data-i18n="leadership.48">21 Nationalities. One Team.</h3>
      <p data-i18n="leadership.49">Lake Group's workforce reflects the rich diversity of the African continent, with 30,000+ professionals from 21 nationalities working together toward shared goals.</p>
      <a data-i18n="leadership.50" href="careers.html" class="btn btn-primary" style="margin-top:24px">Join Our Team</a>
    </div>
  </div>
</section>
</div>
`;

  const orgLd = `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Lake Group",
  "url": "https://www.lakeoilgroup.com/",
  "employee": [
${LEADERS.map(
  (l) =>
    `    {"@type": "Person", "name": ${JSON.stringify(l.name)}, "jobTitle": ${JSON.stringify(l.role)}, "url": "https://www.lakeoilgroup.com/leadership-${l.id}.html"}`
).join(',\n')}
  ]
}
</script>`;

  let head = pageHead({
    title: 'Leadership | Lake Group',
    description:
      'Meet the Lake Group leadership team. Explore dedicated profiles for executives across energy, manufacturing, logistics and agribusiness.',
    canonical: 'leadership.html',
  });
  head = head.replace(
    /<script type="application\/ld\+json">\s*\{\}\s*<\/script>/,
    orgLd
  );

  return head + nav + body + footer;
}

function buildProfile(leader, index) {
  const prev = LEADERS[(index - 1 + LEADERS.length) % LEADERS.length];
  const next = LEADERS[(index + 1) % LEADERS.length];
  const photoClass = leader.photoLogo ? 'lp-photo lp-photo--logo' : 'lp-photo';
  const paras = leader.paragraphs.map((p) => `<p>${esc(p)}</p>`).join('\n        ');
  const mandate = leader.mandate
    .map(
      (m, i) =>
        `<li><span>${String(i + 1).padStart(2, '0')}</span><span>${esc(m)}</span></li>`
    )
    .join('\n          ');
  const meta = leader.meta
    .map(([k, v]) => `<div><strong>${esc(k)}</strong><span>${esc(v)}</span></div>`)
    .join('\n        ');
  const links = leader.links
    .map(([label, href]) => {
      const ext = /^https?:/.test(href);
      return `<a href="${esc(href)}" class="btn btn-outline-dark btn-sm"${
        ext ? ' target="_blank" rel="noopener noreferrer"' : ''
      }>${esc(label)}${ext ? ' ↗' : ''}</a>`;
    })
    .join('\n          ');
  const quote = leader.quote
    ? `<blockquote class="lp-quote">“${esc(leader.quote)}”</blockquote>`
    : '';

  const body = `<div class="page-wrapper">
<section class="lp-hero">
  <div class="container">
    <nav class="lp-crumb" aria-label="Breadcrumb">
      <a href="index.html">Home</a><span>/</span>
      <a href="leadership.html">Leadership</a><span>/</span>
      <span>${esc(leader.name)}</span>
    </nav>
  </div>
</section>

<section class="section" style="padding-top:0">
  <div class="container">
    <div class="lp-layout">
      <aside class="lp-photo-wrap reveal">
        <div class="${photoClass}"><img src="${esc(leader.photo)}" alt="${esc(leader.name)}" width="480" height="600"></div>
      </aside>
      <article class="lp-body reveal">
        <div class="lp-unit">${esc(leader.unit)}</div>
        <h1 class="lp-name">${esc(leader.name)}</h1>
        <p class="lp-role">${esc(leader.role)}</p>
        <p class="lp-lede">${esc(leader.summary)}</p>
        ${paras}
        ${quote}
        <ul class="lp-mandate">
          ${mandate}
        </ul>
        <div class="lp-meta">
        ${meta}
        </div>
        <div class="lp-contact">
          <div><strong>Group HQ</strong><span>Plot 49, Mikocheni Light Industrial Area, P.O. Box 5055, Dar es Salaam, Tanzania</span></div>
          <div><strong>Phone</strong><a href="tel:+255222780510">+255 222 780 510</a> · <a href="tel:+255222780479">+255 222 780 479</a></div>
          <div><strong>Email</strong><a href="mailto:admin@lakeoilgroup.com?subject=${encodeURIComponent(leader.emailSubject)}">admin@lakeoilgroup.com</a></div>
        </div>
        <div class="lp-links">
          ${links}
        </div>
        <nav class="lp-nav" aria-label="Related leadership profiles">
          ${personCardHtml(prev)}
          ${personCardHtml(next)}
          <div class="lp-nav-all">
            <a href="leadership.html" class="btn btn-outline-dark btn-sm" data-i18n="leadership.58">All leadership</a>
          </div>
        </nav>
      </article>
    </div>
  </div>
</section>
</div>
`;

  const personLd = `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": ${JSON.stringify(leader.name)},
  "jobTitle": ${JSON.stringify(leader.role)},
  "worksFor": {"@type": "Organization", "name": "Lake Group"},
  "url": "https://www.lakeoilgroup.com/leadership-${leader.id}.html",
  "image": "https://www.lakeoilgroup.com/${leader.photo}"
}
</script>`;

  let head = pageHead({
    title: `${leader.name} - ${leader.role} | Lake Group`,
    description: leader.summary,
    canonical: `leadership-${leader.id}.html`,
  });
  head = head.replace(
    /<script type="application\/ld\+json">\s*\{\}\s*<\/script>/,
    personLd
  );

  return head + nav + body + footer;
}

// Write pages
fs.writeFileSync(path.join(ROOT, 'leadership.html'), buildDirectory());
console.log('wrote leadership.html');

for (let i = 0; i < LEADERS.length; i++) {
  const file = `leadership-${LEADERS[i].id}.html`;
  fs.writeFileSync(path.join(ROOT, file), buildProfile(LEADERS[i], i));
  console.log('wrote', file);
}

// Update sitemap if present
const smPath = path.join(ROOT, 'sitemap.xml');
if (fs.existsSync(smPath)) {
  let sm = fs.readFileSync(smPath, 'utf8');
  for (const l of LEADERS) {
    const loc = `https://www.lakeoilgroup.com/leadership-${l.id}.html`;
    if (!sm.includes(loc)) {
      sm = sm.replace(
        '</urlset>',
        `  <url>\n    <loc>${loc}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>\n</urlset>`
      );
    }
  }
  fs.writeFileSync(smPath, sm);
  console.log('updated sitemap.xml');
}

console.log('done');
