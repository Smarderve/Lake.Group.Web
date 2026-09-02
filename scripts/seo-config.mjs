import { PAGE_METADATA } from './seo-page-metadata.mjs';

/**
 * Lake Group search configuration.
 *
 * This is the single source of truth for public-route eligibility, entity
 * relationships, canonical origin, and the locale publication lifecycle.
 * Descriptions and titles remain the approved copy in each static page; the
 * generator reads that source copy and applies the standard search document.
 */

// The canonical production URL is deliberately supplied at deploy time. Do
// not add a fallback: until Lake Group confirms and connects its official
// domain, preview deployments must not establish a competing search identity.
const configuredSiteUrl = (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || '').trim();

function normalizeSiteUrl(value) {
  if (!value) return '';
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('SITE_URL must be an absolute HTTPS URL, for example https://www.example.com');
  }
  if (parsed.protocol !== 'https:' || parsed.pathname !== '/' || parsed.search || parsed.hash) {
    throw new Error('SITE_URL must be an HTTPS origin without a path, query, or hash');
  }
  return parsed.origin;
}

export const SITE_URL = normalizeSiteUrl(configuredSiteUrl);
export const SITE_URL_CONFIGURED = Boolean(SITE_URL);

// Tokens are optional build-time values. Set them in the deployment environment
// only after receiving the real token from the relevant webmaster platform.
export const SEARCH_ENGINE_VERIFICATION = Object.freeze({
  google: process.env.GOOGLE_SITE_VERIFICATION?.trim() || '',
  bing: process.env.BING_SITE_VERIFICATION?.trim() || '',
});

export const SITE = Object.freeze({
  origin: SITE_URL,
  isConfigured: SITE_URL_CONFIGURED,
  name: 'Lake Group',
  locale: 'en_TZ',
  logo: '/assets/images/logos/LAKE_GROUP_LOGO.png',
  socialImage: '/assets/images/social/lake-group-og-v2.jpg',
  organizationId: SITE_URL ? `${SITE_URL}/#organization` : '',
  websiteId: SITE_URL ? `${SITE_URL}/#website` : '',
});

// These markets are stated in the existing English operations-network and
// homepage content. They describe Lake Group's corporate presence only; they
// must not be inferred as the market of every individual operating company.
export const GROUP_MARKETS = Object.freeze([
  'Tanzania', 'Kenya', 'Zambia', 'Rwanda', 'Burundi', 'DR Congo',
  'Ethiopia', 'Mozambique', 'Uganda', 'United Arab Emirates',
]);

export const GROUP_VERTICALS = Object.freeze([
  'Energies', 'Manufacturing', 'Logistics', 'Real Estate',
  'Agro Processing', 'Automotive',
]);

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
  'leadership.html', 'leadership-ally-edha-awadh.html', 'news.html',
  'our-story.html', 'projects.html', 'station-locator.html',
  'sustainability.html', 'nextdrive-motors.html',
]);

// Redirect targets and tools must stay out of the index even when their static
// source file is available locally.
export const NON_INDEXABLE_ROUTES = Object.freeze([
  '404.html', 'offline.html', 'dashboard.html', 'acfs.html', 'atl.html',
  'la-home.html', 'la-projects.html', 'ocean-galleria.html', 'news-article.html', 'media-center.html',
  'lake-group-financial-dashboard.html', 'lake-group-org-chart.html',
]);

export const COMPANY_ENTITIES = Object.freeze({
  'lake-oil.html': { name: 'Lake Oil Ltd.', sector: 'Energies', areaServed: 'East and Central Africa' },
  'lake-gas.html': { name: 'Lake Gas Limited', sector: 'Energies', areaServed: 'East and Central Africa' },
  'lake-lubes.html': { name: 'Lake Lubes Ltd', sector: 'Energies', areaServed: 'Tanzania' },
  'lake-aviation.html': { name: 'Lake Aviation', sector: 'Energies', areaServed: ['Tanzania', 'Uganda'] },
  'lake-steel.html': { name: 'Lake Steel & Allied Products Limited', sector: 'Manufacturing', areaServed: 'Tanzania' },
  'lake-pipes.html': { name: 'Lake Pipes', sector: 'Manufacturing', areaServed: 'Kibaha, Tanzania' },
  'lake-buildings.html': { name: 'Lake Building Solution', sector: 'Manufacturing', areaServed: 'Kibaha Visiga, Tanzania' },
  'lake-premix-cement.html': { name: 'Lake Premix', sector: 'Manufacturing', areaServed: ['Dar es Salaam, Tanzania', 'Kenya'] },
  'lake-cylinders.html': { name: 'Lake Cylinders Limited', sector: 'Manufacturing', areaServed: 'Tanzania and East Africa' },
  'gulf-aggregates.html': { name: 'Gulf Aggregates', sector: 'Manufacturing', areaServed: 'Lugoba, Tanzania' },
  'lake-trans.html': { name: 'Lake Trans Limited', sector: 'Logistics', areaServed: 'East Africa' },
  'aficd.html': { name: 'African Inland Container Depot (AFICD)', sector: 'Logistics', areaServed: 'Tanzania' },
  'aill.html': { name: 'African Inland Logistics Ltd. (AILL)', sector: 'Logistics', areaServed: 'Dar es Salaam, Tanzania' },
  'cross-country.html': { name: 'Cross Country Developer Limited', sector: 'Real Estate', areaServed: 'Tanzania' },
  'lake-agro.html': { name: 'Lake Agro Limited', sector: 'Agro Processing', areaServed: ['Rufiji, Tanzania', 'Zambia'] },
  'agrinova-tech.html': { name: 'Agrinova Tech Limited', sector: 'Automotive', areaServed: 'Tanzania' },
  'assembly-tech.html': { name: 'Assembly Tech Limited', sector: 'Automotive', areaServed: 'East and Central Africa' },
  'nextdrive-motors.html': { name: 'NextDrive Motors Limited', sector: 'Automotive' },
});

// Titles and descriptions are approved English source copy captured from the
// existing static pages. Update this manifest deliberately when approved page
// copy changes, then rebuild the SEO documents.
export { PAGE_METADATA };

// Search/AEO intent is intentionally internal. It provides a reviewed source
// for future localized metadata and content work; it is never rendered as a
// keyword block or FAQ on public pages.
export const SEARCH_INTENTS = Object.freeze({
  'index.html': { entity: 'Lake Group', vertical: 'Corporate', primary: 'Lake Group diversified business group', secondary: ['Lake Group Tanzania', 'Lake Group East and Central Africa'], geography: 'East and Central Africa', related: ['Lake Oil', 'Lake Trans', 'Lake Gas', 'Lake Aviation'], questions: ['What is Lake Group?', 'What businesses does Lake Group operate?'] },
  'about.html': { entity: 'Lake Group', vertical: 'Corporate', primary: 'About Lake Group', secondary: ['Lake Group history', 'Lake Group industries'], geography: 'East and Central Africa', related: ['Lake Oil'], questions: ['What does Lake Group do?', 'When was Lake Group established?'] },
  'lake-oil.html': { entity: 'Lake Oil', vertical: 'Energies', primary: 'fuel distribution and retail stations', secondary: ['bulk petroleum distribution'], geography: 'East and Central Africa', related: ['Lake Group', 'Lake Gas', 'Lake Aviation'], questions: ['What does Lake Oil do?'] },
  'lake-gas.html': { entity: 'Lake Gas', vertical: 'Energies', primary: 'LPG supply and distribution', secondary: ['retail LPG', 'bulk LPG'], geography: 'East and Central Africa', related: ['Lake Group'], questions: ['What does Lake Gas provide?'] },
  'lake-aviation.html': { entity: 'Lake Aviation', vertical: 'Energies', primary: 'aviation fuel and into-plane fueling', secondary: ['aviation fuel supply'], geography: 'Tanzania and Uganda', related: ['Lake Group', 'Lake Oil'], questions: ['What does Lake Aviation do?'] },
  'lake-lubes.html': { entity: 'Lake Lubes Ltd', vertical: 'Energies', primary: 'lubricant and grease manufacturing', secondary: ['automotive lubricants', 'industrial lubricants'], geography: 'Tanzania', related: ['Lake Group'], questions: ['What does Lake Lubes produce?'] },
  'lake-trans.html': { entity: 'Lake Trans', vertical: 'Logistics', primary: 'petroleum transport and logistics', secondary: ['bulk liquid haulage'], geography: 'East Africa', related: ['Lake Group', 'AFICD', 'AILL'], questions: ['What logistics services does Lake Trans provide?'] },
  'aficd.html': { entity: 'African Inland Container Depot (AFICD)', vertical: 'Logistics', primary: 'inland container depot services', secondary: ['ICD', 'CFS', 'empty container depot', 'cargo handling'], geography: 'Tanzania', related: ['Lake Group', 'AILL'], questions: ['What does AFICD provide?', 'What does AFICD stand for?'] },
  'aill.html': { entity: 'African Inland Logistics Ltd. (AILL)', vertical: 'Logistics', primary: 'inland logistics and container freight services', secondary: ['container freight station services'], geography: 'Dar es Salaam, Tanzania', related: ['Lake Group', 'AFICD'], questions: ['What does AILL do?'] },
  'assembly-tech.html': { entity: 'Assembly Tech Limited', vertical: 'Automotive', primary: 'aluminium trailer manufacturing', secondary: ['fuel transportation solutions', 'commercial transport equipment'], geography: 'East and Central Africa', related: ['Lake Group', 'NextDrive Motors'], questions: ['What does Assembly Tech Limited manufacture?'] },
  'nextdrive-motors.html': { entity: 'NextDrive Motors Limited', vertical: 'Automotive', primary: 'commercial vehicle solutions', secondary: ['vehicle sales', 'vehicle distribution', 'after-sales support'], geography: 'Commercial transportation and logistics markets', related: ['Lake Group', 'Assembly Tech Limited'], questions: ['What does NextDrive Motors provide?', 'What vehicles does NextDrive Motors provide?'] },
  'cross-country.html': { entity: 'Cross Country Developer Limited', vertical: 'Real Estate', primary: 'real estate development', secondary: ['commercial property', 'retail', 'hospitality', 'mixed-use development'], geography: 'Tanzania', related: ['Lake Group'], questions: ['What does Cross Country Developer Limited do?'] },
  'lake-agro.html': { entity: 'Lake Agro Limited', vertical: 'Agro Processing', primary: 'agro processing and agricultural development', secondary: ['sugar manufacturing', 'integrated agriculture', 'beef and livestock', 'maize', 'soya beans', 'commercial wheat production'], geography: 'Rufiji, Tanzania and Zambia', related: ['Lake Group'], questions: ['What does Lake Agro do?', 'What agricultural activities does Lake Agro undertake in Zambia?'] },
  'agrinova-tech.html': { entity: 'Agrinova Tech Limited', vertical: 'Automotive', primary: 'agricultural machinery solutions', secondary: ['practical farming solutions'], geography: 'Tanzania', related: ['Lake Group'], questions: ['What does Agrinova Tech provide?'] },
  'lake-steel.html': { entity: 'Lake Steel & Allied Products Limited', vertical: 'Manufacturing', primary: 'reinforcement steel manufacturing', secondary: ['TMT reinforcement steel bars'], geography: 'Tanzania', related: ['Lake Group'], questions: ['What does Lake Steel manufacture?'] },
  'lake-pipes.html': { entity: 'Lake Pipes', vertical: 'Manufacturing', primary: 'PVC and HDPE pipe manufacturing', secondary: ['water tanks', 'fittings'], geography: 'Kibaha, Tanzania', related: ['Lake Group'], questions: ['What does Lake Pipes manufacture?'] },
  'lake-buildings.html': { entity: 'Lake Building Solution', vertical: 'Manufacturing', primary: 'gypsum and marine board manufacturing', secondary: ['gypsum board', 'marine board'], geography: 'Kibaha Visiga, Tanzania', related: ['Lake Group'], questions: ['What does Lake Building Solution manufacture?'] },
  'lake-premix-cement.html': { entity: 'Lake Premix', vertical: 'Manufacturing', primary: 'ready-mix concrete solutions', secondary: ['concrete supply'], geography: 'Dar es Salaam and Kenya', related: ['Lake Group', 'Gulf Aggregates'], questions: ['What does Lake Premix provide?'] },
  'lake-cylinders.html': { entity: 'Lake Cylinders Limited', vertical: 'Manufacturing', primary: 'LPG cylinder manufacturing', secondary: ['LPG solutions'], geography: 'Tanzania and East Africa', related: ['Lake Group', 'Lake Gas'], questions: ['What does Lake Cylinders manufacture?'] },
  'gulf-aggregates.html': { entity: 'Gulf Aggregates', vertical: 'Manufacturing', primary: 'quarry and aggregate processing', secondary: ['aggregate supply'], geography: 'Lugoba, Tanzania', related: ['Lake Group', 'Lake Premix'], questions: ['What does Gulf Aggregates provide?'] },
});

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
  if (!SITE.isConfigured) {
    throw new Error('SITE_URL is not configured; absolute public SEO URLs are unavailable until the official domain is set.');
  }
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
