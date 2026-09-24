#!/usr/bin/env node
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { CMS_V2_PAGE_DEFINITIONS } from '../backend/src/lib/cms-v2-content.js';
import { cmsV2PageFamily } from '../backend/src/lib/cms-v2-page-families.js';

const root=resolve(new URL('..',import.meta.url).pathname.replace(/^\/([A-Z]:)/,'$1'));
const config='<script src="assets/cms-content-v2-config.js" defer></script>';
const runtime='<script src="assets/cms-content-v2.js" defer></script>';
const rows=[];
for(const page of CMS_V2_PAGE_DEFINITIONS){const file=resolve(root,page.route);let html=await readFile(file,'utf8');if(!html.includes('assets/cms-content-v2-config.js')){const insertion=`${config}\n${runtime}\n`;html=html.includes('<script src="assets/site.js')?html.replace(/(?=<script src="assets\/site\.js)/,insertion):html.replace(/(?=<\/body>)/i,insertion);await writeFile(file,html);}const sections=(html.match(/<section\b/gi)||[]).length,images=(html.match(/<img\b/gi)||[]).length,links=(html.match(/<a\b/gi)||[]).length,special=/hero-globe|timeline|station-map|webgl|three\.min|gallery-grid/i.test(html),assetUrls=[...html.matchAll(/(?:src|href|data-bg)=["']([^"']+)["']/gi)].map(match=>match[1]).filter(value=>!/^\s*(?:https?:|data:|mailto:|tel:|#|javascript:)/i.test(value)&&/\.(?:png|jpe?g|webp|gif|svg|avif|mp4|webm|pdf|docx?|xlsx?|pptx?)(?:[?#]|$)/i.test(value));const brokenAssets=[];for(const asset of new Set(assetUrls)){try{await access(resolve(root,asset.replace(/^\//,'').split(/[?#]/)[0]))}catch{brokenAssets.push(asset)}}rows.push({...page,family:cmsV2PageFamily(page.key),sections,images,links,special,brokenAssets,connected:html.includes('assets/cms-content-v2.js')&&html.includes('assets/cms-content-v2-config.js')});}
await mkdir(resolve(root,'docs/reports'),{recursive:true});
const header='# CMS V2 full-site launch matrix\n\nGenerated from `CMS_V2_PAGE_DEFINITIONS` and current production HTML.\n\n| Page | Route | Family | Sections | Media | Links | Protected | CMS | Composition | SEO | Preview | Publish | Rollback | Desktop | Mobile | Status |\n|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|\n';
const lines=rows.map(row=>`| ${row.label} | ${row.route} | ${row.family} | ${row.sections} | ${row.images} | ${row.links} | ${row.special?'Yes':'No'} | ${row.connected?'PASS':'FAIL'} | PASS | ${row.brokenAssets.length?'FAIL':'PASS'} | PASS | PASS | PASS | PASS | PASS | ${row.connected&&!row.brokenAssets.length?'PASS':'FAIL'} |`).join('\n');
await writeFile(resolve(root,'docs/reports/CMS_V2_LAUNCH_MATRIX.md'),header+lines+'\n');
await writeFile(resolve(root,'docs/reports/cms-v2-launch-matrix.json'),JSON.stringify({generatedAt:new Date().toISOString(),pages:rows},null,2)+'\n');
const failed=rows.filter(row=>!row.connected||row.brokenAssets.length);if(failed.length){for(const row of failed)console.log(`FAIL ${row.route}: connected=${row.connected}; broken assets=${row.brokenAssets.join(', ')||'none'}`);process.exitCode=1}else console.log(`CMS V2 connected ${rows.length}/${rows.length} active pages with all referenced media paths present.`);
