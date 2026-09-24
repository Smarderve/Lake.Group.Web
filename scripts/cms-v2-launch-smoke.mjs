#!/usr/bin/env node
import http from 'node:http';
import { readFile, stat, writeFile, mkdir } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { chromium } from 'playwright';
import { CMS_V2_PAGE_DEFINITIONS } from '../backend/src/lib/cms-v2-content.js';

const root=resolve(new URL('..',import.meta.url).pathname.replace(/^\/([A-Z]:)/,'$1'));
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2'};
const server=http.createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://local').pathname);const candidate=resolve(root,pathname==='/'?'index.html':pathname.slice(1));if(!candidate.startsWith(root+sep)&&candidate!==root)throw new Error('outside root');const info=await stat(candidate);const file=info.isDirectory()?resolve(candidate,'index.html'):candidate;res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream','cache-control':'no-store'});res.end(await readFile(file));}catch{res.writeHead(404);res.end('Not found')}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const port=server.address().port,browser=await chromium.launch({headless:true});
const results=[];
try{
  const chunks=[0].map(async(worker)=>{const page=await browser.newPage();await page.route(/\.(?:png|jpe?g|webp|gif|avif|mp4|webm|woff2?|ttf)(?:\?.*)?$/i,route=>route.abort());for(let index=worker;index<CMS_V2_PAGE_DEFINITIONS.length;index+=1){const definition=CMS_V2_PAGE_DEFINITIONS[index],errors=[];page.removeAllListeners();page.on('pageerror',error=>errors.push(`pageerror: ${error.message}`));page.on('console',message=>{if(message.type()==='error'&&!/favicon|ERR_ABORTED|404 \(Not Found\)/i.test(message.text()))errors.push(`console: ${message.text()}`)});const checks={};for(const viewport of [{name:'desktop',width:1440,height:1000},{name:'mobile',width:390,height:844}]){await page.setViewportSize(viewport);try{const response=await page.goto(`http://127.0.0.1:${port}/${definition.route}`,{waitUntil:'domcontentloaded',timeout:12000});await page.waitForTimeout(40);checks[viewport.name]=await page.evaluate(()=>({title:document.title.trim(),text:document.body.innerText.trim().length,rawJson:/^\s*[\[{]/.test(document.body.innerText),scripts:document.querySelectorAll('script[src$="cms-content-v2.js"]').length,config:document.querySelectorAll('script[src$="cms-content-v2-config.js"]').length,nav:Boolean(document.querySelector('nav,.navbar,.site-nav,header')),footer:Boolean(document.querySelector('footer,.site-footer')),overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth}));checks[viewport.name].http=response?.status()??0;}catch(error){errors.push(`${viewport.name}: ${error.message}`)}}const ok=Object.values(checks).length===2&&Object.values(checks).every(check=>check.http===200&&check.title&&check.text>100&&!check.rawJson&&check.scripts===1&&check.config===1&&check.nav&&check.footer)&&errors.length===0;results.push({key:definition.key,route:definition.route,ok,checks,errors});}await page.close()});
  await Promise.all(chunks);
} finally {await browser.close();await new Promise(done=>server.close(done));}
results.sort((a,b)=>a.route.localeCompare(b.route));
await mkdir(resolve(root,'docs/reports'),{recursive:true});
await writeFile(resolve(root,'docs/reports/cms-v2-launch-smoke.json'),JSON.stringify({generatedAt:new Date().toISOString(),viewports:[390,1440],passed:results.filter(x=>x.ok).length,total:results.length,pages:results},null,2)+'\n');
console.log(`CMS V2 public smoke: ${results.filter(x=>x.ok).length}/${results.length} pages passed at 390 and 1440.`);
for(const result of results.filter(x=>!x.ok))console.log(`FAIL ${result.route}: ${result.errors.join('; ')||JSON.stringify(result.checks)}`);
if(results.some(x=>!x.ok))process.exitCode=1;
