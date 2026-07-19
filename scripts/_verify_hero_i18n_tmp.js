const fs=require('fs');
for (const f of ['lake-agro.html','atl.html']) {
  const h=fs.readFileSync(f,'utf8');
  const hero=h.match(/page-hero[\s\S]{0,600}/)[0];
  console.log('===',f);
  console.log(hero);
  console.log('agro keys', (h.match(/data-i18n="agro\./g)||[]).length);
  console.log('atl keys', (h.match(/data-i18n="atl\./g)||[]).length);
  console.log('has agro.hero.lede', h.includes('agro.hero.lede'));
  console.log('has atl.hero.lede', h.includes('atl.hero.lede'));
}
