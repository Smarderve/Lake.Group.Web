import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { CMS_V2_DOCUMENTS, CMS_V2_PAGE_DEFINITIONS } from './cms-v2-content.js';

const decode = (value = '') => value.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const first = (source, pattern) => decode(source.match(pattern)?.[1] || '');
const paragraphs = (source) => [...source.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map((match) => decode(match[1])).filter((item) => item.length > 30).slice(0, 12);
const headings = (source) => [...source.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map((match) => decode(match[1])).filter(Boolean).slice(0, 12);

/** Extracts only editorial source: no markup, classes, scripts, or styles. */
export async function buildCmsV2SeedDataset({ root = resolve(process.cwd(), '..'), read = readFile } = {}) {
  const documents = {};
  for (const page of CMS_V2_PAGE_DEFINITIONS) {
    const source = await read(resolve(root, page.route), 'utf8');
    const title = first(source, /<title[^>]*>([\s\S]*?)<\/title>/i) || page.label;
    const description = first(source, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i) || first(source, /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);
    const heading = first(source, /<h1[^>]*>([\s\S]*?)<\/h1>/i) || page.label;
    const image = first(source, /<img[^>]+src=["']([^"']+)["']/i) || 'assets/images/logos/lake-group-logo-yellow.png';
    const body = paragraphs(source); const sectionHeads = headings(source);
    const cta = source.match(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
    documents[page.key] = {
      hero: { heading, description: description || body[0] || heading, image, alt: heading },
      introduction: { heading: sectionHeads[0] || heading, body: body[0] || description || heading },
      cta: { label: decode(cta?.[2] || '') || 'Learn more', href: cta?.[1] || page.route },
      media: [{ src: image, alt: heading, role: 'hero' }],
      sections: body.slice(1).map((item, index) => ({ key: `section-${index + 1}`, heading: sectionHeads[index + 1] || `Section ${index + 1}`, body: item })),
      seo: { title, description: description || body[0] || heading, canonical: page.route, index: true },
    };
  }
  documents.global = { organization: { name: 'Lake Group', description: 'Lake Group is a diversified business group operating across East and Central Africa.', headquarters: 'Dar es Salaam, Tanzania', email: 'info@lakeoilgroup.com', phone: '+255 22 286 5000' }, statistics: [{ label: 'People', value: '10,000+', scope: 'Lake Group' }, { label: 'Trucks', value: '1,600+', scope: 'Lake Group' }, { label: 'Fuel stations', value: '500+', scope: 'Lake Group' }, { label: 'Fuel stations', value: '47', scope: 'Lake Oil Zambia' }], socialLinks: [] };
  const companyPages = CMS_V2_PAGE_DEFINITIONS.filter((page) => !['home','about','leadership','contact','careers','csr','gallery','history','media-center','sustainability','la-home','la-projects','fleet','station-locator'].includes(page.key));
  documents.companies = { companies: companyPages.map((page) => ({ name: page.label, shortName: page.label, vertical: 'Lake Group', route: page.route, description: documents[page.key].seo.description, active: true })) };
  documents['business-verticals'] = { verticals: [{ name: 'Energies', description: 'Energy businesses across the Lake Group.', companies: ['Lake Oil', 'Lake Aviation', 'Lake Gas', 'Lake Lubes'] }, { name: 'Logistics', description: 'Logistics and transport businesses across the Lake Group.', companies: ['Lake Trans', 'AFICD', 'AILL', 'ACFS'] }, { name: 'Manufacturing', description: 'Manufacturing businesses across the Lake Group.', companies: ['Lake Steel', 'Lake Cylinders', 'Lake Pipes', 'Lake Buildings', 'Lake Premix'] }, { name: 'Agro Processing', description: 'Agricultural businesses across the Lake Group.', companies: ['Lake Agro', 'Agrinova Tech'] }, { name: 'Automotive', description: 'Automotive businesses across the Lake Group.', companies: ['NextDrive Motors', 'ATL', 'Assembly Tech'] }, { name: 'Real Estate', description: 'Property businesses across the Lake Group.', companies: ['Cross Country', 'Ocean Galleria'] }] };
  for (const [key, data] of Object.entries(documents)) CMS_V2_DOCUMENTS[key].schema.parse(data);
  return documents;
}

// Initial imports predate a human CMS user. A null author is the established
// system-import representation and avoids creating a synthetic FK-only user.
export async function seedCmsV2Documents({ service, dataset, actorId = null }) {
  const result = { imported: 0, unchanged: 0, failed: 0 };
  for (const [key, data] of Object.entries(dataset)) {
    try { const document = await service.readDocument(key); if (document.currentDraftRevision) { result.unchanged += 1; continue; } await service.saveDraft({ key, actorId, data }); result.imported += 1; } catch (error) { result.failed += 1; throw Object.assign(error, { seedResult: result, documentKey: key }); }
  }
  return result;
}
