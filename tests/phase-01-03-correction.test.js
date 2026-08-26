const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.join(__dirname, '..');
const evidence = path.join(root, 'docs', 'qa', 'phase-01-03-correction');
let server, browser;

test.before(async () => {
  fs.mkdirSync(evidence,{recursive:true});
  server = http.createServer((req,res) => { const rel=decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '')||'index.html'; const file=path.resolve(root,rel); if(!file.startsWith(root)||!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404);res.end();return;} const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'};res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res); });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  browser=await chromium.launch({headless:true});
});
test.after(async()=>{if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));});

test('desktop glass navbar, hover mega-menu and About navigation', async () => {
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html`,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>!document.documentElement.classList.contains('lg-loading'));
  const nav=await page.locator('[data-phase01-navbar]').evaluate(el=>{const s=getComputedStyle(el);return{bg:s.backgroundImage,blur:s.backdropFilter,height:s.height,logo:el.querySelector('.nav-logo img').getAttribute('src'),stripes:!!el.querySelector('.nav-stripes')}});
  assert.match(nav.bg,/gradient/i); assert.notEqual(nav.blur,'none'); assert.equal(nav.height,'68px'); assert.match(nav.logo,/LAKE_LOGO_LAKE_ONLY/); assert.equal(nav.stripes,false);
  await page.locator('#nav-companies-trigger').hover();
  await page.locator('[data-mm-cat="logistics"]').hover();
  assert.equal(await page.locator('[data-mm-pane="logistics"]').evaluate(el=>getComputedStyle(el).display),'block');
  await page.locator('[data-mm-pane="logistics"] .mm-company').first().hover();
  assert.ok(await page.locator('#nav-companies-menu').evaluate(el=>Number(getComputedStyle(el).opacity))>.9);
  await page.locator('[data-mm-cat="realestate"]').hover();
  const oceanLogo=page.locator('[data-mm-pane="realestate"] img[alt="Ocean Galleria"]');
  const oceanState=await oceanLogo.evaluate(el=>{const s=getComputedStyle(el);return{src:el.getAttribute('src'),complete:el.complete,naturalWidth:el.naturalWidth,naturalHeight:el.naturalHeight,fit:s.objectFit,tile:getComputedStyle(el.closest('.mm-company')).backgroundColor}});
  assert.match(oceanState.src,/Ocean-Galleria-logo\.webp$/);
  assert.equal(oceanState.complete,true); assert.equal(oceanState.naturalWidth,1881); assert.equal(oceanState.naturalHeight,836); assert.equal(oceanState.fit,'contain'); assert.notEqual(oceanState.tile,'rgba(0, 0, 0, 0)');
  await page.screenshot({path:path.join(evidence,'desktop-navbar-dropdown.png'),fullPage:false});
  await page.locator('a[href="about.html"]').first().click();
  await page.waitForURL(/about\.html/);
  await page.waitForFunction(()=>!document.documentElement.classList.contains('lg-loading'));
  await page.waitForFunction(()=>!document.querySelector('[data-lg-skeleton-overlay]'));
  assert.equal(await page.locator('#ose-s1').evaluate(el=>getComputedStyle(el).display),'block');
  assert.ok(await page.locator('main').evaluate(el=>el.getBoundingClientRect().height)>700);
  await page.screenshot({path:path.join(evidence,'desktop-about.png'),fullPage:false});
  await page.close();
});

test('mobile drawer and subsidiary accordion remain touch operable', async()=>{
  const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true});
  await page.goto(`http://127.0.0.1:${server.address().port}/leadership.html`,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>!document.documentElement.classList.contains('lg-loading'));
  await page.waitForFunction(()=>!document.querySelector('[data-lg-skeleton-overlay]'));
  await page.locator('#nav-toggle').click();
  assert.equal(await page.locator('#nav-mobile').getAttribute('hidden'),null);
  await page.locator('.mob-acc-btn').first().click();
  assert.equal(await page.locator('#mob-subsidiaries').getAttribute('hidden'),null);
  await page.locator('#mob-subsidiaries .mob-acc-btn').first().click();
  assert.equal(await page.locator('#mob-acc-energies').getAttribute('hidden'),null);
  assert.equal(await page.locator('.ld-featured .ld-person-card').count(),1);
  assert.equal(await page.locator('a[href="leadership-ally-edha-awadh.html"]').count(),0);
  await page.screenshot({path:path.join(evidence,'mobile-leadership.png'),fullPage:false});
  await page.locator('#nav-toggle').click();
  await page.locator('.ld-featured').scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(evidence,'mobile-chairman-profile.png'),fullPage:false});
  await page.close();
});

test('shared footer and retired Ally route contract',()=>{
  const css=fs.readFileSync(path.join(root,'assets/phase-01-footer.css'),'utf8');
  assert.match(css,/\.country-tag[\s\S]*border: 0 !important/);
  assert.match(css,/\.footer-social \.social-link[\s\S]*height: 32px/);
  assert.match(fs.readFileSync(path.join(root,'vercel.json'),'utf8'),/leadership-ally-edha-awadh\.html[\s\S]*leadership\.html/);
});

test('Ocean Galleria uses one canonical approved production logo',()=>{
  const canonical=path.join(root,'assets','images','logos','companies','Ocean-Galleria-logo.webp');
  const supplied='C:\\Users\\USER\\Downloads\\Ocean-Galleria-logo.webp';
  const digest=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  assert.equal(digest(canonical),digest(supplied));
  assert.equal(fs.existsSync(path.join(root,'assets','images','logos','companies','ocean-galleria.png')),false);
  for(const file of ['scripts/templates/nav.html','assets/components/logo-loop-mount.js','contact.html','ocean-galleria.html','backend/scripts/content-seed-data.js']){
    const source=fs.readFileSync(path.join(root,file),'utf8');
    assert.match(source,/Ocean-Galleria-logo\.webp/);
    assert.doesNotMatch(source,/assets\/images\/logos\/companies\/ocean-galleria\.png/);
  }
});

test('company pages use contextual navbar branding without shifting centered navigation',async()=>{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  const cases=[
    ['lake-gas.html','lake-gas.png','Lake Gas'],
    ['lake-steel.html','lake-steel.png','Lake Steel'],
    ['aficd.html','aficd.png','AFICD'],
    ['cross-country.html','cross-country.png','Cross Country'],
  ];
  for(const [file,asset,alt] of cases){
    await page.goto(`http://127.0.0.1:${server.address().port}/${file}`,{waitUntil:'networkidle'});
    await page.waitForFunction(()=>!document.documentElement.classList.contains('lg-loading'));
    const state=await page.locator('.site-nav').evaluate(el=>{const logo=el.querySelector('.nav-logo img');const links=el.querySelector('.nav-links').getBoundingClientRect();return{src:logo&&logo.getAttribute('src'),alt:logo&&logo.alt,complete:logo&&logo.complete,width:logo&&logo.naturalWidth,center:links.left+(links.width/2),viewport:innerWidth/2}});
    assert.match(state.src,new RegExp(asset.replace('.','\\.'))); assert.equal(state.alt,alt); assert.equal(state.complete,true); assert.ok(state.width>0); assert.ok(Math.abs(state.center-state.viewport)<2);
  }
  await page.goto(`http://127.0.0.1:${server.address().port}/assembly-tech.html`,{waitUntil:'networkidle'});
  assert.equal(await page.locator('.nav-logo-wordmark').textContent(),'Assembly Tech');
  assert.equal(await page.locator('.site-nav .nav-logo img').count(),0);
  await page.setViewportSize({width:390,height:844});
  await page.goto(`http://127.0.0.1:${server.address().port}/lake-gas.html`,{waitUntil:'networkidle'});
  assert.match(await page.locator('.site-nav .nav-logo img').getAttribute('src'),/lake-gas\.png/);
  assert.equal(await page.locator('.site-nav').evaluate(el=>el.scrollWidth<=innerWidth),true);
  await page.close();
});

test('Lake Gas videos are removed and ATL remains marquee-only',()=>{
  const gas=fs.readFileSync(path.join(root,'lake-gas.html'),'utf8');
  assert.doesNotMatch(gas,/Watch Lake Gas in Action|KS_IdCfeDHk|9e9Nd7UtbFc/);
  const contact=fs.readFileSync(path.join(root,'contact.html'),'utf8');
  assert.doesNotMatch(contact,/id="atl"|href="atl\.html"|Aluminium Trailers/);
  const nav=fs.readFileSync(path.join(root,'scripts/templates/nav.html'),'utf8');
  const mobile=fs.readFileSync(path.join(root,'scripts/templates/mobile_nav.html'),'utf8');
  assert.doesNotMatch(nav,/atl\.html|alt="ATL"/); assert.doesNotMatch(mobile,/atl\.html|>ATL</);
  const loop=fs.readFileSync(path.join(root,'assets/components/logo-loop-mount.js'),'utf8');
  assert.match(loop,/atl\.png[^\n]+alt: 'ATL'/); assert.doesNotMatch(loop,/alt: 'ATL'[^\n]+href:/);
  assert.match(fs.readFileSync(path.join(root,'vercel.json'),'utf8'),/"source": "\/atl\.html"[\s\S]*?"destination": "\/index\.html"/);
});

test('verified company themes preserve shared structure and natural imagery',async()=>{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await page.goto(`http://127.0.0.1:${server.address().port}/lake-agro.html`,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>!document.documentElement.classList.contains('lg-loading'));
  await page.waitForFunction(()=>!document.querySelector('[data-lg-skeleton-overlay]'));
  const agro=await page.evaluate(()=>{
    const body=getComputedStyle(document.body);
    const nav=getComputedStyle(document.querySelector('.site-nav'));
    const overlay=getComputedStyle(document.querySelector('.hero-overlay'));
    const card=getComputedStyle(document.querySelector('.aramco-card'));
    const image=getComputedStyle(document.querySelector('.aramco-card img'));
    const logo=getComputedStyle(document.querySelector('.site-nav .nav-logo'));
    return{blue:body.getPropertyValue('--blue').trim(),nav:nav.backgroundImage,overlay:overlay.backgroundImage,card:card.backgroundColor,filter:image.filter,logoSurface:logo.backgroundColor,navCenter:(()=>{const r=document.querySelector('.nav-links').getBoundingClientRect();return r.left+r.width/2})()};
  });
  assert.equal(agro.blue,'#008435'); assert.match(agro.nav,/1, 63, 92/); assert.doesNotMatch(agro.overlay,/1, 63, 92/); assert.equal(agro.card,'rgb(0, 75, 30)'); assert.doesNotMatch(agro.filter,/hue-rotate|sepia/); assert.equal(agro.logoSurface,'rgba(0, 0, 0, 0)'); assert.ok(Math.abs(agro.navCenter-720)<2);
  await page.screenshot({path:path.join(evidence,'desktop-lake-agro-theme.png'),fullPage:false});
  await page.setViewportSize({width:390,height:844});
  await page.reload({waitUntil:'networkidle'});
  await page.waitForFunction(()=>!document.documentElement.classList.contains('lg-loading'));
  await page.waitForFunction(()=>!document.querySelector('[data-lg-skeleton-overlay]'));
  assert.equal(await page.locator('html').evaluate(el=>el.scrollWidth<=innerWidth),true);
  await page.screenshot({path:path.join(evidence,'mobile-lake-agro-theme.png'),fullPage:false});
  for(const [file,accent] of [['gulf-aggregates.html','#ed1c24'],['cross-country.html','#b9852d'],['aficd.html','#0878bb']]){
    await page.setViewportSize({width:1440,height:900});
    await page.goto(`http://127.0.0.1:${server.address().port}/${file}`,{waitUntil:'networkidle'});
    assert.equal(await page.locator('body').evaluate(el=>getComputedStyle(el).getPropertyValue('--yellow').trim()),accent);
  }
  await page.close();
});
