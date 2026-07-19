const fs=require('fs');const path=require('path');
const ROOT='.';
function walk(d,acc=[]){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory()){if(['node_modules','.git','docs','scripts'].includes(e.name))continue;walk(p,acc);}else if(/\.(html|js|css)$/.test(e.name))acc.push(p);}return acc;}
const files=walk(ROOT);
let n=0;
for(const f of files){let s=fs.readFileSync(f,'utf8');const o=s;
s=s.replace(/lake-agro\.png(\?v=\d+)?/g,'lake-agro.png?v=50');
s=s.replace(/atl\.png(\?v=\d+)?/g,'atl.png?v=50');
s=s.replace(/cross-country\.png(\?v=\d+)?/g,'cross-country.png?v=50');
s=s.replace(/ocean-galleria\.png(\?v=\d+)?/g,'ocean-galleria.png?v=50');
s=s.replace(/LogoLoop\.css\?v=\d+/g,'LogoLoop.css?v=50');
s=s.replace(/logo-loop-mount\.js\?v=\d+/g,'logo-loop-mount.js?v=50');
if(/\.html$/.test(f)){
  s=s.replace(/assistant\.js\?v=\d+/g,'assistant.js?v=50');
}
if(s!==o){fs.writeFileSync(f,s);n++;console.log('bumped',f);} }
console.log('files updated',n);
