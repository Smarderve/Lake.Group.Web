export const TRANSLATION_GLOSSARY_VERSION = 'lake-group-terms-2026-01';

export const PROTECTED_TERMS = Object.freeze([
  'Lake Group', 'Lake Oil', 'Lake Petroleum', 'Lake Energies', 'Lake Gas', 'Lake Trans',
  'Lake Lubes', 'Lake Steel', 'Lake Aviation', 'Lake Agro', 'Lake Pipes', 'Lake Cylinders',
  'Lake Building Solution', 'Lake Buildings', 'Lake Premix', 'AFICD', 'ACFS', 'ATL', 'AILL',
  'GCCP', 'SAFF', 'MERM', 'Assembly Tech Limited', 'Agrinova Tech Limited', 'NextDrive Motors Limited',
]);

// Target-language equivalents remain deliberately empty until reviewed by
// qualified speakers. The worker receives protected names but no invented
// technical translations.
export const TERMINOLOGY = Object.freeze([
  { key: 'petroleum-products', source: 'petroleum products', targets: {}, status: 'needs-review' },
  { key: 'liquefied-petroleum-gas', source: 'liquefied petroleum gas', targets: {}, status: 'needs-review' },
  { key: 'bulk-liquid-haulage', source: 'bulk liquid haulage', targets: {}, status: 'needs-review' },
  { key: 'ready-mix-concrete', source: 'ready-mix concrete', targets: {}, status: 'needs-review' },
  { key: 'reinforcing-steel', source: 'reinforcing steel', targets: {}, status: 'needs-review' },
  { key: 'high-strength-corrosion-resistant-rebar', source: 'high-strength corrosion-resistant rebar', targets: {}, status: 'needs-review' },
  { key: 'aviation-fuel', source: 'aviation fuel', targets: {}, status: 'needs-review' },
  { key: 'cylinder-bottling', source: 'LPG cylinder bottling', targets: {}, status: 'needs-review' },
]);

export function glossaryForLanguage(locale) {
  const approved = TERMINOLOGY.filter((term) => typeof term.targets[locale] === 'string' && term.status === 'approved');
  return { version: TRANSLATION_GLOSSARY_VERSION, protectedTerms: [...PROTECTED_TERMS], approvedTerms: approved.map(({ source, targets }) => ({ source, target: targets[locale] })) };
}
