import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';

const root=process.cwd(), out=path.join(root,'docs/qa/globe-orbit-docks');
fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+new URL(req.url,'http://local').pathname);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return res.writeHead(404).end();
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true});
try {
  const context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:out,size:{width:1440,height:900}}});
  const page=await context.newPage(), video=page.video();
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html`,{waitUntil:'domcontentloaded'});
  await page.locator('#fuel-experience').scrollIntoViewIfNeeded();
  await page.waitForSelector('[data-leader="tz"]',{state:'attached'});
  await page.evaluate(()=>{
    window.orbitSamples=[];
    window.orbitTimer=setInterval(()=>{
      const leaders=[...document.querySelectorAll('[data-leader]')];
      window.orbitSamples.push({phase:document.querySelector('#experience-3d-panel').dataset.globePhase,
        paths:leaders.map(n=>({id:n.dataset.leader,draw:Number(n.dataset.progress),offset:Number(n.style.strokeDashoffset),length:n.getTotalLength()}))});
    },40);
  });
  for(const phase of ['rotate','reveal','hold','retract','clean']){
    await page.waitForFunction(p=>document.querySelector('#experience-3d-panel').dataset.globePhase===p,phase,{timeout:60000});
    await page.screenshot({path:path.join(out,`animation-${phase}.png`)});
  }
  const samples=await page.evaluate(()=>{clearInterval(window.orbitTimer);return window.orbitSamples});
  const result={actualDashDrawing:true,paths:{}};
  for(const id of ['tz','ke','ug','rw','bi','cd','zm','mz','et','ae']){
    const values=samples.flatMap(s=>s.paths.filter(p=>p.id===id));
    const checks={hidden:values.some(p=>p.offset===1),partial:values.some(p=>p.offset>.05&&p.offset<.95),full:values.some(p=>p.offset===0),retract:samples.some(s=>s.phase==='retract'&&s.paths.some(p=>p.id===id&&p.offset>0&&p.offset<1))};
    result.paths[id]=checks;if(Object.values(checks).some(v=>!v))result.actualDashDrawing=false;
  }
  fs.writeFileSync(path.join(out,'animation-verification.json'),JSON.stringify(result,null,2));
  await context.close();await video.saveAs(path.join(out,'full-cycle.webm'));await video.delete();
  console.log(JSON.stringify(result,null,2));
  if(!result.actualDashDrawing)process.exitCode=1;
} finally {await browser.close();server.closeAllConnections();server.close();}
