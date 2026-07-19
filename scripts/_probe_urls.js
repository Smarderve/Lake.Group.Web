const fs = require('fs');
function extract(file, label) {
  const t = fs.readFileSync(file, 'utf8');
  const abs = [...t.matchAll(/https?:\/\/[^"'\s>]+\.(?:png|jpe?g|webp)(?:\.webp)?/gi)].map(x => x[0]);
  const rel = [...t.matchAll(/(?:src|href|url\()\s*['"]?([^'"\)>]+\.(?:png|jpe?g|webp))/gi)].map(x => x[1]);
  console.log('=== ' + label + ' unique absolute ===');
  [...new Set(abs)].sort().forEach(u => console.log(u));
  console.log('=== ' + label + ' relative (logo/banner/hero) ===');
  [...new Set(rel.filter(u => /logo|hero|banner|upload/i.test(u)))].sort().forEach(u => console.log(u));
}
extract('scripts/_scraped/atl_home_probe.html', 'ATL home probe');
extract('scripts/_scraped/lakeagro_home_probe.html', 'lakeagro home probe');
