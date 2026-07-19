const fs=require('fs');
for (const f of ['assets/flagship.css','assets/theme.css']) {
  const s=fs.readFileSync(f,'utf8');
  const m=s.match(/atl\.png[^"]*/g);
  console.log(f, m&&m.slice(0,5));
  const m2=s.match(/src\*="[^"]*atl[^"]*"/g);
  console.log('attr', m2);
}
