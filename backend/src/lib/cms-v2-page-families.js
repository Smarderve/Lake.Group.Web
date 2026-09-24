import { createDefaultComposition } from './cms-v2-components.js';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const CORPORATE = new Set(['home','about','leadership','contact','careers','csr','gallery','history','media-center','sustainability']);
const AGRO = new Set(['la-home','la-projects']);
const SPECIAL = new Map([['home','custom-globe'],['history','history-timeline'],['gallery','interactive-gallery'],['station-locator','station-map'],['fleet','fleet-directory']]);

export function cmsV2PageFamily(key) {
  if (SPECIAL.has(key)) return 'special';
  if (CORPORATE.has(key)) return 'corporate';
  if (AGRO.has(key)) return 'agro-subsite';
  return 'company';
}

export function prepareCmsV2LaunchDataset(dataset, pages) {
  dataset.global.dataFields ??= [
    ...Object.entries(dataset.global.organization).map(([name,value]) => ({ key:`group.${slug(name)}`, label:name, value, type:name==='email'?'email':name==='phone'?'telephone':name==='headquarters'?'address':'text' })),
    ...dataset.global.statistics.map((stat) => ({ key:`group.${slug(stat.scope)}.${slug(stat.label)}`, label:`${stat.label} · ${stat.scope}`, value:stat.value, type:'number' })),
  ];
  for (const page of pages) {
    const data = dataset[page.key];
    data.composition ??= createDefaultComposition(page.label, data);
    const family = cmsV2PageFamily(page.key);
    data.composition.root.name = `${page.label} · ${family}`;
    addMediaGallery(data);
    addProtectedFeature(data.composition, page.key);
    connectGlobalReferences(data.composition, dataset.global.dataFields);
  }
  return dataset;
}

export async function enrichCmsV2MediaFromHtml(dataset, pages, root) {
  for (const page of pages) {
    const source = await readFile(resolve(root, page.route), 'utf8');
    const candidates = [
      ...[...source.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)].map((match) => ({ src:match[1], alt:attribute(match[0],'alt'), role:'inline', kind:'image' })),
      ...[...source.matchAll(/(?:background-image\s*:\s*url\(|data-bg=["'])([^"')]+)["')]/gi)].map((match) => ({ src:match[1], alt:'', role:'background', kind:'image' })),
      ...[...source.matchAll(/<(?:video|source)[^>]+src=["']([^"']+)["'][^>]*>/gi)].map((match) => ({ src:match[1], alt:'', role:'inline', kind:'video' })),
      ...[...source.matchAll(/<a[^>]+href=["']([^"']+\.(?:pdf|docx?|xlsx?|pptx?))["'][^>]*>/gi)].map((match) => ({ src:match[1], alt:'Download', role:'download', kind:'file' })),
    ].filter((item) => !/^(?:data:|https?:\/\/)/i.test(item.src));
    const unique = [...new Map(candidates.map((item) => [item.src,item])).values()].slice(0,80);
    if (unique.length) { unique[0].role='hero'; dataset[page.key].media=unique; dataset[page.key].hero.image=unique[0].src; dataset[page.key].hero.alt ||= unique[0].alt || dataset[page.key].hero.heading; }
  }
  return dataset;
}

function addMediaGallery(data) {
  const extra = (data.media ?? []).filter((item) => item.role !== 'hero' && item.kind !== 'file').slice(0, 24);
  const host = data.composition.root.children.find((node) => node.key === 'introduction') ?? data.composition.root.children.find((node) => !node.locked);
  if (!extra.length || !host || host.children.some((node) => node.key?.startsWith('production-media-'))) return;
  for (const [index,item] of extra.entries()) host.children.push({ id:`production-media-${index+1}`, key:`production-media-${index+1}`, type:item.kind==='video'?'video':'image', name:item.alt||`Media ${index+1}`, visible:true, locked:false, content:{src:item.src,alt:item.alt}, layout:{span:4}, style:{background:'none',radius:'sm',fit:'cover'}, responsive:{tablet:{layout:{span:6}},mobile:{layout:{span:12}}}, children:[] });
}

function addProtectedFeature(composition, pageKey) {
  const type = SPECIAL.get(pageKey); const hero = composition.root.children[0];
  if (!type || !hero || composition.root.children.some((node) => node.type === type) || hero.children.some((node) => node.type === type)) return;
  hero.children.push({ id:`protected-${type}`, key:`protected-${type}`, type, name:type.split('-').map(capitalize).join(' '), visible:true, locked:true, content:{}, layout:{span:12,height:type==='custom-globe'?'viewport':'fit'}, style:{background:'none',radius:'none'}, responsive:{}, children:[] });
}

function connectGlobalReferences(composition, fields) {
  const visit = (node) => { for (const field of ['heading','body','text','value','label']) { const current=node.content?.[field]; if(typeof current!=='string')continue; const shared=fields.find((item)=>item.value.length>=4&&current.includes(item.value)); if(!shared)continue; const at=current.indexOf(shared.value); node.content.reference={key:shared.key,state:'linked',snapshot:shared.value,field}; node.content.prefix=current.slice(0,at); node.content.suffix=current.slice(at+shared.value.length); break; } for(const child of node.children??[])visit(child); };
  for (const node of composition.root.children) visit(node);
}

const slug=(value)=>String(value).toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
const capitalize=(value)=>value.charAt(0).toUpperCase()+value.slice(1);
const attribute=(tag,name)=>tag.match(new RegExp(`${name}=["']([^"']*)["']`,'i'))?.[1]?.replace(/<[^>]+>/g,'').trim()||'';
