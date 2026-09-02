import { PAGE_METADATA } from './seo-page-metadata.mjs';

/**
 * Lake Group search configuration.
 *
 * This is the single source of truth for public-route eligibility, entity
 * relationships, canonical origin, and the locale publication lifecycle.
 * Descriptions and titles remain the approved copy in each static page; the
 * generator reads that source copy and applies the standard search document.
 */

export const SITE = Object.freeze({
  origin: 'https://www.lakeoilgroup.com',
  name: 'Lake Group',
  locale: 'en_TZ',
  logo: '/assets/images/logos/LAKE_GROUP_LOGO.png',
  socialImage: '/assets/images/social/lake-group-og-v2.jpg',
  organizationId: 'https://www.lakeoilgroup.com/#organization',
  websiteId: 'https://www.lakeoilgroup.com/#website',
});

// A locale is only published when its route and reviewed native-language
// primary content exist. This prevents empty locale folders, false hreflang,
// and machine-translated doorway pages from entering the index.
export const LOCALES = Object.freeze({
  default: 'en',
  registry: Object.freeze({
    en: Object.freeze({ code: 'en', prefix: '/en', htmlLang: 'en', published: false, source: true }),
    sw: Object.freeze({ code: 'sw', prefix: '/sw', htmlLang: 'sw', published: false, source: false }),
  }),
});

// These are valid public pages with approved primary English content.
export const INDEXABLE_ROUTES = Object.freeze([
  'index.html', 'about.html', 'africa-network.html', 'agrinova-tech.html',
  'aficd.html', 'aill.html', 'assembly-tech.html', 'careers.html', 'contact.html',
  'cross-country.html', 'csr.html', 'fleet.html', 'gallery.html',
  'gulf-aggregates.html', 'history.html', 'investors.html', 'lake-agro.html',
  'lake-aviation.html', 'lake-buildings.html', 'lake-cylinders.html',
  'lake-gas.html', 'lake-lubes.html', 'lake-oil.html', 'lake-pipes.html',
  'lake-premix-cement.html', 'lake-steel.html', 'lake-trans.html',
  'leadership.html', 'leadership-ally-edha-awadh.html', 'media-center.html',
  'news.html', 'our-story.html', 'projects.html', 'station-locator.html',
  'sustainability.html', 'nextdrive-motors.html',
]);

// Redirect targets and tools must stay out of the index even when their static
// source file is available locally.
export const NON_INDEXABLE_ROUTES = Object.freeze([
  '404.html', 'offline.html', 'dashboard.html', 'acfs.html', 'atl.html',
  'la-home.html', 'la-projects.html', 'ocean-galleria.html', 'news-article.html',
  'lake-group-financial-dashboard.html', 'lake-group-org-chart.html',
]);

export const COMPANY_ENTITIES = Object.freeze({
  'lake-oil.html': { name: 'Lake Oil Ltd.', sector: 'Energies' },
  'lake-gas.html': { name: 'Lake Gas Limited', sector: 'Energies' },
  'lake-lubes.html': { name: 'Lake Lubes Ltd', sector: 'Energies' },
  'lake-aviation.html': { name: 'Lake Aviation', sector: 'Energies' },
  'lake-steel.html': { name: 'Lake Steel & Allied Products Limited', sector: 'Manufacturing' },
  'lake-pipes.html': { name: 'Lake Pipes', sector: 'Manufacturing' },
  'lake-buildings.html': { name: 'Lake Building Solution', sector: 'Manufacturing' },
  'lake-premix-cement.html': { name: 'Lake Premix', sector: 'Manufacturing' },
  'lake-cylinders.html': { name: 'Lake Cylinders Limited', sector: 'Manufacturing' },
  'gulf-aggregates.html': { name: 'Gulf Aggregates', sector: 'Manufacturing' },
  'lake-trans.html': { name: 'Lake Trans Limited', sector: 'Logistics' },
  'aficd.html': { name: 'African Inland Container Depot (AFICD)', sector: 'Logistics' },
  'aill.html': { name: 'African Inland Logistics Ltd. (AILL)', sector: 'Logistics' },
  'cross-country.html': { name: 'Cross Country Developer Limited', sector: 'Real Estate' },
  'lake-agro.html': { name: 'Lake Agro Limited', sector: 'Agro Processing' },
  'agrinova-tech.html': { name: 'Agrinova Tech Limited', sector: 'Automotive' },
  'assembly-tech.html': { name: 'Assembly Tech Limited', sector: 'Automotive' },
  'nextdrive-motors.html': { name: 'NextDrive Motors Limited', sector: 'Automotive' },
});

// Titles and descriptions are approved English source copy captured from the
// existing static pages. Update this manifest deliberately when approved page
// copy changes, then rebuild the SEO documents.
export { PAGE_METADATA };

export const ROUTE_LABELS = Object.freeze({
  'about.html': 'About Lake Group',
  'africa-network.html': 'Operations Network',
  'careers.html': 'Careers',
  'contact.html': 'Contact Us',
  'csr.html': 'CSR & Sustainability',
  'fleet.html': 'Our Fleet',
  'gallery.html': 'Gallery',
  'history.html': 'Our History',
  'investors.html': 'Investor Relations',
  'leadership.html': 'Leadership',
  'leadership-ally-edha-awadh.html': 'Ally Edha Awadh',
  'media-center.html': 'Media Center',
  'news.html': 'News & Events',
  'our-story.html': 'Our Story',
  'projects.html': 'Major Projects',
  'station-locator.html': 'Station Locator',
  'sustainability.html': 'Sustainability',
});

export function routePath(file) {
  return file === 'index.html' ? '/' : `/${file}`;
}

export function absoluteUrl(file) {
  return `${SITE.origin}${routePath(file)}`;
}

export function localePath(file, locale) {
  const config = LOCALES.registry[locale];
  if (!config) throw new Error(`Unknown locale: ${locale}`);
  const pathname = file === 'index.html' ? '/' : `/${file}`;
  return `${config.prefix}${pathname}`.replace(/\/$/, '/') || '/';
}

export function publishedLocalesFor(file) {
  // Locale publication is deliberately opt-in per equivalent route. Add a
  // route only after an HTML document with reviewed translated primary content
  // exists at the matching prefix; callers then emit reciprocal hreflang.
  return Object.entries(LOCALES.registry)
    .filter(([, config]) => config.published && config.routes?.includes(file))
    .map(([locale]) => locale);
}
