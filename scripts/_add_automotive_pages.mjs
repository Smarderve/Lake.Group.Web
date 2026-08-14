// Generates placeholder company pages for the three Automotive sector companies.
// Reuses the shared chrome (head CSS/JSON-LD/CSP, site-nav, nav-mobile, footer,
// chat widget, scripts) from lake-agro.html, with per-company metadata in the
// head and a minimal neutral body (no company data, per the task).
import fs from 'node:fs';

const src = fs.readFileSync('lake-agro.html', 'utf8');
const lines = src.split('\n');

// Chrome slices of lake-agro.html (verified line numbers):
//   1..232  head + </head><body ...>     (1-indexed)
//   233     skeleton.js script tag
//   234..373 site-nav
//   375..430 nav-mobile (closes at 430)
//   431..433 blank lines
//   434..~598 page-wrapper (company content) - REPLACED
//   600..656 footer
//   658..681 chat widget + blanks
//   683..692 scripts
const slice = (a, b) => lines.slice(a - 1, b).join('\n');
const head = slice(1, 233);          // includes skeleton.js line
const navDesktop = slice(234, 373);
const navMobile = slice(375, 430);
const footer = slice(600, 656);
const tail = slice(658, 693);        // chat widget + scripts + </body></html>

const companies = [
  {
    slug: 'assembly-tech',
    title: 'Assembly Tech Limited',
    short: 'Assembly Tech',
    crumb: 'Automotive',
    theme: 'automotive',
    meta: 'Assembly Tech Limited is part of the Lake Group.',
  },
  {
    slug: 'agrinova-tech',
    title: 'AgriNova Tech Limited',
    short: 'AgriNova Tech',
    crumb: 'Automotive',
    theme: 'automotive',
    meta: 'AgriNova Tech Limited is part of the Lake Group.',
  },
  {
    slug: 'nextdrive-motors',
    title: 'NextDrive Motors Limited',
    short: 'NextDrive Motors',
    crumb: 'Automotive',
    theme: 'automotive',
    meta: 'NextDrive Motors Limited is part of the Lake Group.',
  },
];

const headBlock = (c) => {
  let h = head;
  // skel-critical background: neutral brand navy instead of agro green
  h = h.replace('background:#004b1e;', 'background:#013f5c;');
  // body tag: neutral chrome with placeholder logo + automotive theme class
  h = h.replace(
    /<body data-company-logo="[^"]*" data-company-alt="[^"]*" class="[^"]*">/,
    `<body data-company-logo="assets/images/logos/companies/lake-group-placeholder.png" data-company-alt="${c.title}" class="co-theme-automotive">`
  );
  // title
  h = h.replace(/<title>[^<]*<\/title>/, `<title>${c.title} | Automotive | Lake Group</title>`);
  // meta description
  h = h.replace(
    /<meta name="description" content="[^"]*">/,
    `<meta name="description" content="${c.meta}">`
  );
  // twitter description
  h = h.replace(
    /<meta name="twitter:description" content="[^"]*">/,
    `<meta name="twitter:description" content="${c.meta}">`
  );
  // twitter title
  h = h.replace(
    /<meta name="twitter:title" content="[^"]*">/,
    `<meta name="twitter:title" content="${c.title} | Automotive | Lake Group">`
  );
  // og:url + canonical
  h = h.replace(
    /<meta property="og:url" content="[^"]*">/,
    `<meta property="og:url" content="https://www.lakeoilgroup.com/${c.slug}.html">`
  );
  h = h.replace(
    /<link rel="canonical" href="[^"]*">/,
    `<link rel="canonical" href="https://www.lakeoilgroup.com/${c.slug}.html">`
  );
  // og:title
  h = h.replace(
    /<meta property="og:title" content="[^"]*">/,
    `<meta property="og:title" content="${c.title} | Automotive | Lake Group">`
  );
  // og:description
  h = h.replace(
    /<meta property="og:description" content="[^"]*">/,
    `<meta property="og:description" content="${c.meta}">`
  );
  // theme-color
  h = h.replace(/<meta name="theme-color" content="[^"]*">/, '<meta name="theme-color" content="#013f5c">');
  return h;
};

const jsonLd = (c) => `  <script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "name": "${c.title}",
      "description": "${c.meta}",
      "url": "https://www.lakeoilgroup.com/${c.slug}.html",
      "parentOrganization": {
        "@type": "Organization",
        "name": "Lake Group",
        "url": "https://www.lakeoilgroup.com/"
      }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://www.lakeoilgroup.com/"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Automotive"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "${c.title}",
          "item": "https://www.lakeoilgroup.com/${c.slug}.html"
        }
      ]
    }
  ]
}
</script>`;

// Replace the source JSON-LD block (starts at the <script type="application/ld+json"> line)
const buildHead = (c) => {
  let h = headBlock(c);
  const start = h.indexOf('<script type="application/ld+json">');
  const end = h.indexOf('</script>', start) + '</script>'.length;
  h = h.slice(0, start) + jsonLd(c) + h.slice(end);
  return h;
};

const body = (c) => `  <div class="page-wrapper">
    <section class="page-hero">
      <div class="hero-media" style="background:linear-gradient(135deg,#013f5c 0%,#0a2e44 55%,#17324a 100%)" aria-hidden="true"></div>
      <div class="hero-overlay" aria-hidden="true"></div>
      <div class="container">
        <nav class="breadcrumb"><a href="index.html" data-i18n="nav.home">Home</a><span>/</span><span>Subsidiaries</span><span>/</span><span>Automotive</span><span>/</span><span>${c.title}</span></nav>
        <div class="co-logo-row"><img src="assets/images/logos/companies/lake-group-placeholder.png" alt="${c.title}" width="320" height="72" loading="lazy" decoding="async"></div>
        <h1 class="hero-title">${c.title}</h1>
        <p class="hero-sub">${c.meta} More information will be added as it becomes available.</p>
      </div>
    </section>

    <section class="fs-section">
      <div class="container">
        <div class="eyebrow">Automotive Sector</div>
        <h2 class="fs-title">Profile coming soon</h2>
        <p class="fs-lead">We are preparing this page. Company details will be published here once they are confirmed.</p>
      </div>
    </section>
  </div>`;

for (const c of companies) {
  const out = [
    buildHead(c),
    navDesktop,
    '',
    navMobile,
    '',
    body(c),
    '',
    footer,
    tail,
  ].join('\n');
  fs.writeFileSync(`${c.slug}.html`, out);
  console.log(`wrote ${c.slug}.html (${out.split('\n').length} lines)`);
}
