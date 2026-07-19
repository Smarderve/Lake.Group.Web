const fs=require('fs');
const pages=fs.readdirSync('.').filter(f=>/^(lake-|atl|gulf-|cross-country|ocean-galleria|aficd|aill)/.test(f)&&f.endsWith('.html'));
for(const f of pages){
  const main=fs.readFileSync(f,'utf8').split('<footer')[0];
  const btns=[...main.matchAll(/<a[^>]*class="[^"]*btn[^"]*"[^>]*>[\s\S]*?<\/a>/gi)].map(m=>m[0].replace(/\s+/g,' ').slice(0,160));
  const bad=btns.filter(b=>/contact\.html|leadership\.html|Contact Us|Contact Sales|Our Leadership|Meet Leadership|Get in Touch/i.test(b));
  if(bad.length) console.log(f+'\n '+bad.join('\n '));
}
console.log('pages checked', pages.length);
