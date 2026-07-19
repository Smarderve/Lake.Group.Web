const fs=require('fs');
const paths=['assets/images/logos/companies/atl.png','assets/images/logos/companies/lake-agro.png','assets/images/logos/companies/_pretrim/lake-agro.png','scripts/_scraped/atl_logo_src.jpg','scripts/_scraped/agro_logo.png','scripts/_scraped/agro_logo2.png','scripts/_scraped/agro_logoresizey.png'];
for (const p of paths) {
  if (!fs.existsSync(p)) { console.log('MISS', p, ''); continue; }
  const b = fs.readFileSync(p);
  let w, h, mode = '?';
  if (b[0]===0x89 && b[1]===0x50) { w=b.readUInt32BE(16); h=b.readUInt32BE(20); mode='PNG'; }
  else if (b[0]===0xFF && b[1]===0xD8) {
    mode='JPEG'; let i=2;
    while (i < b.length) {
      if (b[i] !== 0xFF) { i++; continue; }
      const m = b[i+1];
      if (m === 0xC0 || m === 0xC2) { h=b.readUInt16BE(i+5); w=b.readUInt16BE(i+7); break; }
      i += 2 + b.readUInt16BE(i+2);
    }
  } else if (b.toString('ascii',0,4)==='RIFF' && b.toString('ascii',8,12)==='WEBP') mode='WEBP';
  console.log('OK', p, '('+w+', '+h+')', mode, b.length+' bytes');
}
