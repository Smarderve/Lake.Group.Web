#!/usr/bin/env node
/*
 * Idempotently injects SEO tags into every root HTML page:
 *   - <link rel="canonical"> where missing
 *   - favicon links (favicon.ico + PNG fallback + apple-touch-icon)
 *   - one <script type="application/ld+json"> per page (Organization /
 *     ContactPage / CollectionPage / Service + BreadcrumbList) before </head>
 *
 * Targeted string insertions only; never reformats surrounding markup.
 * Safe to re-run (pattern borrowed from add_pwa_tags.js).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BASE = 'https://www.lakeoilgroup.com/';

const ICON_LINKS = [
  '<link rel="icon" href="favicon.ico" sizes="32x32">',
  '<link rel="icon" href="assets/icons/pwa/icon-192.png" type="image/png" sizes="192x192">',
  '<link rel="apple-touch-icon" href="assets/icons/pwa/apple-touch-icon.png">',
];

const ORG_ID = BASE + '#organization';

const ORGANIZATION = {
  '@type': 'Organization',
  '@id': ORG_ID,
  name: 'Lake Group',
  url: BASE,
  logo: BASE + 'assets/images/logos/LAKE_GROUP_LOGO.jpg',
  foundingDate: '2006',
  founder: { '@type': 'Person', name: 'Ally Edha Awadh' },
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Plot 49, Mikocheni Light Industrial',
    addressLocality: 'Dar es Salaam',
    addressCountry: 'TZ',
  },
  telephone: '+255 222 780 510',
  email: 'admin@lakeoilgroup.com',
  sameAs: [
    'https://www.facebook.com/lakeoilgroup',
    'https://twitter.com/lakeoilgroup',
    'https://www.linkedin.com/company/lake-oil',
    'https://www.youtube.com/@lakeoilgroup',
  ],
};

// Breadcrumb page-name per file (matches the visible .breadcrumb nav).
// news-article.html has an extra News level, handled below.
const BREADCRUMB_NAMES = {
  'about.html': 'About Us',
  'africa-network.html': 'Africa Network',
  'careers.html': 'Careers',
  'concrete.html': 'Concrete & Aggregate',
  'contact.html': 'Contact Us',
  'container-services.html': 'Container Services',
  'csr.html': 'CSR & Sustainability',
  'fleet.html': 'Our Fleet',
  'fuel.html': 'Fuel & Petroleum',
  'gallery.html': 'Gallery',
  'history.html': 'Our History',
  'investors.html': 'Investor Relations',
  'leadership.html': 'Leadership',
  'logistics.html': 'Transport & Haulage',
  'lpg.html': 'LPG Gas',
  'lubricants.html': 'Lubricants',
  'media-center.html': 'Media Center',
  'news-article.html': 'Article',
  'news.html': 'News & Events',
  'projects.html': 'Major Projects',
  'services.html': 'Services',
  'station-locator.html': 'Station Locator',
  'steel.html': 'Lake Steel',
  'sustainability.html': 'Sustainability',
};

// Service JSON-LD: name/description mirror each page's meta description.
const SERVICES = {
  'fuel.html': {
    name: 'Fuel & Petroleum',
    description:
      'Lake Oil — Top 5 petroleum distributor in Tanzania with 85+ retail stations and bulk supply across 8 countries.',
  },
  'lpg.html': {
    name: 'LPG Gas',
    description:
      'LPG bottling, composite cylinders and distribution across East and Central Africa.',
  },
  'lubricants.html': {
    name: 'Lubricants',
    description:
      'Lake Lubes manufactures quality lubricants and greases for automotive and industrial applications.',
  },
  'steel.html': {
    name: 'Lake Steel',
    description:
      "Tanzania's first HS-CR rebar manufacturer with 100,000 MT annual rolling mill capacity.",
  },
  'concrete.html': {
    name: 'Concrete & Aggregate',
    description:
      "Gulf Concrete & Cement Products — Dar es Salaam's leading ready-mix concrete and aggregate supplier.",
  },
  'logistics.html': {
    name: 'Transport & Haulage',
    description:
      'Bulk liquid and dry cargo haulage with 700+ trucks across Tanzania, Kenya, Zambia and the wider region.',
  },
  'container-services.html': {
    name: 'Container Services',
    description:
      'Inland container depot and freight station services across Tanzania, Zambia and Mozambique.',
  },
};

// dashboard.html (demo portal) and offline.html are excluded from search
// (robots.txt), so they get icons/canonical but no structured data.
const NO_JSONLD = new Set(['dashboard.html', 'offline.html']);

function pageUrl(file) {
  return file === 'index.html' ? BASE : BASE + file;
}

function breadcrumbLd(file) {
  const items = [
    { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
  ];
  if (file === 'news-article.html') {
    items.push({
      '@type': 'ListItem',
      position: 2,
      name: 'News & Events',
      item: BASE + 'news.html',
    });
  }
  items.push({
    '@type': 'ListItem',
    position: items.length + 1,
    name: BREADCRUMB_NAMES[file],
    item: pageUrl(file),
  });
  return { '@type': 'BreadcrumbList', itemListElement: items };
}

function jsonLdFor(file, html) {
  const graph = [];

  if (file === 'index.html') {
    graph.push(ORGANIZATION);
  } else if (file === 'contact.html') {
    graph.push({
      '@type': 'ContactPage',
      name: 'Contact Us — Lake Group',
      url: pageUrl(file),
      about: { '@id': ORG_ID },
    });
    graph.push({
      '@type': 'Organization',
      '@id': ORG_ID,
      name: 'Lake Group',
      url: BASE,
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        telephone: '+255 222 780 510',
        email: 'admin@lakeoilgroup.com',
        areaServed: 'TZ',
      },
    });
  } else if (file === 'news.html') {
    graph.push({
      '@type': 'CollectionPage',
      name: 'News & Events — Lake Group',
      url: pageUrl(file),
      description:
        'Latest announcements, expansions and community activities from Lake Group across Africa.',
    });
  } else if (SERVICES[file]) {
    graph.push({
      '@type': 'Service',
      name: SERVICES[file].name,
      description: SERVICES[file].description,
      url: pageUrl(file),
      provider: { '@type': 'Organization', name: 'Lake Group', url: BASE },
      areaServed: 'East and Central Africa',
    });
  }

  // BreadcrumbList only where a visual .breadcrumb nav already exists.
  if (BREADCRUMB_NAMES[file] && html.includes('class="breadcrumb"')) {
    graph.push(breadcrumbLd(file));
  }

  if (graph.length === 0) return null;
  const doc =
    graph.length === 1
      ? Object.assign({ '@context': 'https://schema.org' }, graph[0])
      : { '@context': 'https://schema.org', '@graph': graph };
  return (
    '<script type="application/ld+json">\n' +
    JSON.stringify(doc, null, 2) +
    '\n</script>'
  );
}

const files = fs
  .readdirSync(ROOT)
  .filter((f) => f.endsWith('.html'))
  .sort();

let modified = 0;

for (const file of files) {
  const full = path.join(ROOT, file);
  let html = fs.readFileSync(full, 'utf8');
  const before = html;
  const changes = [];

  // --- canonical, inserted right after </title> when missing ---
  if (!html.includes('rel="canonical"')) {
    const titleEnd = html.indexOf('</title>');
    if (titleEnd === -1) {
      console.error(`SKIP canonical (${file}): no </title> found`);
    } else {
      const insertAt = titleEnd + '</title>'.length;
      const tag = `<link rel="canonical" href="${pageUrl(file)}">`;
      html = html.slice(0, insertAt) + '\n  ' + tag + html.slice(insertAt);
      changes.push('canonical');
    }
  }

  // --- favicon / touch-icon links, after the canonical link ---
  const iconAdditions = [];
  if (!html.includes('rel="icon"')) iconAdditions.push(ICON_LINKS[0], ICON_LINKS[1]);
  if (!html.includes('rel="apple-touch-icon"')) iconAdditions.push(ICON_LINKS[2]);

  if (iconAdditions.length > 0) {
    const anchor = html.match(/<link rel="canonical"[^>]*>/);
    if (!anchor) {
      console.error(`SKIP icons (${file}): no canonical anchor found`);
    } else {
      const insertAt = anchor.index + anchor[0].length;
      const insertion = '\n  ' + iconAdditions.join('\n  ');
      html = html.slice(0, insertAt) + insertion + html.slice(insertAt);
      changes.push('icons');
    }
  }

  // --- JSON-LD before </head> ---
  if (!NO_JSONLD.has(file) && !html.includes('application/ld+json')) {
    const ld = jsonLdFor(file, html);
    if (ld) {
      const headEnd = html.indexOf('</head>');
      if (headEnd === -1) {
        console.error(`SKIP jsonld (${file}): no </head> found`);
      } else {
        html = html.slice(0, headEnd) + ld + '\n' + html.slice(headEnd);
        changes.push('jsonld');
      }
    }
  }

  if (html !== before) {
    fs.writeFileSync(full, html);
    modified++;
    console.log(`updated ${file} (${changes.join(', ')})`);
  } else {
    console.log(`ok      ${file} (already tagged)`);
  }
}

console.log(`\n${modified}/${files.length} files modified`);
