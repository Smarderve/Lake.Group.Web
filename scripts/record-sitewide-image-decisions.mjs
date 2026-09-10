import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const inventoryPath = path.join(root, 'docs', 'reports', 'sitewide-image-inventory-20260909.json');
const decisionsPath = path.join(root, 'docs', 'reports', 'sitewide-image-review-decisions-20260909.json');
const auditPath = path.join(root, 'docs', 'reports', 'ASSET_IMAGE_CLEANUP_AUDIT.md');
const inventory = JSON.parse(await fs.readFile(inventoryPath, 'utf8'));
const homeQaPath = path.join(root, 'docs', 'qa', 'sitewide-image-remediation', 'phase-01-home', 'runtime.json');
const corporateQaPath = path.join(root, 'docs', 'qa', 'sitewide-image-remediation', 'phase-02-corporate', 'runtime.json');
const coreCompanyQaPath = path.join(root, 'docs', 'qa', 'sitewide-image-remediation', 'phase-04-core-companies', 'runtime.json');

const ownershipReview = new Set([
  'assets/images/news/4/photo_1.webp',
  'assets/images/news/4/photo_2.webp',
  'assets/images/news/4/photo_3.webp',
]);

const protectedDerivative = new Set([
  'assets/images/home/verticals/automotive-truck-lineup.webp',
  'assets/images/agrinova/combine.webp',
  'assets/images/atl/content/atl-flatbed-red.webp',
  'assets/images/nexdrive/products/sany-heavy-commercial-truck.webp',
]);

const qualityRequired = new Set([
  'assets/images/lake-pipes/new/tanks.webp',
]);

const homeDerivatives = new Map([
  ['assets/images/home/verticals/automotive-truck-lineup.webp', 'assets/images/delivery/home/remediated/automotive-truck-lineup-clean.webp'],
  ['assets/images/delivery/home/verticals/automotive-truck-lineup-960.webp', 'assets/images/delivery/home/remediated/automotive-truck-lineup-clean-960.webp'],
  ['assets/images/delivery/home/verticals/automotive-truck-lineup-thumb.webp', 'assets/images/delivery/home/remediated/automotive-truck-lineup-clean-thumb.webp'],
  ['assets/images/delivery/lake-agro/lake-agro-hero-desktop.webp', 'assets/images/delivery/home/remediated/lake-agro-hero-desktop-clean.webp'],
  ['assets/images/delivery/lake-aviation/ops/lake-aviation-hero-apron.webp', 'assets/images/delivery/home/remediated/lake-aviation-hero-apron-clean.webp'],
  ['assets/images/lake-pipes/new/tanks.webp', 'assets/images/delivery/home/remediated/lake-tanks-clean.webp'],
  ['assets/images/laketrans/hero/lake-trans-fleet-hero.webp', 'assets/images/delivery/home/remediated/lake-trans-fleet-hero-clean.webp'],
  ['assets/images/laketrans/profile/lake-trans-truck-fleet.webp', 'assets/images/delivery/home/remediated/lake-trans-fleet-hero-clean.webp'],
  ['assets/images/aill/aill-hero.webp', 'assets/images/delivery/home/remediated/aill-hero-clean.webp'],
  ['assets/images/agrinova/combine.webp', 'assets/images/delivery/home/remediated/agrinova-combine-clean.webp'],
  ['assets/images/atl/content/atl-flatbed-red.webp', 'assets/images/delivery/home/remediated/atl-flatbed-red-clean.webp'],
  ['assets/images/nexdrive/products/sany-heavy-commercial-truck.webp', 'assets/images/delivery/home/remediated/nexdrive-heavy-commercial-truck-clean.webp'],
]);

const corporateDerivatives = new Map([
  ['assets/images/aficd/operations/aficd-hero-reach-stacker.webp', 'assets/images/delivery/corporate/remediated/aficd-reach-stacker-clean.webp'],
  ['assets/images/delivery/gccp/photo_3.webp', 'assets/images/delivery/corporate/remediated/gccp-truck-lineup-clean.webp'],
  ['assets/images/delivery/gccp/photo_5.webp', 'assets/images/delivery/corporate/remediated/gccp-yard-clean.webp'],
  ['assets/images/delivery/laketrans/TA/photo_1.webp', 'assets/images/delivery/corporate/remediated/lake-trans-story-fleet-clean.webp'],
  ['assets/images/lake-aviation/gallery/aviation-worker-underwing.webp', 'assets/images/delivery/corporate/remediated/aviation-worker-underwing-clean.webp'],
]);

const editRequired = new Set([
  'assets/images/aill/aill-hero.webp',
  'assets/images/delivery/aill/aill-hero-960.webp',
  'assets/images/delivery/aill/aill-hero.webp',
  'assets/images/delivery/gccp/photo_3.webp',
  'assets/images/delivery/gccp/photo_5.webp',
  'assets/images/delivery/gulf-aggregates/services/quarry-excavator.webp',
  'assets/images/delivery/home/verticals/automotive-truck-lineup-960.webp',
  'assets/images/delivery/home/verticals/automotive-truck-lineup-thumb.webp',
  'assets/images/delivery/lake-agro/lake-agro-hero-desktop.webp',
  'assets/images/delivery/lake-agro/lake-agro-hero-mobile.webp',
  'assets/images/delivery/lake-aviation/ops/lake-aviation-hero-apron.webp',
  'assets/images/delivery/laketrans/hero/lake-trans-fleet-hero-800.webp',
  'assets/images/delivery/laketrans/hero/lake-trans-fleet-hero.webp',
  'assets/images/delivery/laketrans/TA/photo_1.webp',
  'assets/images/lake-agro/la-combine-harvester.webp',
  'assets/images/lake-agro/la-excavators.webp',
  'assets/images/lake-agro/la-machinery-shed.webp',
  'assets/images/lake-agro/la-quadtrac-equipment.webp',
  'assets/images/lake-aviation/gallery/aviation-fueling-coastal.webp',
  'assets/images/lake-aviation/gallery/aviation-nyerere-tanker.webp',
  'assets/images/lake-aviation/gallery/aviation-oman-air-cargo.webp',
  'assets/images/lake-aviation/gallery/aviation-skyward-apron.webp',
  'assets/images/lake-aviation/gallery/aviation-team-truck.webp',
  'assets/images/lake-aviation/gallery/aviation-worker-underwing.webp',
  'assets/images/lake-aviation/ops/aviation-10.webp',
  'assets/images/lake-aviation/ops/aviation-11.webp',
  'assets/images/lake-aviation/ops/aviation-12.webp',
  'assets/images/lake-aviation/ops/aviation-13.webp',
  'assets/images/lake-aviation/ops/aviation-14.webp',
  'assets/images/lake-aviation/ops/aviation-15.webp',
  'assets/images/lake-aviation/ops/aviation-2.webp',
  'assets/images/lake-aviation/ops/aviation-4.webp',
  'assets/images/lake-aviation/ops/aviation-6.webp',
  'assets/images/lake-aviation/ops/aviation-8.webp',
  'assets/images/lake-aviation/ops/aviation-9.webp',
  'assets/images/lake-aviation/ops/lake-aviation-hero-apron.webp',
  'assets/images/laketrans/hero/lake-trans-fleet-hero.webp',
  'assets/images/laketrans/profile/blue-truck-lineup.webp',
  'assets/images/laketrans/profile/fleet-lineup.webp',
  'assets/images/laketrans/profile/fleet-tankers.webp',
  'assets/images/laketrans/profile/lake-trans-truck-fleet.webp',
  'assets/images/laketrans/profile/petroleum-tanker.webp',
  'assets/images/laketrans/profile/road-fuel-tanker.webp',
]);

for (const asset of inventory.assets) {
  if (asset.inventoryStatus !== 'ACTIVE_INCLUDED') continue;
  if (asset.path.startsWith('assets/images/aficd/operations/') && asset.path !== 'assets/images/aficd/operations/aficd-branded-container.webp') {
    editRequired.add(asset.path);
  }
}

const pageSections = new Map();
for (const page of inventory.pages) {
  if (page.protected) continue;
  for (const ref of page.imageReferences) {
    if (!pageSections.has(ref.asset)) pageSections.set(ref.asset, []);
    pageSections.get(ref.asset).push({ page: page.page, section: ref.section });
  }
}

const sheetByAsset = new Map();
for (const sheet of inventory.uniqueIncludedReviewSheets) {
  for (const asset of sheet.assets) sheetByAsset.set(asset, sheet.file);
}

function classify(asset) {
  if (ownershipReview.has(asset.path)) return 'G';
  if (protectedDerivative.has(asset.path)) return 'F';
  if (qualityRequired.has(asset.path)) return 'B';
  if (editRequired.has(asset.path)) return asset.sourceLimited ? 'I' : 'C';
  return asset.sourceLimited ? 'H' : 'A';
}

function brandingDecision(code) {
  if (code === 'C' || code === 'I') return 'Remove visually confirmed third-party branding; preserve Lake-owned marks and the photograph.';
  if (code === 'F') return 'Create an included-page derivative; do not overwrite the protected source.';
  if (code === 'G') return 'Do not alter until ownership/context is confirmed.';
  return 'No third-party brand removal required after contact-sheet review.';
}

function qualityDecision(asset, code) {
  if (qualityRequired.has(asset.path)) return 'Convert mislabeled PNG payload to a genuine, size-appropriate WebP without enlarging.';
  if (code === 'H' || code === 'I') return 'Source-limited; retain native detail and avoid artificial enlargement.';
  return 'Current source is adequate for its rendered use.';
}

const included = inventory.assets.filter((asset) => asset.inventoryStatus === 'ACTIVE_INCLUDED');
const homeAssets = new Set(inventory.pages.find((page) => page.page === 'index.html').imageReferences.map((reference) => reference.asset));
const corporatePages = new Set(['about.html', 'history.html', 'leadership.html', 'leadership-ally-edha-awadh.html', 'csr.html', 'sustainability.html', 'careers.html', 'contact.html', 'gallery.html', 'media-center.html', 'our-story.html']);
let homeQaPassed = false;
try {
  const qa = JSON.parse(await fs.readFile(homeQaPath, 'utf8'));
  homeQaPassed = qa.length === 2 && qa.every((result) => result.status === 200 && result.failures.length === 0 && result.broken.length === 0 && result.actionSlides.length === 17 && result.actionSlides.every((slide) => slide.naturalWidth > 0));
} catch { /* Phase 1 QA has not run yet. */ }
let corporateQaPassed = false;
try {
  const qa = JSON.parse(await fs.readFile(corporateQaPath, 'utf8'));
  corporateQaPassed = qa.length === 22 && qa.every((result) => result.status === 200 && result.failures.length === 0 && result.broken.length === 0);
} catch { /* Phase 2 QA has not run yet. */ }
const coreCompanyPages = new Set(['lake-oil.html', 'lake-gas.html', 'lake-lubes.html', 'lake-steel.html', 'lake-premix-cement.html']);
let coreCompanyQaPassed = false;
try {
  const qa = JSON.parse(await fs.readFile(coreCompanyQaPath, 'utf8'));
  coreCompanyQaPassed = qa.length === 10 && qa.every((result) => result.status === 200 && result.failures.length === 0 && result.broken.length === 0);
} catch { /* Phase 4 QA has not run yet. */ }
const decisions = included.map((asset) => {
  const classification = classify(asset);
  const homeComplete = homeQaPassed && homeAssets.has(asset.path);
  const corporateUsed = asset.includedUsage.some((page) => corporatePages.has(page));
  const corporateComplete = corporateQaPassed && corporateUsed && classification !== 'G';
  const coreCompanyComplete = coreCompanyQaPassed && asset.includedUsage.some((page) => coreCompanyPages.has(page));
  const pendingAviationUsage = asset.path === 'assets/images/lake-aviation/gallery/aviation-worker-underwing.webp';
  const complete = homeComplete || (corporateComplete && !pendingAviationUsage) || coreCompanyComplete;
  const derivative = homeDerivatives.get(asset.path) || corporateDerivatives.get(asset.path);
  const nonPhotographicLogo = asset.path.includes('/logos/') && asset.format === 'png';
  return {
    asset: asset.path,
    usages: pageSections.get(asset.path) || asset.includedUsage.map((page) => ({ page, section: 'document' })),
    sourceDimensions: asset.sourceDimensions,
    sourceFormat: asset.format,
    sourceBytes: asset.bytes,
    sourceLimited: asset.sourceLimited,
    sharedWithProtectedPage: asset.sharedWithProtectedPage || protectedDerivative.has(asset.path),
    visualEvidence: sheetByAsset.get(asset.path),
    initialClassification: classification,
    currentClassification: complete ? 'K' : classification,
    brandingDecision: derivative ? `${brandingDecision(classification)} ${homeDerivatives.has(asset.path) ? 'Homepage' : 'Corporate phase'} uses \`${derivative}\`.` : brandingDecision(classification),
    qualityDecision: qualityDecision(asset, classification),
    masterStatus: derivative ? (protectedDerivative.has(asset.path) ? 'PROTECTED_ORIGINAL_UNCHANGED; HOMEPAGE_DERIVATIVE' : 'LOCALIZED_EDIT_DERIVATIVE; ORIGINAL_SOURCE_RETAINED') : (asset.sourceLimited ? 'SOURCE_LIMITED_NO_UPSCALE' : 'ORIGINAL_SOURCE_RETAINED'),
    deliveryWebp: derivative || (nonPhotographicLogo ? 'NOT_APPLICABLE_NON_PHOTOGRAPHIC_PNG' : (asset.genuineWebp ? asset.path : null)),
    frontendUpdated: homeComplete || corporateComplete || coreCompanyComplete,
    renderedQa: homeComplete || corporateComplete || coreCompanyComplete,
    finalStatus: homeComplete ? 'COMPLETED_AND_VERIFIED_HOME' : (pendingAviationUsage && corporateComplete ? 'CSR_DERIVATIVE_VERIFIED; LAKE_AVIATION_USAGE_PENDING' : (corporateComplete ? 'COMPLETED_AND_VERIFIED_CORPORATE' : (coreCompanyComplete ? 'COMPLETED_AND_VERIFIED_CORE_COMPANIES' : (classification === 'G' ? 'OWNERSHIP_REVIEW' : 'CLASSIFIED_PENDING_PAGE_PHASE')))),
  };
});

if (decisions.length !== 204) throw new Error(`Expected 204 included assets, found ${decisions.length}`);
const counts = Object.fromEntries([...new Set(decisions.map((item) => item.currentClassification))].sort().map((code) => [code, decisions.filter((item) => item.currentClassification === code).length]));
const payload = {
  generatedAt: new Date().toISOString(),
  basis: 'Manual visual inspection of the 13 accepted unique-included contact sheets; filenames are identifiers, not review evidence.',
  classificationLegend: {
    A: 'CLEAN / READY', B: 'QUALITY ENHANCEMENT REQUIRED', C: 'THIRD-PARTY BRAND REMOVAL REQUIRED',
    D: 'BOTH QUALITY + BRAND REMOVAL REQUIRED', E: 'PROTECTED / EXCLUDED', F: 'SHARED WITH PROTECTED PAGE — DERIVATIVE REQUIRED',
    G: 'OWNERSHIP REVIEW REQUIRED', H: 'SOURCE-LIMITED BUT USABLE', I: 'SOURCE-LIMITED + EDIT REQUIRED',
    J: 'MANUAL EDIT REQUIRED', K: 'COMPLETED AND VERIFIED',
  },
  total: decisions.length,
  counts,
  decisions,
};
await fs.writeFile(decisionsPath, `${JSON.stringify(payload, null, 2)}\n`);

const rows = decisions.map((item) => {
  const usage = item.usages.map((value) => `${value.page} (${value.section})`).join('<br>');
  const size = `${Math.round(item.sourceBytes / 1024)} KiB`;
  const delivery = item.deliveryWebp?.startsWith('assets/') ? `\`${item.deliveryWebp}\`` : (item.deliveryWebp || 'Pending');
  return `| ${usage} | \`${item.asset}\` | ${item.sourceDimensions} / ${item.sourceFormat} | ${item.currentClassification} | ${item.brandingDecision} | ${item.qualityDecision} | ${item.sourceLimited ? 'Yes' : 'No'} | ${item.masterStatus} | ${delivery} | ${size} | ${item.frontendUpdated ? 'Yes' : 'Pending'} | ${item.renderedQa ? 'Yes' : 'Pending'} | ${item.finalStatus} |`;
});
const audit = `# Asset Image Cleanup Audit

Updated: ${new Date().toISOString()}

## Accepted baseline

- Active public pages: **${inventory.activePages}**
- Included pages: **${inventory.includedPages}**
- Protected pages: **${inventory.protectedPages.join(', ')}**
- Referenced included assets: **${decisions.length}**
- Missing references: **${inventory.missingReferences.length}**
- Visual review evidence: **13 accepted unique-asset contact sheets** in \`docs/qa/sitewide-image-remediation/phase-00-inventory/\`

## Visual classification accounting

${Object.entries(counts).map(([code, count]) => `- ${code} — ${payload.classificationLegend[code]}: **${count}**`).join('\n')}

All **${decisions.length}** referenced included assets have a visual classification. Classification records are phase inputs; assets move to **K** only after file, frontend, and rendered-page verification.

## Asset register

| Page / section | Source | Source metadata | Classification | Branding decision | Quality decision | Source-limited | Master status | Delivery WebP | File size | Frontend updated | Rendered QA | Final status |
|---|---|---:|:---:|---|---|:---:|---|---|---:|:---:|:---:|---|
${rows.join('\n')}
`;
await fs.writeFile(auditPath, audit);
console.log(JSON.stringify({ total: decisions.length, counts }, null, 2));
