const https=require('https'); const fs=require('fs'); const path=require('path');
function get(url){return new Promise((res,rej)=>{https.get(url,{headers:{'User-Agent':'Mozilla/5.0','Accept':'*/*'}},r=>{if(r.statusCode>=300&&r.statusCode<400&&r.headers.location){get(new URL(r.headers.location,url).href).then(res,rej);return;} const c=[];r.on('data',d=>c.push(d));r.on('end',()=>res({status:r.statusCode,body:Buffer.concat(c),ctype:r.headers['content-type']}));}).on('error',rej);});}
(async()=>{
  const home=await get('https://lakeagro.com/');
  console.log('home', home.status, home.body.length);
  const html=home.body.toString('utf8');
  const imgs=[...html.matchAll(/src=["']([^"']*logo[^"']*)["']/gi)].map(m=>m[1]);
  console.log('logo candidates', imgs.slice(0,20));
  const urls=imgs.map(u=>u.startsWith('http')?u:new URL(u,'https://lakeagro.com/').href);
  const tried=[];
  for (const u of urls.slice(0,8)) {
    try {
      const r=await get(u);
      console.log(u, r.status, r.body.length, r.ctype, r.body.slice(0,4).toString('hex'));
      if (r.status===200 && r.body.length>5000 && (r.ctype||'').includes('image')) {
        const dest=path.join('scripts/_scraped','agro_logo_hires'+(r.body[0]===0x89?'.png':'.jpg'));
        fs.writeFileSync(dest, r.body);
        console.log('saved', dest);
        tried.push(dest);
      }
    } catch(e){ console.log('fail', u, e.message); }
  }
  for (const u of ['https://lakeagro.com/assets/images/logoresizey.png','https://lakeagro.com/assets/images/logo.png','https://lakeagro.com/assets/images/logo2.png','https://www.lakeagro.com/assets/images/logoresizey.png']) {
    try { const r=await get(u); console.log('try',u,r.status,r.body.length); if(r.status===200&&r.body.length>5000){fs.writeFileSync('scripts/_scraped/agro_fetched.png',r.body); console.log('saved agro_fetched');} } catch(e){ console.log(e.message); }
  }
})().catch(e=>console.error(e));
