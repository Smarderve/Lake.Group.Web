// Complete 6 subsidiary pages using Lake Oil design template
const fs = require('fs');
const EOL = '\r\n';

const companies = {
  'lake-aviation.html': {
    breadcrumb: ['Home', 'Lake Energies', 'Lake Aviation'],
    eyebrow: 'Lake Energies',
    title: 'Lake Aviation',
    tagline: "Lake Group's aviation services division, providing Jet A-1 fuel supply to airports across Tanzania.",
    introTitle: "Fueling East Africa's Skies",
    introLede: "Lake Aviation is Lake Group's dedicated aviation fuel supply arm, providing high-quality Jet A-1 fuel to airlines, private operators and ground handling companies operating across Tanzania.",
    introDetail: "As part of Lake Group's Lake Energies family of companies, Lake Aviation leverages the Group's extensive petroleum supply chain and storage infrastructure to deliver reliable aviation fuel services to airports and airstrips nationwide.",
    introChecks: [
      'Jet A-1 aviation fuel supply to major airports',
      'Reliable fuel delivery and quality assurance',
      "Backed by Lake Group's regional supply chain network",
      'Competitive pricing through bulk procurement',
      'Commitment to safety and operational excellence'
    ],
    mission: "To provide safe, reliable and high-quality aviation fuel services that keep East Africa's aircraft flying, while maintaining the highest standards of safety and environmental responsibility.",
    vision: 'To become the leading aviation fuel supplier in East and Central Africa, powering regional aviation growth through operational excellence.',
    history: "Lake Aviation was established as a specialized division of Lake Group's Lake Energies sector, extending the Group's petroleum expertise into the aviation sector. Leveraging Lake Oil's established supply infrastructure, it serves airports across Tanzania with Jet A-1 fuel.",
    values: [
      { name: 'Quality', desc: 'Premium Jet A-1 fuel' },
      { name: 'Safety', desc: 'Rigorous safety protocols' },
      { name: 'Reliability', desc: 'On-time, every time' },
      { name: 'Service', desc: 'Aviation-focused support' }
    ],
    services: [
      { icon: 'mdi:airplane', title: 'Jet A-1 Supply', desc: 'Aviation fuel supplied to commercial airlines, cargo operators and private aviation.' },
      { icon: 'mdi:fuel', title: 'Fuel Quality Assurance', desc: 'Rigorous testing and filtration to meet international Jet A-1 standards.' },
      { icon: 'mdi:truck-delivery', title: 'Into-Plane Delivery', desc: 'Dedicated fuel truck delivery directly to aircraft at airport aprons.' },
      { icon: 'mdi:storage-tank', title: 'Bulk Storage', desc: 'Strategic storage facilities ensuring uninterrupted fuel supply for airports.' }
    ],
    products: [
      { icon: 'mdi:fuel', title: 'Jet A-1 Fuel', desc: 'High-quality kerosene-type aviation fuel for turbine-engine aircraft, meeting international specifications.' }
    ],
    operations: [
      { country: 'Tanzania', entity: 'Lake Aviation' }
    ],
    heroImg: "assets/images/banner/LakeOil1.jpg?v=81"
  },

  'lake-buildings.html': {
    breadcrumb: ['Home', 'Manufacturing', 'Lake Buildings'],
    eyebrow: 'Manufacturing',
    title: 'Lake Buildings',
    tagline: "Lake Group's building materials and construction manufacturing arm.",
    introTitle: "Building East Africa's Future",
    introLede: 'Lake Buildings Solutions Ltd. is Lake Group\'s building materials and construction manufacturing arm, part of the Manufacturing family of companies alongside Lake Steel, Lake Pipes and Gulf Concrete and Cement Products.',
    introDetail: "As part of Lake Group's broader industrial network across East and Central Africa, Lake Buildings supports the region's construction sector with quality building materials and solutions for residential, commercial and infrastructure projects.",
    introChecks: [
      'Building materials manufacturing and supply',
      'Construction solutions for residential and commercial projects',
      "Part of Lake Group's integrated manufacturing network",
      'Quality products meeting national standards',
      'Nationwide distribution across Tanzania'
    ],
    mission: 'To provide high-quality building materials and construction solutions that enable safe, sustainable and affordable construction across East and Central Africa.',
    vision: "To become East Africa's most trusted building materials partner, supporting the region's rapid urbanization and infrastructure development.",
    history: 'Lake Buildings Solutions Ltd. was established as part of Lake Group\'s Manufacturing division, alongside Lake Steel, Lake Pipes and Gulf Concrete and Cement Products. It serves Tanzania\'s growing construction sector with essential building materials and solutions.',
    values: [
      { name: 'Quality', desc: 'Premium building materials' },
      { name: 'Durability', desc: 'Built to last' },
      { name: 'Innovation', desc: 'Modern construction methods' },
      { name: 'Service', desc: 'Client-focused approach' }
    ],
    services: [
      { icon: 'mdi:hammer-wrench', title: 'Building Material Supply', desc: 'Comprehensive range of construction materials for residential and commercial projects.' },
      { icon: 'mdi:factory', title: 'Manufacturing', desc: 'In-house manufacturing capabilities ensuring consistent quality and supply.' },
      { icon: 'mdi:truck', title: 'Nationwide Distribution', desc: 'Reliable delivery network serving construction sites across Tanzania.' },
      { icon: 'mdi:handshake', title: 'Project Consultation', desc: 'Expert advice on material selection and construction solutions.' }
    ],
    products: [
      { icon: 'mdi:wall', title: 'Building Blocks & Bricks', desc: 'Quality concrete blocks and bricks for residential and commercial construction.' },
      { icon: 'mdi:cement', title: 'Cement-Based Products', desc: 'Cement and cement-based construction materials for various applications.' },
      { icon: 'mdi:stairs', title: 'Precast Elements', desc: 'Precast concrete elements for faster, more efficient construction.' }
    ],
    operations: [
      { country: 'Tanzania', entity: 'Lake Buildings' }
    ],
    heroImg: "assets/images/lakebuildings/ops/lake-tanks.jpg?v=80"
  },

  'lake-pipes.html': {
    breadcrumb: ['Home', 'Manufacturing', 'Lake Pipes'],
    eyebrow: 'Manufacturing',
    title: 'Lake Pipes',
    tagline: "Lake Group's plastics manufacturing arm serving packaging and construction markets.",
    introTitle: 'Plastics Solutions for Industry',
    introLede: 'Lake Pipes Ltd. is Lake Group\'s dedicated plastics manufacturing arm, producing quality plastic products for packaging and construction applications across Tanzania and the region.',
    introDetail: "As part of Lake Group's Manufacturing family of companies, Lake Pipes leverages modern manufacturing capabilities to serve diverse industries from packaging to construction with reliable, quality products.",
    introChecks: [
      'Plastic products for packaging and construction',
      'Modern manufacturing processes',
      "Part of Lake Group's integrated manufacturing network",
      'Quality products meeting industry standards',
      'Serving Tanzania and the wider region'
    ],
    mission: 'To manufacture high-quality plastic products that serve essential needs in packaging, construction and industry, while advancing sustainable manufacturing practices.',
    vision: 'To be a leading plastics manufacturer in East Africa, known for quality, innovation and environmental responsibility.',
    history: 'Lake Pipes Ltd. was established as part of Lake Group\'s Manufacturing division, expanding the Group\'s industrial capabilities into plastics production. It serves diverse sectors with essential plastic products for everyday use.',
    values: [
      { name: 'Quality', desc: 'Consistent product quality' },
      { name: 'Innovation', desc: 'Modern manufacturing' },
      { name: 'Reliability', desc: 'Dependable supply chain' },
      { name: 'Sustainability', desc: 'Responsible production' }
    ],
    services: [
      { icon: 'mdi:package-variant-closed', title: 'Packaging Solutions', desc: 'Plastic packaging products for industrial and consumer goods sectors.' },
      { icon: 'mdi:pipe', title: 'Construction Plastics', desc: 'Plastic pipes, fittings and construction materials for building projects.' },
      { icon: 'mdi:factory', title: 'Contract Manufacturing', desc: 'Custom plastic manufacturing services for business clients.' },
      { icon: 'mdi:truck-delivery', title: 'Bulk Supply', desc: 'Large-volume supply and distribution for industrial customers.' }
    ],
    products: [
      { icon: 'mdi:package-variant', title: 'Industrial Packaging', desc: 'High-quality plastic packaging materials for industrial and manufacturing sectors.' },
      { icon: 'mdi:pipe-leak', title: 'PVC Pipes & Fittings', desc: 'Durable PVC pipes and fittings for plumbing, drainage and construction.' },
      { icon: 'mdi:recycle', title: 'Consumer Products', desc: 'Plastic household and consumer products manufactured to quality standards.' }
    ],
    operations: [
      { country: 'Tanzania', entity: 'Lake Pipes' }
    ],
    heroImg: "assets/images/lakepipes/ops/blue-pipes.jpg?v=80"
  },

  'aill.html': {
    breadcrumb: ['Home', 'Logistics', 'AILL'],
    eyebrow: 'Logistics',
    title: 'AILL',
    tagline: 'African Inland Logistic Limited — logistics support and container freight station services.',
    introTitle: 'Inland Logistics Across the Region',
    introLede: 'AILL (African Inland Logistic Limited) is part of Lake Group\'s Logistics family of companies, providing logistics support and container freight station services alongside Lake Trans and AFICD.',
    introDetail: "As part of Lake Group's broader logistics network across East and Central Africa, AILL supports the Group's inland freight and haulage capabilities, handling containerized cargo and logistics operations.",
    introChecks: [
      'Container freight station (CFS) services',
      'Logistics support and cargo handling',
      'Inland freight and haulage capabilities',
      "Part of Lake Group's integrated logistics network",
      "Serving Tanzania's import and export trade"
    ],
    mission: 'To provide efficient, reliable logistics and container freight services that facilitate trade and commerce across East and Central Africa.',
    vision: 'To become a leading logistics services provider in the region, known for operational excellence and customer service.',
    history: 'AILL (African Inland Logistic Limited) was established as part of Lake Group\'s Logistics division, complementing Lake Trans\'s transport capabilities and AFICD\'s container depot operations with freight station services.',
    values: [
      { name: 'Efficiency', desc: 'Streamlined operations' },
      { name: 'Reliability', desc: 'On-time delivery guaranteed' },
      { name: 'Safety', desc: 'Safety-first approach' },
      { name: 'Service', desc: 'Customer-focused logistics' }
    ],
    services: [
      { icon: 'mdi:warehouse', title: 'Container Freight Station', desc: 'CFS services for consolidation, deconsolidation and handling of containerized cargo.' },
      { icon: 'mdi:truck', title: 'Inland Haulage', desc: 'Inland freight transport connecting ports to inland destinations.' },
      { icon: 'mdi:clipboard-check', title: 'Cargo Handling', desc: 'Professional cargo handling, sorting and warehousing services.' },
      { icon: 'mdi:file-document', title: 'Documentation Support', desc: 'Customs clearance and shipping documentation assistance.' }
    ],
    products: [
      { icon: 'mdi:package-variant-closed', title: 'Freight Forwarding', desc: 'Comprehensive freight forwarding services for importers and exporters.' },
      { icon: 'mdi:warehouse', title: 'Warehousing', desc: 'Secure warehousing and inventory management for goods in transit.' },
      { icon: 'mdi:truck-fast', title: 'Distribution Logistics', desc: 'Last-mile distribution and supply chain logistics services.' }
    ],
    operations: [
      { country: 'Tanzania', entity: 'AILL' }
    ],
    heroImg: "assets/images/banner/LakeTrans.jpg"
  },

  'cross-country.html': {
    breadcrumb: ['Home', 'Real Estate', 'Cross Country'],
    eyebrow: 'Real Estate',
    title: 'Cross Country',
    tagline: "Lake Group's real estate division, part of the Real Estate family of companies.",
    introTitle: 'Real Estate Development in Tanzania',
    introLede: 'Cross Country Ltd. is Lake Group\'s real estate division, part of the Group\'s Real Estate family of companies alongside Ocean Galleria.',
    introDetail: "As part of Lake Group's broader footprint across East and Central Africa, Cross Country extends the Group's presence into property and real estate development, focusing on commercial and residential opportunities in Tanzania.",
    introChecks: [
      'Real estate development and management',
      'Commercial and residential property focus',
      "Part of Lake Group's diversified portfolio",
      'Strategic locations in Tanzania',
      'Commitment to quality development'
    ],
    mission: 'To develop and manage quality real estate assets that create value for stakeholders and contribute to Tanzania\'s urban development.',
    vision: 'To be a respected real estate developer in Tanzania, known for quality projects and sustainable community development.',
    history: 'Cross Country Ltd. was established as Lake Group\'s real estate arm, complementing the Group\'s Ocean Galleria waterfront development project. It focuses on identifying and developing commercial and residential real estate opportunities.',
    values: [
      { name: 'Quality', desc: 'Premium developments' },
      { name: 'Integrity', desc: 'Ethical business practices' },
      { name: 'Innovation', desc: 'Modern design standards' },
      { name: 'Community', desc: 'Building better communities' }
    ],
    services: [
      { icon: 'mdi:office-building', title: 'Property Development', desc: 'End-to-end property development from land acquisition to project completion.' },
      { icon: 'mdi:home-group', title: 'Residential Projects', desc: 'Quality residential developments for Tanzania\'s growing urban population.' },
      { icon: 'mdi:store', title: 'Commercial Real Estate', desc: 'Commercial property development including retail and office spaces.' },
      { icon: 'mdi:handshake', title: 'Property Management', desc: 'Professional property management and tenant relations services.' }
    ],
    products: [
      { icon: 'mdi:home', title: 'Residential Properties', desc: 'Quality homes and residential units in prime locations across Tanzania.' },
      { icon: 'mdi:office-building', title: 'Commercial Spaces', desc: 'Office and retail spaces designed for modern business needs.' },
      { icon: 'mdi:land-plots', title: 'Land Development', desc: 'Strategic land acquisition and development for future projects.' }
    ],
    operations: [
      { country: 'Tanzania', entity: 'Cross Country' }
    ],
    heroImg: "assets/images/merm/photo_1.jpg"
  },

  'ocean-galleria.html': {
    breadcrumb: ['Home', 'Real Estate', 'Ocean Galleria'],
    eyebrow: 'Real Estate',
    title: 'Ocean Galleria',
    tagline: 'Luxury waterfront lifestyle and shopping destination under development in Masaki, Dar es Salaam.',
    introTitle: "Dar es Salaam's Premier Waterfront Destination",
    introLede: 'Ocean Galleria is a luxury waterfront lifestyle and shopping destination under development in the prestigious Masaki neighborhood of Dar es Salaam, Tanzania.',
    introDetail: "As part of Lake Group's Real Estate portfolio, Ocean Galleria promises to be a landmark destination featuring retail spaces, dining venues and entertainment facilities in a stunning oceanfront setting.",
    introChecks: [
      'Prime waterfront location in Masaki, Dar es Salaam',
      'Luxury retail shopping experience',
      'World-class dining and entertainment venues',
      'Landmark architectural design',
      "Creating a new lifestyle destination for Tanzania"
    ],
    mission: 'To create a world-class waterfront destination that offers an unparalleled shopping, dining and lifestyle experience for Dar es Salaam\'s residents and visitors.',
    vision: "To become Tanzania's premier lifestyle and retail destination, setting new standards for waterfront development in East Africa.",
    history: 'Ocean Galleria Ltd. was established as Lake Group\'s flagship real estate project, developing a luxury waterfront destination in the upscale Masaki neighborhood of Dar es Salaam. The project represents Lake Group\'s vision for premium lifestyle and retail experiences in Tanzania.',
    values: [
      { name: 'Excellence', desc: 'World-class design' },
      { name: 'Luxury', desc: 'Premium experience' },
      { name: 'Innovation', desc: 'Modern architecture' },
      { name: 'Community', desc: 'Creating destinations' }
    ],
    services: [
      { icon: 'mdi:shopping', title: 'Retail Destination', desc: 'Premium retail spaces housing international and local brands in a stunning waterfront setting.' },
      { icon: 'mdi:silverware-fork-knife', title: 'Dining & Entertainment', desc: 'World-class restaurants, cafes and entertainment venues with ocean views.' },
      { icon: 'mdi:event', title: 'Events & Gatherings', desc: 'Versatile spaces for events, exhibitions and community gatherings.' },
      { icon: 'mdi:parking', title: 'Premium Amenities', desc: 'Ample parking, security and premium amenities for a world-class experience.' }
    ],
    products: [
      { icon: 'mdi:store', title: 'Retail Spaces', desc: 'Premium retail units available for lease to local and international brands.' },
      { icon: 'mdi:restaurant', title: 'Dining Venues', desc: 'Restaurant and café spaces with stunning Indian Ocean views.' },
      { icon: 'mdi:projector', title: 'Entertainment Facilities', desc: 'Modern entertainment venues for leisure and cultural experiences.' }
    ],
    operations: [
      { country: 'Tanzania', entity: 'Ocean Galleria' }
    ],
    heroImg: "assets/images/merm/photo_2.jpg"
  }
};

// Build page-wrapper content
function build(co) {
  const chk = co.introChecks.map(c => `<li><span><iconify-icon icon="mdi:check" width="16" height="16" aria-hidden="true"></iconify-icon></span>${c}</li>`).join(EOL + '          ');
  const ops = co.operations.map(o => {
    const cc = o.country.toLowerCase() === 'tanzania' ? 'tz' : o.country.toLowerCase() === 'kenya' ? 'ke' : o.country.toLowerCase() === 'zambia' ? 'zm' : o.country.toLowerCase() === 'burundi' ? 'bi' : 'cd';
    return `<div class="info-row"><span><img src="assets/images/flags/${cc}.svg" alt="" class="flag-icon" width="20" height="15" loading="lazy" decoding="async"> ${o.country}</span><span class="badge badge-yellow">${o.entity}</span></div>`;
  }).join(EOL + '            ');
  const vals = co.values.map(v => `<div class="val-mini-tile"><h4>${v.name}</h4><p>${v.desc}</p></div>`).join(EOL + '      ');
  const svcs = co.services.map(s => `<div class="fs-card" style="text-align:center;padding:var(--sp-8) var(--sp-6)"><div class="edge-ico" aria-hidden="true"><iconify-icon icon="${s.icon}" width="28" height="28"></iconify-icon></div><h4 style="font-family:var(--font-display);font-weight:700;font-size:1.1rem;letter-spacing:.03em;text-transform:uppercase">${s.title}</h4><p style="font-size:.88rem;margin-top:6px">${s.desc}</p></div>`).join(EOL + '      ');
  const prods = co.products.map(p => `<div class="prod-catalog-card">
        <div class="prod-glyph" aria-hidden="true"><iconify-icon icon="${p.icon}" width="36" height="36"></iconify-icon></div>
        <h4>${p.title}</h4>
        <p>${p.desc}</p>
      </div>`).join(EOL + '      ');

  return `<div class="page-wrapper">${EOL}<section class="page-hero">${EOL}  <div class="hero-media" style="background-image:url('${co.heroImg}')" aria-hidden="true"></div>${EOL}  <div class="hero-overlay" aria-hidden="true"></div>${EOL}  <div class="container">${EOL}    <nav class="breadcrumb"><a href="index.html" data-i18n="nav.home">Home</a><span>/</span><span>${co.breadcrumb[1]}</span><span>/</span><span>${co.breadcrumb[2]}</span></nav>${EOL}    <div class="eyebrow">${co.eyebrow}</div><h1>${co.title}</h1><p>${co.tagline}</p>${EOL}</div></section>${EOL}${EOL}<!-- 1. COMPANY INTRODUCTION -->${EOL}<section class="fs-section">${EOL}  <div class="container">${EOL}    <div class="fs-split-even">${EOL}      <div>${EOL}        <div class="fs-marker"><span class="fs-marker-no">01</span><span class="fs-eyebrow">Company Introduction</span></div>${EOL}        <h2 class="fs-display">${co.introTitle}</h2>${EOL}        <hr class="fs-rule" style="margin:var(--sp-5) 0">${EOL}        <p class="fs-lede">${co.introLede}</p>${EOL}        <p style="margin-top:14px">${co.introDetail}</p>${EOL}        <ul class="fs-check">${EOL}          ${chk}${EOL}        </ul>${EOL}      </div>${EOL}      <div>${EOL}        <div class="info-panel fs-on-dark fs-corners">${EOL}          <h3>Operations by Country</h3>${EOL}          <div>${EOL}            ${ops}${EOL}          </div>${EOL}        </div>${EOL}      </div>${EOL}    </div>${EOL}  </div>${EOL}</section>${EOL}${EOL}<section class="fs-section fs-on-dark">${EOL}  <div class="container">${EOL}    <div class="fs-marker"><span class="fs-marker-no">02</span><span class="fs-eyebrow">About the Company</span></div>${EOL}    <h2 class="fs-display" style="margin-bottom:var(--sp-6)">Mission, Vision &amp; History</h2>${EOL}    <div class="fs-split-even">${EOL}      <div>${EOL}        <h3 style="color:var(--white);font-family:var(--font-display);font-weight:700;font-size:1.3rem;letter-spacing:.03em;text-transform:uppercase;margin-bottom:10px">Mission</h3>${EOL}        <p>${co.mission}</p>${EOL}      </div>${EOL}      <div>${EOL}        <h3 style="color:var(--white);font-family:var(--font-display);font-weight:700;font-size:1.3rem;letter-spacing:.03em;text-transform:uppercase;margin-bottom:10px">Vision</h3>${EOL}        <p>${co.vision}</p>${EOL}      </div>${EOL}    </div>${EOL}    <div style="margin-top:var(--sp-10)">${EOL}      <h3 style="color:var(--white);font-family:var(--font-display);font-weight:700;font-size:1.3rem;letter-spacing:.03em;text-transform:uppercase;margin-bottom:10px">History</h3>${EOL}      <p style="max-width:80ch;line-height:1.75">${co.history}</p>${EOL}    </div>${EOL}    <div class="val-mini-grid" aria-label="Core values">${EOL}      ${vals}${EOL}    </div>${EOL}  </div>${EOL}</section>${EOL}${EOL}<section class="fs-section section-light">${EOL}  <div class="container">${EOL}    <div class="fs-marker"><span class="fs-marker-no">03</span><span class="fs-eyebrow">Services Offered</span></div>${EOL}    <h2 class="fs-display" style="margin-bottom:var(--sp-6)">Our Services</h2>${EOL}    <div class="grid-4">${EOL}      ${svcs}${EOL}    </div>${EOL}</div>${EOL}</section>${EOL}${EOL}<section class="fs-section">${EOL}  <div class="container">${EOL}    <div class="fs-marker"><span class="fs-marker-no">04</span><span class="fs-eyebrow">Products Offered</span></div>${EOL}    <h2 class="fs-display" style="margin-bottom:var(--sp-6)">Our Products</h2>${EOL}    <div class="prod-catalog">${EOL}      ${prods}${EOL}    </div>${EOL}</div>${EOL}</section>${EOL}${EOL}</div>`;
}

// Process each file
const files = Object.keys(companies);
files.forEach(file => {
  if (!fs.existsSync(file)) { console.log(`SKIP: ${file} not found`); return; }

  let content = fs.readFileSync(file, 'utf8');
  const co = companies[file];

  // Find markers - content before page-wrapper and after the closing div before footer
  const pwStart = 'class="page-wrapper"';
  const footerStart = 'class="site-footer"';

  let idx1 = content.indexOf(pwStart);
  let idx2 = content.indexOf(footerStart);

  if (idx1 === -1 || idx2 === -1) {
    console.log(`ERROR: ${file} - markers not found`); return;
  }

  // Find the start of <div class="page-wrapper">
  let divStart = content.lastIndexOf('<div ', idx1);
  // Find the </div> just before <footer
  let divEnd = content.lastIndexOf('</div>', idx2);

  if (divStart === -1 || divEnd === -1) {
    console.log(`ERROR: ${file} - wrapper divs not found`); return;
  }

  // The old content to replace includes from divStart to divEnd + 6 (length of </div>)
  let oldLen = content.substring(divStart, divEnd + 6).split(EOL).length;
  let newWrapper = build(co);
  let newContent = content.substring(0, divStart) + newWrapper + content.substring(divEnd + 6);

  // Fix lake-buildings and lake-pipes missing data-nav-logo
  if (file === 'lake-buildings.html' && !newContent.includes('data-nav-logo')) {
    newContent = newContent.replace(
      'data-company-alt="Lake Buildings">',
      'data-company-alt="Lake Buildings" data-nav-logo="assets/images/logos/companies/lake-energies.png" data-nav-alt="Lake Energies">'
    );
    console.log(`${file}: Added data-nav-logo attributes`);
  }
  if (file === 'lake-pipes.html' && !newContent.includes('data-nav-logo')) {
    newContent = newContent.replace(
      'data-company-alt="Lake Pipes">',
      'data-company-alt="Lake Pipes" data-nav-logo="assets/images/logos/companies/lake-energies.png" data-nav-alt="Lake Energies">'
    );
    console.log(`${file}: Added data-nav-logo attributes`);
  }

  fs.writeFileSync(file, newContent, 'utf8');
  let newLen = newWrapper.split(EOL).length;
  console.log(`${file}: ${oldLen} lines -> ${newLen} lines`);
});

console.log('\nAll 6 pages completed!');
