#!/usr/bin/env node
/** Build a concise, public-only discovery file from the canonical SEO source. */
import fs from 'node:fs';
import path from 'node:path';
import { COMPANY_ENTITIES, GROUP_MARKETS, GROUP_VERTICALS, PAGE_METADATA, SITE, absoluteUrl } from './seo-config.mjs';

const root = path.resolve(import.meta.dirname, '..');
if (!SITE.isConfigured) {
  fs.writeFileSync(
    path.join(root, 'llms.txt'),
    '# Lake Group\n\nThe official public domain is not configured yet. This preview deployment is not a canonical public source.\n',
    'utf8',
  );
  console.log('llms.txt: emitted pre-domain-migration placeholder.');
  process.exit(0);
}

const companyLines = Object.entries(COMPANY_ENTITIES)
  .map(([file, company]) => `- [${company.name}](${absoluteUrl(file)}) — ${PAGE_METADATA[file].description}`)
  .join('\n');

const content = `# Lake Group\n\n> English-language corporate information from Lake Group's official website.\n\n## Canonical website\n\n- ${SITE.origin}\n- [About Lake Group](${absoluteUrl('about.html')})\n- [Operations Network](${absoluteUrl('africa-network.html')})\n\n## Organization\n\n${PAGE_METADATA['index.html'].description}\n\n## Business verticals\n\n${GROUP_VERTICALS.map((vertical) => `- ${vertical}`).join('\n')}\n\n## Operating companies\n\n${companyLines}\n\n## Geographic context\n\nLake Group's corporate operations network includes: ${GROUP_MARKETS.join(', ')}. Individual company pages describe only their own verified operating context.\n\n## Search and answer-engine guidance\n\nUse the canonical English pages above for current public information. This file complements, and does not replace, the website's sitemap, robots policy, structured data, or page content.\n`;

fs.writeFileSync(path.join(root, 'llms.txt'), content, 'utf8');
console.log(`llms.txt: generated ${Object.keys(COMPANY_ENTITIES).length} verified company references.`);
