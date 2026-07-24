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
  '<link rel="icon" href="favicon.ico?v=43" sizes="32x32">',
  '<link rel="icon" href="assets/icons/pwa/icon-192.png?v=43" type="image/png" sizes="192x192">',
  '<link rel="apple-touch-icon" href="assets/icons/pwa/apple-touch-icon.png?v=43">',
];

const ORG_ID = BASE + '#organization';

const ORGANIZATION = {
  '@type': 'Organization',
  '@id': ORG_ID,
  name: 'Lake Group',
  url: BASE,
  logo: BASE + 'assets/images/logos/LAKE_GROUP_LOGO.png',
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
  'contact.html': 'Contact Us',
  'csr.html': 'CSR & Sustainability',
  'fleet.html': 'Our Fleet',
  'gallery.html': 'Gallery',
  'history.html': 'Our History',
  'investors.html': 'Investor Relations',
  'leadership.html': 'Leadership',
  'media-center.html': 'Media Center',
  'news-article.html': 'Article',
  'news.html': 'News & Events',
  'projects.html': 'Major Projects',
  'services.html': 'Subsidiaries',
  'station-locator.html': 'Station Locator',
  'sustainability.html': 'Sustainability',
};

// Legacy service-hub JSON-LD map (company pages carry their own structured data).
const SERVICES = {};

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
      name: 'Contact Us - Lake Group',
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
      name: 'News & Events - Lake Group',
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
